"""Every external file this project uses: where it comes from and what it is for.

01_download.py fetches these into data/raw/ and records checksums in data/raw/MANIFEST.csv.
Nothing in data/raw/ is ever edited by hand.
"""

BASE = "https://www.indiabudget.gov.in"

# --- Budget at a Glance, statement 1 ("Budget at a Glance") -------------------------------
# One page per budget with the headline totals: receipts, revenue/capital expenditure,
# total expenditure, fiscal deficit. Each budget gives Actuals (two years back), BE and RE
# (last year) and BE (new year), so 22 budgets give a continuous BE/RE/Actual series from
# 2003-04 to 2026-27. Used for: macro "promised vs spent" (data/processed/macro_totals.csv).
# Full budgets only; interim budgets (2009-10, 2014-15, 2019-20, 2024-25) are skipped.
BAG = {
    "2005-06": "budget_archive/ub2005-06/bag/bag1.pdf",
    "2006-07": "budget_archive/ub2006-07/bag/bag1.pdf",
    "2007-08": "budget_archive/ub2007-08/bag/bag1.pdf",
    "2008-09": "budget_archive/ub2008-09/bag/bag1.htm",
    "2009-10": "budget_archive/ub2009-10/bag/bag1.htm",
    "2010-11": "budget_archive/ub2010-11/bag/bag1.htm",
    "2011-12": "budget_archive/ub2011-12/bag/bag1.pdf",
    "2012-13": "budget_archive/ub2012-13/bag/bag1.pdf",
    "2013-14": "budget_archive/ub2013-14/bag/bag1.pdf",
    "2014-15": "budget_archive/ub2014-15/bag/bag1.pdf",
    "2015-16": "budget_archive/ub2015-16/bag/bag1.pdf",
    "2016-17": "budget2016-2017/ub2016-17/bag/bag11.pdf",
    "2017-18": "budget_archive/ub2017-18/bag/bag1.pdf",
    "2018-19": "budget_archive/ub2018-19/bag/bag1.pdf",
    # The 2019-20 statement-1 PDF is a scanned image; the full document has the same table as text.
    "2019-20": "budget2019-20/doc/Budget_at_Glance/budget_at_a_glance.pdf",
    "2020-21": "budget2020-21/doc/Budget_at_Glance/bag1.pdf",
    "2021-22": "budget2021-22/doc/Budget_at_Glance/bag1.pdf",
    "2022-23": "budget2022-23/doc/Budget_at_Glance/bag1.pdf",
    "2023-24": "budget2023-24/doc/Budget_at_Glance/bag1.pdf",
    "2024-25": "budget2024-25/doc/Budget_at_Glance/bag1.pdf",
    "2025-26": "budget2025-26/doc/Budget_at_Glance/bag1.pdf",
    "2026-27": "doc/Budget_at_Glance/bag1.pdf",  # current budget lives at the site root
}

# --- Expenditure Budget ("Notes on Demands for Grants", all ministries in one PDF) ----------
# For every ministry/department: scheme-by-scheme Actuals, BE, RE and next BE.
# Starts at 2017-18 because plan/non-plan classification was abolished that year, so the
# format is comparable from then on. Used for: scheme-level underspending
# (data/processed/scheme_lines.csv).
EXPENDITURE_BUDGET = {
    "2017-18": "budget2017-2018/ub2017-18/eb/allsbe.pdf",
    "2018-19": "budget2018-2019/ub2018-19/eb/allsbe.pdf",
    "2019-20": "budget2019-20/doc/eb/allsbe.pdf",
    "2020-21": "budget2020-21/doc/eb/allsbe.pdf",
    "2021-22": "budget2021-22/doc/eb/allsbe.pdf",
    "2022-23": "budget2022-23/doc/eb/allsbe.pdf",
    "2023-24": "budget2023-24/doc/eb/allsbe.pdf",
    "2024-25": "budget2024-25/doc/eb/allsbe.pdf",
    "2025-26": "budget2025-26/doc/eb/allsbe.pdf",
    "2026-27": "doc/eb/allsbe.pdf",
}


def all_sources():
    """(local path under data/raw, url, purpose) for every file."""
    for year, path in BAG.items():
        ext = path.rsplit(".", 1)[1]
        yield f"budget_at_a_glance/{year}.{ext}", f"{BASE}/{path}", f"Headline totals, budget {year}"
    for year, path in EXPENDITURE_BUDGET.items():
        yield f"expenditure_budget/{year}.pdf", f"{BASE}/{path}", f"Scheme-level BE/RE/Actuals, budget {year}"
