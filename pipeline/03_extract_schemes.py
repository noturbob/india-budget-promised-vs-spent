"""Extract every line of every ministry's allocation table from the Expenditure Budgets.

In:  data/raw/expenditure_budget/<budget>.pdf        ("Notes on Demands for Grants", all ministries)
Out: data/interim/expenditure_budget/<budget>.txt    (plain-text copy, for eyeballing)
     data/processed/scheme_lines.csv                 (one row per budget line, 12 money columns)

Each demand (a ministry or department) has a table "A. The Budget allocations" listing schemes
and their sub-items with Revenue / Capital / Total for four periods:
Actual (budget - 2), BE (budget - 1), RE (budget - 1), BE (budget).
row_type: item (numbered scheme), sub (N.NN sub-item), unlabelled (a recoveries line with no
label), other (unnumbered line), net (nets the lines just above it), total (section subtotal).
Checks, per demand: the non-aggregate lines (item, sub, unlabelled, other) add up to the Grand
Total; every Net row equals the lines it nets; and the Grand Total equals the demand's Net
figure at the top of its first page.
Run: python3 pipeline/03_extract_schemes.py
"""
import csv
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data/raw/expenditure_budget"
TXT = ROOT / "data/interim/expenditure_budget"
OUT = ROOT / "data/processed/scheme_lines.csv"
# Pages with no text layer, transcribed by hand: data/manual/expenditure_budget_<budget>_page<N>.txt
MANUAL = ROOT / "data/manual"

PERIODS = ["actual", "be_prev", "re_prev", "be"]
MONEY = [f"{p}_{a}" for p in PERIODS for a in ("revenue", "capital", "total")]
NUM = re.compile(r"^-?\d+(?:\.\d+)?$|^\.\.\.$")
# Running page furniture that must never be read as a label continuation.
FURNITURE = re.compile(
    r"Notes on Demands? for Grants|\(In . ?crores?\)|Actual \d{4}-\d{4}|^\s*Revenue\s+Capital\s+Total"
    r"|^\s*No\.\s*\d+/|^\s*\d+\s*$|SBE Summary|^\s*\(?[ivx]+\)?\s*$"
)


def split_row(line: str) -> tuple[str, list[float]] | None:
    """Label and the 12 money values at the end of a line, or None if it isn't a money row."""
    toks = line.split()
    if len(toks) < 12 or not all(NUM.match(t) for t in toks[-12:]):
        return None
    label = line.rstrip()
    for _ in range(12):  # strip the 12 trailing tokens, keep the label's own spacing
        label = label[: label.rstrip().rfind(" ")].rstrip() if " " in label.strip() else ""
    return label, [0.0 if t == "..." else float(t) for t in toks[-12:]]


def parse(text: str, budget: str) -> tuple[list[dict], list[str]]:
    rows: list[dict] = []
    problems: list[str] = []
    lines = text.splitlines()
    demand = None
    mode = "off"  # off -> header (waiting for Net) -> table (inside A.) -> off
    ministry = part = section = ""
    parent = None  # last numbered item, for sub-items and Net rows
    last_row = None
    label_col = 0

    def close_demand():
        if demand and demand.get("grand") is None:
            problems.append(f"{budget} demand {demand['no']}: no Grand Total found")

    for i, line in enumerate(lines):
        # Voted demands are headed "DEMAND NO. n"; charged ones (interest, debt) "No. n (APPROPRIATION)".
        m = re.match(r"^\s*(?:DEMAND NO\.\s*(\d+)|No\.\s*(\d+)\s*\(APPROPRIATION\))\s*$", line)
        if m:
            close_demand()
            prev = next((l.strip() for l in reversed(lines[max(0, i - 4):i]) if l.strip()), "")
            nxt = next((l.strip() for l in lines[i + 1:i + 5] if l.strip()), "")
            ministry = prev if prev.isupper() else ministry
            demand = {"no": int(m.group(1) or m.group(2)), "name": nxt, "net": None, "grand": None, "rows": []}
            mode, part, section, parent, last_row = "header", "", "", None, None
            continue
        if demand is None or mode == "off":
            continue
        if mode == "header":
            r = split_row(line)
            if r and r[0].strip() == "Net" and demand["net"] is None:
                demand["net"] = r[1]
            if re.search(r"The Budget allocations?\b", line):
                mode = "table"
            continue

        # mode == "table"
        if not line.strip() or FURNITURE.search(line):
            last_row = None if FURNITURE.search(line) else last_row
            continue
        r = split_row(line)
        if r is None:
            indent = len(line) - len(line.lstrip())
            numbered = re.match(r"^\s*\d+(\.\d+)?\.?\s", line)
            if last_row is not None and not numbered and indent >= max(8, label_col - 2):
                last_row["label"] += " " + line.strip()  # label wrapped onto the next line
                continue
            last_row = None
            head = line.strip()
            m2 = re.match(r"^(\d+)\.\s+(.*)", head)  # numbered item with no money (has sub-items)
            if m2:
                parent = {"id": m2.group(1), "label": m2.group(2)}
                last_row = parent
                label_col = line.find(m2.group(2))
            elif head.isupper():
                part, section = head, ""
            else:
                section = head
            continue

        label, vals = r
        text_label = label.strip()
        label_col = line.find(text_label) if text_label else 0
        if text_label == "Grand Total":
            demand["grand"] = vals
            check_demand(budget, demand, problems)
            mode = "off"
            continue
        if re.match(r"^Total\b", text_label):
            kind, item_id, name = "total", "", text_label
        elif text_label == "Net":
            item_id, name, span = net_scope(demand["rows"], vals, parent)
            kind = "net"
            if item_id is None:
                problems.append(f"{budget} demand {demand['no']}: Net {vals[2]:.2f} after '{parent and parent['label']}' matches no lines above it")
                item_id, name = parent["id"] if parent else "", parent["label"] if parent else ""
        elif text_label == "":
            kind, item_id, name = "unlabelled", "", ""
        elif m3 := re.match(r"^(\d+\.\d+)\s+(.*)", text_label):
            kind, item_id, name = "sub", m3.group(1), m3.group(2)
        elif m3 := re.match(r"^(\d+)\.\s+(.*)", text_label):
            kind, item_id, name = "item", m3.group(1), m3.group(2)
            parent = {"id": item_id, "label": name}
        else:
            kind, item_id, name = "other", "", text_label
        row = {"budget": budget, "ministry": ministry, "demand_no": demand["no"], "demand": demand["name"],
               "part": part, "section": section, "row_type": kind, "item_id": item_id,
               "parent_label": parent["label"] if kind in ("sub", "net") and parent else "",
               "label": name, **dict(zip(MONEY, vals)), "_span": span if kind == "net" else 0}
        if kind in ("sub", "net") and parent is not None and parent.get("label") is not row["parent_label"]:
            row["parent_label"] = parent["label"]  # pick up wrapped continuation of the parent label
        demand["rows"].append(row)
        rows.append(row)
        last_row = row
    close_demand()
    return rows, problems


