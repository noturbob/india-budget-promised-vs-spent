"""Run the SQL in sql/ and shape the results into app/data/story.json, the only file the app reads.

In:  data/processed/*.csv, data/analysis/{ministry,scheme}_by_year.csv (from analysis/panels.py)
Out: data/analysis/macro_by_year.csv, data/analysis/flagship_by_year.csv, app/data/story.json
Run: uv run python analysis/findings.py   (after analysis/panels.py)

Every number is computed in SQL (DuckDB), one question per file in sql/. Python only reads the
results into the nested shape the app wants, plus the flagship-scheme matching, which follows each
scheme's printed lines and headings and stays in flagships.py. The SQL text itself is copied into
story.json so the site can show the query behind each chart.
"""
import csv
import json
from collections import defaultdict
from pathlib import Path

import duckdb

from flagships import FLAGSHIPS, flagship_of
from panels import scheme_groups, term

ROOT = Path(__file__).resolve().parent.parent
A = ROOT / "data/analysis"
SQL = ROOT / "sql"
APP_DATA = ROOT / "app/data/story.json"

con = duckdb.connect()


def sql(name: str) -> list[dict]:
    """Run sql/<name>.sql (all its statements) and return the last statement's rows as dicts."""
    con.execute((SQL / f"{name}.sql").read_text())
    cols = [d[0] for d in con.description] if con.description else []
    return [dict(zip(cols, r)) for r in con.fetchall()] if cols else []


def display(ministry: str) -> str:
    return ministry.title().replace("And ", "and ").replace("Of ", "of ")


def macro():
    by = defaultdict(dict)
    for r in con.execute("SELECT * FROM macro_by_year").fetchall():
        fy, gov, metric, be, re_, actual = r
        by[fy][metric] = {"be": be, "re": re_, "actual": actual}
    years = [fy for fy in sorted(by) if by[fy].get("total_expenditure", {}).get("be")]
    series = [{"fy": fy, "government": term(fy), **by[fy]} for fy in years]
    terms = {r.pop("government"): {**r, "years": list(r["years"])} for r in sql("02_government_scorecard")}
    return series, terms


def ministries():
    ranked = [{**r, "ministry": display(r["ministry"])} for r in sql("03_ministries")]
    explorer = defaultdict(list)
    for r in sql("04_ministry_explorer"):
        explorer[display(r.pop("ministry"))].append(r)
    return ranked, dict(explorer)


