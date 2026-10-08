"""Link each ministry and scheme across budget documents into year-by-year panels of BE, RE and Actual.

In:  data/processed/scheme_lines.csv
Out: data/analysis/ministry_by_year.csv  one row per fiscal year x demand (ministry/department)
     data/analysis/scheme_by_year.csv    one row per fiscal year x scheme

For a fiscal year t, the Expenditure Budget of t+1 prints BE(t) and RE(t), and the one of t+2
prints Actual(t). Lines are linked across those two documents by name within the same demand,
anchored on a number both print: BE(t+1). Using t+1's BE (not t's own document) means figures are
already restated for any reorganisation between the two budgets.

This matching stays in Python: it walks each document's lines in order and falls back from name to
amount, which is a loop, not a query. Everything computed from these panels is in sql/.
Run: python3 analysis/panels.py
"""
import csv
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data/analysis"
LEAVES = ("item", "sub", "unlabelled", "other")


def term(fy: str) -> str:
    """Government that presented the budget for this fiscal year."""
    y = int(fy[:4])
    if y <= 2008:
        return "UPA-1"
    if y <= 2013:
        return "UPA-2"
    if y <= 2018:
        return "NDA-1"
    if y <= 2023:
        return "NDA-2"
    return "NDA-3"


# Ministries renamed or reorganised during 2016-2025, and spelling slips in the documents,
# mapped to the name they have today. Applied to the `ministry` column only; demands keep their
# printed names.
MINISTRY_NAMES = {
    "DEPARMENT OF SPACE": "DEPARTMENT OF SPACE",
    "MINISTRY OF AGRICULTURE AND FARMERS' WELFARE": "MINISTRY OF AGRICULTURE AND FARMERS WELFARE",
    "MINISTRY OF AYURVEDA, YOGA AND NATUROPATHY, UNANI, SIDDHA AND HOMOEOPATHY (AYUSH)": "MINISTRY OF AYUSH",
    "MINISTRY OF SKILL DEVELOPMENT AND ENTREPRENUERSHIP": "MINISTRY OF SKILL DEVELOPMENT AND ENTREPRENEURSHIP",
    "MINISTRY OF HUMAN RESOURCE DEVELOPMENT": "MINISTRY OF EDUCATION",  # renamed 2020
    "MINISTRY OF DRINKING WATER AND SANITATION": "MINISTRY OF JAL SHAKTI",  # merged 2019
    "MINISTRY OF WATER RESOURCES, RIVER DEVELOPMENT AND GANGA REJUVENATION": "MINISTRY OF JAL SHAKTI",
    "MINISTRY OF SHIPPING": "MINISTRY OF PORTS, SHIPPING AND WATERWAYS",  # renamed 2020
    "MINISTRY OF HEAVY INDUSTRIES AND PUBLIC ENTERPRISES": "MINISTRY OF HEAVY INDUSTRIES",
}


def ministry_name(raw: str) -> str:
    return MINISTRY_NAMES.get(raw, raw)


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", s.lower())


def scheme_groups() -> dict[str, list[dict]]:
    """Per budget: one record per scheme = a numbered item plus its sub-lines and recovery lines.

    Summing leaf lines by item number gives each scheme's net amount, and the schemes of a demand
    add up to its Grand Total (the extractor already checked that)."""
    groups: dict[tuple, dict] = {}
    order: dict[str, list] = defaultdict(list)
    current = None
    for r in csv.DictReader(open(ROOT / "data/processed/scheme_lines.csv")):
        if r["row_type"] not in LEAVES:
            continue
        b, d = r["budget"], int(r["demand_no"])
        if r["row_type"] in ("item", "sub"):
            num = r["item_id"].split(".")[0]
            name = r["label"] if r["row_type"] == "item" else r["parent_label"]
            current = (b, d, num)
        elif r["row_type"] == "other":
            current = (b, d, "x" + norm(r["label"]))
            name = r["label"]
        else:  # unlabelled recoveries belong to the line above
            name = None
        if current not in groups:
            groups[current] = {"budget": b, "demand_no": d, "ministry": ministry_name(r["ministry"]), "demand": r["demand"],
                               "section": r["section"], "scheme": name or "",
                               "be": 0.0, "be_prev": 0.0, "re_prev": 0.0, "actual": 0.0,
                               "be_capital": 0.0, "be_prev_capital": 0.0, "re_prev_capital": 0.0, "actual_capital": 0.0,
                               "fy_budget": r["fy_budget"], "fy_prev": r["fy_prev"], "fy_actual": r["fy_actual"]}
            order[b].append(current)
        g = groups[current]
        for p in ("be", "be_prev", "re_prev", "actual"):
            g[p] += float(r[f"{p}_total"])
            g[f"{p}_capital"] += float(r[f"{p}_capital"])
    return {b: [groups[k] for k in keys] for b, keys in order.items()}


