"""Extract headline totals from each "Budget at a Glance" statement into one tidy table.

In:  data/raw/budget_at_a_glance/<budget>.pdf|htm   (statement 1 of each Union Budget)
Out: data/interim/budget_at_a_glance/<budget>.txt   (plain-text copy, for eyeballing)
     data/processed/macro_totals.csv                (budget, fiscal_year, estimate, metric, value_crore)

Every statement has four columns: Actuals (budget year - 2), BE and RE (year - 1), BE (budget
year). Full budgets presented in July after an interim budget can add a fifth, Provisional
Actuals for year - 1 (2024-25 does). Row numbers and wording drift across 22 years, so rows are
matched by their English label, and the result is checked against accounting identities and
against the same BE printed in the next year's statement.
Run: python3 pipeline/02_extract_macro.py
"""
import csv
import html
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data/raw/budget_at_a_glance"
TXT = ROOT / "data/interim/budget_at_a_glance"
OUT = ROOT / "data/processed/macro_totals.csv"

# metric -> (label regex, regex that must NOT match). First matching row wins, except that
# revenue/capital expenditure are taken from the first matching row AFTER total expenditure:
# from 2017-18 the statement labels them "On Revenue/Capital Account", the same words it uses
# for sub-items above the total.
AFTER_TOTAL = {"revenue_expenditure", "capital_expenditure"}
METRICS = {
    "revenue_receipts": (r"\bRevenue Receipts\b", None),
    "tax_revenue_net": (r"Tax Revenue|net to cent", r"Non-?\s?Tax"),
    "non_tax_revenue": (r"Non-?\s?Tax Revenue", None),
    "recoveries_of_loans": (r"Recover(?:y|ies) of Loans", None),
    "other_receipts": (r"Other Receipts", None),
    "total_expenditure": (r"Total Expenditure", None),
    "revenue_expenditure": (r"Revenue Expenditure|On Revenue\b|\(10\+1[34]\)", r"Deficit"),
    "capital_expenditure": (r"Capital Expenditure|On Capital\b|\(1[12]\+15\)", r"Deficit|Effective|\(12\+13\)"),
    "interest_payments": (r"Interest Payments", None),
    "revenue_deficit": (r"Revenue Deficit", r"Effective"),
    "fiscal_deficit": (r"Fiscal Deficit|\{16-\(1\+5\+6\)\}", None),
    "primary_deficit": (r"Primary Deficit", None),
}

NUM = re.compile(r"^-?\d[\d,]*(?:\.\d+)?$|^\.\.\.$|^-$")


def to_text(src: Path) -> str:
    if src.suffix == ".pdf":
        return subprocess.run(["pdftotext", "-layout", str(src), "-"], capture_output=True, text=True, check=True).stdout
    # 2008-09 to 2010-11 were published as HTML tables: one <tr> per line.
    s = src.read_text(encoding="latin-1")
    lines = []
    for row in re.findall(r"<tr.*?</tr>", s, flags=re.S | re.I):
        cells = [re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", c))).strip()
                 for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row, flags=re.S | re.I)]
        lines.append("   ".join(c for c in cells if c))
    return "\n".join(lines)


def trailing_values(line: str) -> list[float | None] | None:
    """All numbers at the end of a row, or None if fewer than four."""
    line = re.sub(r"-?\s?\(\s*-?\d+\.\d+\s*\)", " ", line)  # deficits as % of GDP: (2.7), -(0.9), - (0.2)
    line = line.replace("(-) ", "-").replace("(-)", "-")  # (-) 8047 means -8047
    line = re.sub(r"(?<=\d)[*$#@]+", "", line)  # footnote markers glued to numbers: 41651*
    toks = [t for t in line.split() if t not in ("*", "$", "#", "@")]
    vals: list[str] = []
    while toks and NUM.match(toks[-1]):
        vals.insert(0, toks.pop())
    if len(vals) > 4:  # footnote markers like "67265 1": drop lone single digits
        vals = [v for v in vals if not re.fullmatch(r"\d", v)]
    if len(vals) < 4:
        return None
    return [None if v in ("...", "-") else float(v.replace(",", "")) for v in vals]


