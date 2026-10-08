-- How common is underspending? Each programme line with a budget of ₹100 crore or more, per year:
-- the share that spent under 75% of its budget, and the share that spent over 110%.
-- Left out: lines that only move money between funds or accounts, and the Finance and Railways
-- ministries, whose lines are mostly transfers, debt service and commercial accounts.
CREATE OR REPLACE TABLE programmes AS
SELECT *, actual / be AS used
FROM read_csv('data/analysis/scheme_by_year.csv', header = true)
WHERE be >= 100
  AND NOT regexp_matches(scheme, '(?i)^(transfer to|amount met|less\b|support from|interest|repayment|suspense|.*suspense)')
  AND ministry NOT IN ('MINISTRY OF FINANCE', 'MINISTRY OF RAILWAYS');

SELECT fiscal_year                                   AS fy,
       count(*)                                      AS schemes,
       avg(CASE WHEN used < 0.75 THEN 1 ELSE 0 END)  AS under75,
       avg(CASE WHEN used > 1.10 THEN 1 ELSE 0 END)  AS over110
FROM programmes
GROUP BY fiscal_year
ORDER BY fiscal_year;