def link(earlier: list[dict], later: list[dict], key, scope=lambda r: None) -> list[tuple[dict, dict]]:
    """Pair records of budget t+1 with budget t+2.

    First by name (key), using BE(t+1), which both documents print, to break ties. Records whose
    name changed (ministries get renamed, labels gain a word) fall back to that BE(t+1) figure alone,
    when it is non-zero and unique within the scope. No record is used twice."""
    by_name, by_be = defaultdict(list), defaultdict(list)
    for r in later:
        by_name[key(r)].append(r)
        by_be[(scope(r), round(r["be_prev"]))].append(r)
    pairs, used = [], set()
    for e in earlier:
        cands = [c for c in by_name.get(key(e), []) if id(c) not in used]
        exact = [c for c in cands if abs(c["be_prev"] - e["be"]) < 0.5]
        pick = exact if len(exact) == 1 else (cands if len(cands) == 1 else [])
        if not pick and abs(e["be"]) >= 1:
            pick = [c for c in by_be.get((scope(e), round(e["be"])), [])
                    if id(c) not in used and abs(c["be_prev"] - e["be"]) < 0.5]
        if len(pick) == 1:
            used.add(id(pick[0]))
            pairs.append((e, pick[0]))
    return pairs


def panels():
    per_budget = scheme_groups()
    budgets = sorted(per_budget)
    schemes, ministries, coverage = [], [], []
    for b1, b2 in zip(budgets, budgets[1:]):
        # Ministry level: sum the schemes of each demand.
        dem = {}
        for b in (b1, b2):
            for g in per_budget[b]:
                k = (b, g["demand_no"])
                d = dem.setdefault(k, {**{x: g[x] for x in ("budget", "demand_no", "ministry", "demand", "fy_prev")},
                                       "be": 0.0, "be_prev": 0.0, "re_prev": 0.0, "actual": 0.0})
                for p in ("be", "be_prev", "re_prev", "actual"):
                    d[p] += g[p]
        d1 = [v for (b, _), v in dem.items() if b == b1]
        d2 = [v for (b, _), v in dem.items() if b == b2]
        demand_pairs = link(d1, d2, key=lambda r: norm(r["demand"]))
        later_demand = {e["demand_no"]: l["demand_no"] for e, l in demand_pairs}
        for e, l in demand_pairs:
            ministries.append({"fiscal_year": e["fy_prev"], "government": term(e["fy_prev"]),
                               "ministry": e["ministry"], "demand": e["demand"],
                               "be": round(e["be_prev"], 2), "re": round(e["re_prev"], 2), "actual": round(l["actual"], 2)})
        # Scheme level: within each linked pair of demands, by scheme name.
        def scope(r, b=b1):
            return later_demand.get(r["demand_no"]) if r["budget"] == b else r["demand_no"]
        pairs = link(per_budget[b1], per_budget[b2], key=lambda r: (scope(r), norm(r["scheme"])), scope=scope)
        for e, l in pairs:
            schemes.append({"fiscal_year": e["fy_prev"], "government": term(e["fy_prev"]),
                            "ministry": e["ministry"], "demand": e["demand"], "section": e["section"],
                            "scheme": e["scheme"], "be": round(e["be_prev"], 2), "re": round(e["re_prev"], 2),
                            "actual": round(l["actual"], 2), "be_capital": round(e["be_prev_capital"], 2),
                            "actual_capital": round(l["actual_capital"], 2)})
        total_be = sum(abs(g["be_prev"]) for g in per_budget[b1])
        linked_be = sum(abs(e["be_prev"]) for e, _ in pairs)
        coverage.append((per_budget[b1][0]["fy_prev"], linked_be / total_be, len(pairs), len(per_budget[b1])))
    return ministries, schemes, coverage


def write(name: str, rows: list[dict]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    with open(OUT / name, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    print(f"wrote data/analysis/{name}: {len(rows)} rows")


if __name__ == "__main__":
    ministries, schemes, coverage = panels()
    write("ministry_by_year.csv", ministries)
    write("scheme_by_year.csv", schemes)
    for fy, share, n, total in coverage:
        print(f"  {fy}: linked {n}/{total} schemes covering {share:.1%} of BE")
    assert all(share > 0.9 for _, share, _, _ in coverage), "scheme linking dropped below 90% of BE"