def extract(text: str) -> dict[str, list]:
    found: dict[str, list] = {}
    context = ""  # labels often wrap onto the line(s) above their numbers
    for line in text.splitlines():
        vals = trailing_values(line)
        if vals is None:
            context = (context + " " + line)[-200:]
            continue
        label = context + " " + line
        context = ""
        for metric, (pat, not_pat) in METRICS.items():
            if metric in found or not re.search(pat, line if re.search(pat, line) else label, re.I):
                continue
            if metric in AFTER_TOTAL and "total_expenditure" not in found:
                continue
            if not_pat and re.search(not_pat, line, re.I):
                continue
            found[metric] = vals
            break
    # Column count comes from the first row; the last n numbers of every row line up with it.
    n = len(found.get("revenue_receipts", []))
    return {k: v[-n:] for k, v in found.items() if len(v) >= n}


def fiscal_years(budget: str, ncols: int) -> list[tuple[str, str]]:
    y = int(budget[:4])
    fy = lambda a: f"{a}-{str(a + 1)[2:]}"  # noqa: E731
    cols = [(fy(y - 2), "Actual"), (fy(y - 1), "BE"), (fy(y - 1), "RE")]
    if ncols == 5:
        cols.append((fy(y - 1), "Provisional Actual"))
    return cols + [(fy(y), "BE")]


def check(budget: str, m: dict[str, list]) -> list[str]:
    """Identities every Budget at a Glance satisfies (allowing ±2 crore rounding)."""
    errs = []
    for i, (fy, est) in enumerate(fiscal_years(budget, len(m["revenue_receipts"]))):
        g = {k: (v[i] or 0) for k, v in m.items()}
        tests = {
            "total = revenue + capital expenditure": g["total_expenditure"] - g["revenue_expenditure"] - g["capital_expenditure"],
            "fiscal deficit = total exp - non-debt receipts": g["fiscal_deficit"]
            - (g["total_expenditure"] - g["revenue_receipts"] - g["recoveries_of_loans"] - g["other_receipts"]),
            "primary deficit = fiscal deficit - interest": g["primary_deficit"] - (g["fiscal_deficit"] - g["interest_payments"]),
            "revenue receipts = tax + non-tax": g["revenue_receipts"] - g["tax_revenue_net"] - g["non_tax_revenue"],
        }
        errs += [f"{budget} {fy} {est}: {name} off by {d:,.0f}" for name, d in tests.items() if abs(d) > 2]
    return errs


def main() -> int:
    TXT.mkdir(parents=True, exist_ok=True)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    rows, problems = [], []
    for src in sorted(RAW.iterdir()):
        budget = src.stem
        text = to_text(src)
        (TXT / f"{budget}.txt").write_text(text)
        m = extract(text)
        missing = [k for k in METRICS if k not in m]
        if missing:
            problems.append(f"{budget}: could not find {missing}")
            continue
        ncols = len(m["revenue_receipts"])
        lines = text.splitlines()
        first = next(i for i, l in enumerate(lines) if re.search(r"Revenue Receipts", l) and trailing_values(l))
        header = " ".join(lines[max(0, first - 8):first])  # the column titles sit just above row 1
        if ncols not in (4, 5) or (ncols == 5) != bool(re.search(r"Provisional", header)):
            problems.append(f"{budget}: {ncols} columns doesn't match the header")
            continue
        problems += check(budget, m)
        for i, (fy, est) in enumerate(fiscal_years(budget, ncols)):
            for metric, vals in m.items():
                rows.append({"budget": budget, "fiscal_year": fy, "estimate": est, "metric": metric,
                             "value_crore": vals[i], "source": f"data/raw/budget_at_a_glance/{src.name}"})
    # The BE for a year is printed twice: in its own budget and in the next one. They must agree.
    be: dict[tuple, set] = {}
    for r in rows:
        if r["estimate"] == "BE" and r["value_crore"] is not None:
            be.setdefault((r["fiscal_year"], r["metric"]), set()).add(round(r["value_crore"]))
    problems += [f"BE {fy} {metric} differs between budgets: {sorted(v)}"
                 for (fy, metric), v in sorted(be.items()) if max(v) - min(v) > 2]

    with open(OUT, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    print(f"wrote {OUT.relative_to(ROOT)}: {len(rows)} rows from {len({r['budget'] for r in rows})} budgets")
    for p in problems:
        print("CHECK", p)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
