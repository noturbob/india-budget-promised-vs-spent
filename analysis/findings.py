"""Compute every number and series the story uses, from the analysis panels.

In:  data/analysis/{macro,ministry,scheme}_by_year.csv, data/processed/scheme_lines.csv (via panels)
Out: data/analysis/flagship_by_year.csv
     app/data/story.json  (the story app reads only this file)
Run: python3 analysis/findings.py   (after analysis/panels.py)
"""
import csv
import json
import re
import statistics
from collections import defaultdict
from pathlib import Path

from flagships import FLAGSHIPS, flagship_of
from panels import scheme_groups, term

ROOT = Path(__file__).resolve().parent.parent
A = ROOT / "data/analysis"
APP_DATA = ROOT / "app/data/story.json"
TERMS = ["UPA-1", "UPA-2", "NDA-1", "NDA-2", "NDA-3"]
# Lines that move money between funds or accounts rather than pay for a programme.
ACCOUNTING = re.compile(r"^(transfer to|amount met|less\b|support from|interest|repayment|suspense|.*suspense)", re.I)
PUBLICITY = re.compile(r"publicity|advertis|information dissemination|information,? education and communication"
                       r"|mass communication|media plan|media and publicity", re.I)


def read(name: str) -> list[dict]:
    rows = list(csv.DictReader(open(A / name)))
    for r in rows:
        for k in ("be", "re", "actual"):
            if k in r:
                r[k] = float(r[k]) if r[k] not in ("", "None") else None
    return rows


def ratio(a, b):
    return a / b if a is not None and b else None


def macro():
    rows = read("macro_by_year.csv")
    by = defaultdict(dict)
    for r in rows:
        by[r["fiscal_year"]][r["metric"]] = {"be": r["be"], "re": r["re"], "actual": r["actual"]}
    years = [fy for fy in sorted(by) if by[fy].get("total_expenditure", {}).get("be")]
    series = [{"fy": fy, "government": term(fy), **by[fy]} for fy in years]

    terms = {}
    for t in TERMS:
        ys = [s for s in series if s["government"] == t and s["total_expenditure"]["actual"]]
        dev = lambda m: [ratio(s[m]["actual"], s[m]["be"]) - 1 for s in ys if s[m]["be"]]  # noqa: E731
        terms[t] = {
            "years": [s["fy"] for s in ys],
            "total_median_dev": statistics.median(dev("total_expenditure")),
            "capex_median_dev": statistics.median(dev("capital_expenditure")),
            "tax_median_dev": statistics.median(dev("tax_revenue_net")),
            "fiscal_deficit_median_dev": statistics.median(dev("fiscal_deficit")),
            "capex_short_years": sum(d < -0.02 for d in dev("capital_expenditure")),
            "disinvestment_missed_years": sum(s["other_receipts"]["actual"] < s["other_receipts"]["be"] for s in ys
                                              if s["other_receipts"]["be"]),
            "disinvestment_be": sum(s["other_receipts"]["be"] or 0 for s in ys),
            "disinvestment_actual": sum(s["other_receipts"]["actual"] or 0 for s in ys),
        }
    return series, terms


def ministries():
    rows = read("ministry_by_year.csv")
    agg = defaultdict(lambda: {"be": 0.0, "re": 0.0, "actual": 0.0, "years": set()})
    series = defaultdict(lambda: defaultdict(lambda: {"be": 0.0, "re": 0.0, "actual": 0.0}))
    for r in rows:
        m = r["ministry"].title().replace("And ", "and ").replace("Of ", "of ")
        a = agg[m]
        for k in ("be", "re", "actual"):
            a[k] += r[k]
            series[m][r["fiscal_year"]][k] += r[k]
        a["years"].add(r["fiscal_year"])
    ranked = [{"ministry": m, "be": v["be"], "re": v["re"], "actual": v["actual"], "use": v["actual"] / v["be"],
               "years": len(v["years"])} for m, v in agg.items() if v["be"] >= 20000]
    ranked.sort(key=lambda x: x["use"])
    explorer = {m: [{"fy": fy, **v} for fy, v in sorted(s.items())] for m, s in series.items() if agg[m]["be"] >= 5000}
    return ranked, explorer


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
    """How common is underspending? Programme lines with BE >= Rs 100 crore.

    Excluded: fund-transfer/accounting lines, and the Finance and Railways ministries, whose lines are
    mostly transfers, debt service and commercial accounts rather than programmes."""
    rows = [r for r in read("scheme_by_year.csv") if r["be"] >= 100 and not ACCOUNTING.match(r["scheme"])
            and r["ministry"] not in ("MINISTRY OF FINANCE", "MINISTRY OF RAILWAYS")]
    by_year = defaultdict(list)
    for r in rows:
        by_year[r["fiscal_year"]].append(r["actual"] / r["be"])
    per_year = [{"fy": fy, "schemes": len(v), "under75": sum(x < 0.75 for x in v) / len(v),
                 "over110": sum(x > 1.10 for x in v) / len(v)} for fy, v in sorted(by_year.items())]
    under = [r for r in rows if r["actual"] < 0.5 * r["be"]]
    return {"per_year": per_year, "lines": len(rows), "under_half": len(under),
            "under_half_gap": sum(r["be"] - r["actual"] for r in under)}


