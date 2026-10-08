-- The same year, from the other side of the books: spending fell short because income fell short
-- and the government borrowed less. These four steps add up to the same headline gap.
WITH latest AS (
    SELECT max(fiscal_year) AS fy FROM read_csv('data/analysis/ministry_by_year.csv', header = true)
), gap AS (
    SELECT metric, actual - be AS gap, be, actual
    FROM macro_by_year
    WHERE fiscal_year = (SELECT fy FROM latest)
)
SELECT label, value FROM (
    SELECT 1 AS ord, 'Tax came in below plan' AS label,          (SELECT gap FROM gap WHERE metric = 'tax_revenue_net') AS value
    UNION ALL SELECT 2, 'Asset sales came in below plan',        (SELECT gap FROM gap WHERE metric = 'other_receipts')
    UNION ALL SELECT 3, 'Other income came in below plan',       (SELECT sum(gap) FROM gap WHERE metric IN ('non_tax_revenue', 'recoveries_of_loans'))
    UNION ALL SELECT 4, 'Borrowed less than planned',            (SELECT gap FROM gap WHERE metric = 'fiscal_deficit')
)
ORDER BY ord;
