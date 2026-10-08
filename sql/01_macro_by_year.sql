-- For each fiscal year and headline metric: what the budget promised (BE), the mid-year
-- revision (RE) and what was actually spent or collected (Actual).
-- A year's BE is read from its own budget, its RE from the next one, its Actual from the one
-- two years later. Budget at a Glance prints all three, so each number has exactly one source.
CREATE OR REPLACE TABLE macro_by_year AS
WITH picked AS (
    SELECT fiscal_year, metric, estimate, value_crore
    FROM macro_lines
    WHERE value_crore IS NOT NULL
      AND (   (estimate = 'BE'     AND budget = fiscal_year)
           OR (estimate = 'RE'     AND budget[1:4]::INT = fiscal_year[1:4]::INT + 1)
           OR  estimate = 'Actual')
)
SELECT fiscal_year,
       government(fiscal_year)                              AS government,
       metric,
       max(value_crore) FILTER (WHERE estimate = 'BE')      AS be,
       max(value_crore) FILTER (WHERE estimate = 'RE')      AS re,
       max(value_crore) FILTER (WHERE estimate = 'Actual')  AS actual
FROM picked
GROUP BY fiscal_year, metric
ORDER BY fiscal_year, metric;

COPY macro_by_year TO 'data/analysis/macro_by_year.csv' (HEADER);