def publicity():
    rows = [r for r in read("scheme_by_year.csv") if PUBLICITY.search(r["scheme"])]
    by = defaultdict(lambda: {"be": 0.0, "actual": 0.0})
    for r in rows:
        by[r["fiscal_year"]]["be"] += r["be"]
        by[r["fiscal_year"]]["actual"] += r["actual"]
    return {"series": [{"fy": fy, **v} for fy, v in sorted(by.items())],
            "lines": sorted({f"{r['ministry'].title()}: {r['scheme']}" for r in rows})}


# Where the newest budget's money goes, in a few plain-English buckets (first matching rule wins).
CATEGORIES = [
    ("Interest on past borrowing", lambda m, d: d == "Interest Payments"),
    ("Defence", lambda m, d: "DEFENCE" in m),
    ("Roads and railways", lambda m, d: "ROAD TRANSPORT" in m or "RAILWAYS" in m),
    ("Transfers to states", lambda m, d: d.startswith("Transfers to")),
    ("Food and fertiliser subsidies", lambda m, d: d in ("Department of Food and Public Distribution", "Department of Fertilisers")),
    ("Rural development and farming", lambda m, d: "RURAL DEVELOPMENT" in m or "AGRICULTURE" in m),
    ("Police and home affairs", lambda m, d: "HOME AFFAIRS" in m),
    ("Health and education", lambda m, d: "HEALTH" in m or "EDUCATION" in m),
    ("Pensions", lambda m, d: d == "Pensions"),
]


def allocation():
    """Latest budget's BE by category, as whole squares out of 100 (largest-remainder rounding)."""
    rows = list(csv.DictReader(open(ROOT / "data/processed/scheme_lines.csv")))
    latest = max(r["budget"] for r in rows)
    sums = defaultdict(float)
    for r in rows:
        if r["budget"] != latest or r["row_type"] not in ("item", "sub", "unlabelled", "other"):
            continue
        cat = next((c for c, rule in CATEGORIES if rule(r["ministry"], r["demand"])), "Everything else")
        sums[cat] += float(r["be_total"])
    total = sum(sums.values())
    order = [c for c, _ in CATEGORIES] + ["Everything else"]
    exact = {c: 100 * sums[c] / total for c in order}
    squares = {c: int(v) for c, v in exact.items()}
    for c in sorted(order, key=lambda c: exact[c] - squares[c], reverse=True)[: 100 - sum(squares.values())]:
        squares[c] += 1
    return {"budget": latest, "total": total,
            "categories": [{"name": c, "crore": sums[c], "squares": squares[c]} for c in order]}


def grand_totals(series):
    """Everything added up: 20 years of headline totals, and 9 years of ministry-level gaps."""
    done = [y for y in series if y["total_expenditure"]["actual"]]
    def total(metric, est):
        return sum(y[metric][est] or 0 for y in done if y[metric]["be"])
    ministries = read("ministry_by_year.csv")
    return {
        "years": [done[0]["fy"], done[-1]["fy"], len(done)],
        "budgeted": total("total_expenditure", "be"),
        "spent": total("total_expenditure", "actual"),
        "capex_unspent": total("capital_expenditure", "be") - total("capital_expenditure", "actual"),
        "disinvestment_missing": total("other_receipts", "be") - total("other_receipts", "actual"),
        "tax_missing": total("tax_revenue_net", "be") - total("tax_revenue_net", "actual"),
        "extra_borrowing": total("fiscal_deficit", "actual") - total("fiscal_deficit", "be"),
        "ministry_years": [min(r["fiscal_year"] for r in ministries), max(r["fiscal_year"] for r in ministries)],
        "ministry_budgeted": sum(r["be"] for r in ministries),
        "ministry_spent": sum(r["actual"] for r in ministries),
        "never_spent": sum(max(0.0, r["be"] - r["actual"]) for r in ministries),
        "beyond_budget": sum(max(0.0, r["actual"] - r["be"]) for r in ministries),
    }


