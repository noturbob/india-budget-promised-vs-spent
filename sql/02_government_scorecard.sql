-- How each government's budgets compared with what actually happened.
-- Deviation = actual / budgeted - 1, per year; the scorecard shows the median year, so one crisis
-- year (2008-09, 2020-21) doesn't dominate a whole term.
WITH yr AS (
    SELECT fiscal_year, government,
           max(be)     FILTER (WHERE metric = 'total_expenditure')   AS total_be,
           max(actual) FILTER (WHERE metric = 'total_expenditure')   AS total_actual,
           max(be)     FILTER (WHERE metric = 'capital_expenditure') AS capex_be,
           max(actual) FILTER (WHERE metric = 'capital_expenditure') AS capex_actual,
           max(be)     FILTER (WHERE metric = 'tax_revenue_net')     AS tax_be,
           max(actual) FILTER (WHERE metric = 'tax_revenue_net')     AS tax_actual,
           max(be)     FILTER (WHERE metric = 'fiscal_deficit')      AS fd_be,
           max(actual) FILTER (WHERE metric = 'fiscal_deficit')      AS fd_actual,
           max(be)     FILTER (WHERE metric = 'other_receipts')      AS disinv_be,      -- mostly asset sales
           max(actual) FILTER (WHERE metric = 'other_receipts')      AS disinv_actual
    FROM macro_by_year
    GROUP BY fiscal_year, government
)
SELECT government,
       list(fiscal_year ORDER BY fiscal_year)                                     AS years,
       median(total_actual / total_be - 1)                                        AS total_median_dev,
       median(capex_actual / capex_be - 1) FILTER (WHERE capex_be <> 0)           AS capex_median_dev,
       median(tax_actual / tax_be - 1)     FILTER (WHERE tax_be <> 0)             AS tax_median_dev,
       median(fd_actual / fd_be - 1)       FILTER (WHERE fd_be <> 0)              AS fiscal_deficit_median_dev,
       count(*) FILTER (WHERE capex_be <> 0 AND capex_actual / capex_be - 1 < -0.02) AS capex_short_years,
       count(*) FILTER (WHERE disinv_be <> 0 AND disinv_actual < disinv_be)       AS disinvestment_missed_years,
       coalesce(sum(disinv_be), 0)                                                AS disinvestment_be,
       coalesce(sum(disinv_actual), 0)                                            AS disinvestment_actual
FROM yr
WHERE total_be <> 0 AND total_actual IS NOT NULL      -- only years with audited accounts
GROUP BY government
ORDER BY min(fiscal_year);
