-- Year by year for each ministry, for the drill-down panel (ministries with ₹5,000 crore+ in total).
WITH yearly AS (
    SELECT ministry, fiscal_year AS fy, sum(be) AS be, sum(re) AS re, sum(actual) AS actual
    FROM read_csv('data/analysis/ministry_by_year.csv', header = true)
    GROUP BY ministry, fiscal_year
)
SELECT *
FROM yearly
WHERE ministry IN (SELECT ministry FROM yearly GROUP BY ministry HAVING sum(be) >= 5000)
ORDER BY ministry, fy;