def waterfall(series):
    """Latest audited year: how spending got from the budget to the actual, and how the books balanced.

    Spending side uses demand-level gaps (they sum exactly to the headline gap); each big step names
    the scheme behind most of it. Funding side uses the headline receipts and the fiscal deficit."""
    fy = max(r["fiscal_year"] for r in read("ministry_by_year.csv"))
    demands = [r for r in read("ministry_by_year.csv") if r["fiscal_year"] == fy]
    schemes = [r for r in read("scheme_by_year.csv") if r["fiscal_year"] == fy]
    for d in demands:
        d["gap"] = d["actual"] - d["be"]

    def why(d):
        own = [r for r in schemes if r["demand"] == d["demand"]]
        if not own:
            return None
        top = min(own, key=lambda r: r["actual"] - r["be"]) if d["gap"] < 0 else max(own, key=lambda r: r["actual"] - r["be"])
        return {"scheme": top["scheme"], "be": top["be"], "actual": top["actual"]}

    unders = sorted([d for d in demands if d["gap"] < 0], key=lambda d: d["gap"])
    overs = sorted([d for d in demands if d["gap"] > 0], key=lambda d: -d["gap"])
    step = lambda d: {"demand": d["demand"], "value": d["gap"], "why": why(d)}  # noqa: E731
    spending = [step(d) for d in unders[:8]]
    spending.append({"demand": f"{len(unders) - 8} other departments that underspent", "value": sum(d["gap"] for d in unders[8:]), "why": None})
    spending += [step(d) for d in overs[:3]]
    spending.append({"demand": f"{len(overs) - 3} other departments that overspent", "value": sum(d["gap"] for d in overs[3:]), "why": None})

    y = next(x for x in series if x["fy"] == fy)
    gap = lambda m: y[m]["actual"] - y[m]["be"]  # noqa: E731
    funding = [
        {"demand": "Tax came in below plan", "value": gap("tax_revenue_net")},
        {"demand": "Asset sales came in below plan", "value": gap("other_receipts")},
        {"demand": "Other income came in below plan", "value": gap("non_tax_revenue") + gap("recoveries_of_loans")},
        {"demand": "Borrowed less than planned", "value": gap("fiscal_deficit")},
    ]
    total = gap("total_expenditure")
    assert abs(sum(x["value"] for x in spending) - total) < 5, "spending steps don't add up"
    assert abs(sum(x["value"] for x in funding) - total) < 5, "funding steps don't add up"
    return {"fy": fy, "be": y["total_expenditure"]["be"], "actual": y["total_expenditure"]["actual"], "total": total,
            "spending": spending, "funding": funding,
            "gross_under": sum(d["gap"] for d in unders), "gross_over": sum(d["gap"] for d in overs)}


if __name__ == "__main__":
    series, terms = macro()
    ranked, explorer = ministries()
    story = {"macro": series, "terms": terms, "ministries": ranked, "explorer": explorer,
             "flagships": flagships(), "schemes": scheme_stats(), "publicity": publicity(),
             "allocation": allocation(), "grand": grand_totals(series), "waterfall": waterfall(series)}
    APP_DATA.parent.mkdir(parents=True, exist_ok=True)
    APP_DATA.write_text(json.dumps(story, indent=1, default=list))
    print(f"wrote {APP_DATA.relative_to(ROOT)} ({APP_DATA.stat().st_size // 1024} KB)")
    for t, v in terms.items():
        print(f"  {t}: {v['years'][0]}..{v['years'][-1]} total {v['total_median_dev']:+.1%} capex {v['capex_median_dev']:+.1%} "
              f"tax {v['tax_median_dev']:+.1%} FD {v['fiscal_deficit_median_dev']:+.1%} capex-short {v['capex_short_years']}/{len(v['years'])} "
              f"disinv-missed {v['disinvestment_missed_years']}/{len(v['years'])}")
    for f in story["flagships"]:
        print(f"  {f['use']:.0%}  {f['name']}  (worst {f['worst']['fy']})")
    s = story["schemes"]
    print(f"  {s['lines']} programme-years; {s['under_half']} spent under half their BE, gap Rs {s['under_half_gap']:,.0f} cr")
    print("  publicity:", [(x["fy"], round(x["be"]), round(x["actual"])) for x in story["publicity"]["series"]])
