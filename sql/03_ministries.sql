-- Every ministry, all years 2016-17 to 2024-25 combined: how much of its budget it actually used.
-- Small ministries (under ₹20,000 crore over the period) are left out of the ranking.
SELECT ministry,
       sum(be)                       AS be,
       sum(re)                       AS re,
       sum(actual)                   AS actual,
       sum(actual) / sum(be)         AS use,
       count(DISTINCT fiscal_year)   AS years
FROM read_csv('data/analysis/ministry_by_year.csv', header = true)
GROUP BY ministry
HAVING sum(be) >= 20000
ORDER BY use;
