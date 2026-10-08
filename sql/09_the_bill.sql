-- The grand total. Part one: twenty years of headline numbers, every year with audited accounts.
-- Part two: inside the ministries (2016-17 onward), money promised but never spent, and money
-- spent beyond the budget, counted ministry by ministry and year by year so they don't cancel out.
WITH yr AS (
    SELECT fiscal_year, metric, be, actual
    FROM macro_by_year
    WHERE fiscal_year IN (SELECT fiscal_year FROM macro_by_year
                          WHERE metric = 'total_expenditure' AND be <> 0 AND actual IS NOT NULL)
      AND be <> 0
), headline AS (
    SELECT min(fiscal_year)                                                         AS first_year,
           max(fiscal_year)                                                         AS last_year,
           count(DISTINCT fiscal_year)                                              AS n_years,
           sum(be)     FILTER (WHERE metric = 'total_expenditure')                  AS budgeted,
           sum(actual) FILTER (WHERE metric = 'total_expenditure')                  AS spent,
           sum(be - coalesce(actual, 0)) FILTER (WHERE metric = 'capital_expenditure') AS capex_unspent,
           sum(be - coalesce(actual, 0)) FILTER (WHERE metric = 'other_receipts')   AS disinvestment_missing,
           sum(be - coalesce(actual, 0)) FILTER (WHERE metric = 'tax_revenue_net')  AS tax_missing,
           sum(coalesce(actual, 0) - be) FILTER (WHERE metric = 'fiscal_deficit')   AS extra_borrowing
    FROM yr
), ministries AS (
    SELECT min(fiscal_year)                      AS first_year,
           max(fiscal_year)                      AS last_year,
           sum(be)                               AS budgeted,
           sum(actual)                           AS spent,
           sum(greatest(be - actual, 0))         AS never_spent,
           sum(greatest(actual - be, 0))         AS beyond_budget
    FROM read_csv('data/analysis/ministry_by_year.csv', header = true)
)
SELECT h.*, m.first_year AS ministry_first_year, m.last_year AS ministry_last_year,
       m.budgeted AS ministry_budgeted, m.spent AS ministry_spent, m.never_spent, m.beyond_budget
FROM headline h, ministries m;