LEAVES = ("item", "sub", "unlabelled", "other")


def net_scope(rows: list[dict], vals: list[float], parent: dict | None) -> tuple[str | None, str, int]:
    """Which lines a Net row nets: walk back over lines until they sum to it.

    An earlier Net counts as one unit standing in for the lines it covered (Nets nest: a scheme's
    Net can cover sub-items that have their own Nets). Returns (item_id, label, lines covered):
    the single sub-item it belongs to (e.g. 3.01 plus its recoveries line), or the parent scheme
    when it nets several sub-items (e.g. PM-Kisan 9.01-9.03)."""
    acc = [0.0] * 12
    numbered = []
    i = len(rows) - 1
    while i >= 0:
        r = rows[i]
        if r["row_type"] not in LEAVES + ("net",):
            break
        acc = [a + r[k] for a, k in zip(acc, MONEY)]
        if r["row_type"] in ("item", "sub", "net"):
            numbered.append(r)
        i -= 1 + r.get("_span", 0)
        if max(abs(a - v) for a, v in zip(acc, vals)) <= 0.02 * len(numbered or [1]):
            span = len(rows) - 1 - i
            if len(numbered) == 1 and numbered[0]["row_type"] != "net":
                return numbered[0]["item_id"], numbered[0]["label"], span
            return (parent["id"], parent["label"], span) if parent else ("", "", span)
    return None, "", 0


def contributions(rows: list[dict]) -> list[dict]:
    """The rows that add up to the Grand Total: every line that isn't itself a sum."""
    return [r for r in rows if r["row_type"] in LEAVES]


def check_demand(budget: str, d: dict, problems: list[str]) -> None:
    where = f"{budget} demand {d['no']} ({d['name'][:40]})"
    if d["net"] is not None and max(abs(a - b) for a, b in zip(d["net"], d["grand"])) > 0.02:
        problems.append(f"{where}: Grand Total differs from the Net at the top")
    sums = [sum(r[k] for r in contributions(d["rows"])) for k in MONEY]
    worst = max(abs(s - g) for s, g in zip(sums, d["grand"]))
    if worst > 0.05 * max(1, len(d["rows"])) ** 0.5:  # rounding to 0.01 per line
        problems.append(f"{where}: lines add up to {sums[2]:.2f}.. vs Grand Total {d['grand'][2]:.2f}.. (worst gap {worst:.2f})")


def apply_manual_pages(budget: str, text: str) -> str:
    """Swap in hand transcriptions for pages whose text layer is missing (pdftotext pages are \\f-separated)."""
    pages = text.split("\f")
    for f in sorted(MANUAL.glob(f"expenditure_budget_{budget}_page*.txt")):
        n = int(f.stem.rsplit("page", 1)[1])
        original = [l for l in pages[n - 1].splitlines() if l.strip()]
        assert len(original) < 5, f"{f.name}: page {n} has a text layer after all; drop the transcription"
        pages[n - 1] = "\n".join(l for l in f.read_text().splitlines() if not l.startswith("#"))
    return "\f".join(pages)


def main() -> int:
    TXT.mkdir(parents=True, exist_ok=True)
    all_rows, problems = [], []
    for src in sorted(RAW.glob("*.pdf")):
        budget = src.stem
        txt = TXT / f"{budget}.txt"
        if not txt.exists():
            subprocess.run(["pdftotext", "-layout", str(src), str(txt)], check=True, capture_output=True)
        rows, probs = parse(apply_manual_pages(budget, txt.read_text()), budget)
        y = int(budget[:4])
        fy = lambda a: f"{a}-{str(a + 1)[2:]}"  # noqa: E731
        for r in rows:
            r.update(fy_actual=fy(y - 2), fy_prev=fy(y - 1), fy_budget=fy(y))
        print(f"{budget}: {len(rows):>5} lines, {len({r['demand_no'] for r in rows})} demands, {len(probs)} problems")
        all_rows += rows
        problems += probs
    cols = ["budget", "ministry", "demand_no", "demand", "part", "section", "row_type", "item_id",
            "parent_label", "label", "fy_actual", "fy_prev", "fy_budget", *MONEY]
    with open(OUT, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        w.writerows(all_rows)
    print(f"wrote {OUT.relative_to(ROOT)}: {len(all_rows)} rows")
    for p in problems[:40]:
        print("CHECK", p)
    if len(problems) > 40:
        print(f"... and {len(problems) - 40} more")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