def flagships():
    """BE and RE of year t from budget t+1, Actual from budget t+2, summing all of a scheme's lines."""
    per_budget = scheme_groups()
    budgets = sorted(per_budget)
    out = defaultdict(list)
    for b1, b2 in zip(budgets, budgets[1:]):
        sums = defaultdict(lambda: {"be": 0.0, "re": 0.0, "actual": 0.0})
        for g in per_budget[b1]:
            if f := flagship_of(g["ministry"], g["scheme"], g["section"]):
                sums[f]["be"] += g["be_prev"]
                sums[f]["re"] += g["re_prev"]
        for g in per_budget[b2]:
            if f := flagship_of(g["ministry"], g["scheme"], g["section"]):
                sums[f]["actual"] += g["actual"]
        fy = per_budget[b1][0]["fy_prev"]
        for f, v in sums.items():
            if v["be"] or v["actual"]:
                out[f].append({"fy": fy, **{k: round(x, 2) for k, x in v.items()}})
    rows = []
    for f in FLAGSHIPS:
        s = out.get(f, [])
        be, ac = sum(x["be"] for x in s), sum(x["actual"] for x in s)
        if be:
            rows.append({"name": f, "be": be, "actual": ac, "use": ac / be, "series": s,
                         "worst": min(s, key=lambda x: (x["actual"] / x["be"]) if x["be"] else 9)})
    rows.sort(key=lambda r: r["use"])
    with open(A / "flagship_by_year.csv", "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["scheme", "fiscal_year", "be", "re", "actual"])
        for r in rows:
            for x in r["series"]:
                w.writerow([r["name"], x["fy"], x["be"], x["re"], x["actual"]])
    return rows


def scheme_stats():
    per_year = sql("05_underspending")
    return {"per_year": per_year, **sql("06_underspending_totals")[0]}


def publicity():
    series = sql("07_publicity")
    lines = con.execute("SELECT DISTINCT ministry, scheme FROM publicity").fetchall()
    return {"series": series, "lines": sorted({f"{m.title()}: {s}" for m, s in lines})}


def allocation():
    rows = sql("08_every_100_rupees")
    return {"budget": rows[0]["budget"], "total": sum(r["crore"] for r in rows),
            "categories": [{"name": r["name"], "crore": r["crore"], "squares": r["squares"]} for r in rows]}


def grand_totals():
    g = sql("09_the_bill")[0]
    return {"years": [g["first_year"], g["last_year"], g["n_years"]],
            **{k: g[k] for k in ("budgeted", "spent", "capex_unspent", "disinvestment_missing", "tax_missing", "extra_borrowing")},
            "ministry_years": [g["ministry_first_year"], g["ministry_last_year"]],
            **{k: g[k] for k in ("ministry_budgeted", "ministry_spent", "never_spent", "beyond_budget")}}


def waterfall(series):
    steps = sql("10_waterfall_spending")
    fy = steps[0]["fy"]
    spending = [{"demand": r["label"], "value": r["value"],
                 "why": {"scheme": r["scheme"], "be": r["be"], "actual": r["actual"]} if r["scheme"] else None} for r in steps]
    funding = [{"demand": r["label"], "value": r["value"]} for r in sql("11_waterfall_funding")]
    y = next(x for x in series if x["fy"] == fy)
    total = y["total_expenditure"]["actual"] - y["total_expenditure"]["be"]
    # Both sides of the books must land on the same headline gap.
    assert abs(sum(x["value"] for x in spending) - total) < 5, "spending steps don't add up"
    assert abs(sum(x["value"] for x in funding) - total) < 5, "funding steps don't add up"
    gross = con.execute("""SELECT sum(least(actual - be, 0)), sum(greatest(actual - be, 0))
                           FROM read_csv('data/analysis/ministry_by_year.csv', header = true) WHERE fiscal_year = ?""", [fy]).fetchone()
    return {"fy": fy, "be": y["total_expenditure"]["be"], "actual": y["total_expenditure"]["actual"], "total": total,
            "spending": spending, "funding": funding, "gross_under": gross[0], "gross_over": gross[1]}


if __name__ == "__main__":
    import os
    os.chdir(ROOT)  # the SQL files use paths relative to the project root
    sql("00_sources")
    sql("01_macro_by_year")
    series, terms = macro()
    ranked, explorer = ministries()
    story = {"macro": series, "terms": terms, "ministries": ranked, "explorer": explorer,
             "flagships": flagships(), "schemes": scheme_stats(), "publicity": publicity(),
             "allocation": allocation(), "grand": grand_totals(), "waterfall": waterfall(series),
             "sql": {f.stem: f.read_text() for f in sorted(SQL.glob("*.sql"))}}
    APP_DATA.parent.mkdir(parents=True, exist_ok=True)
    APP_DATA.write_text(json.dumps(story, indent=1, default=list))
    print(f"wrote {APP_DATA.relative_to(ROOT)} ({APP_DATA.stat().st_size // 1024} KB)")
    for t, v in terms.items():
        print(f"  {t}: {v['years'][0]}..{v['years'][-1]} total {v['total_median_dev']:+.1%} capex {v['capex_median_dev']:+.1%} "
              f"tax {v['tax_median_dev']:+.1%} FD {v['fiscal_deficit_median_dev']:+.1%} capex-short {v['capex_short_years']}/{len(v['years'])} "
              f"disinv-missed {v['disinvestment_missed_years']}/{len(v['years'])}")
    s = story["schemes"]
    print(f"  {s['lines']} programme-years; {s['under_half']} spent under half their BE, gap Rs {s['under_half_gap']:,.0f} cr")
