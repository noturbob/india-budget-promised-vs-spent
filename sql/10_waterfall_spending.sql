-- The latest audited year, traced: how spending got from the budget to the actual.
-- Every department's gap (actual - budget) adds up exactly to the headline gap. The eight biggest
-- shortfalls and three biggest overruns are shown on their own, each with the scheme that drove
-- most of it; the rest are grouped.
WITH ministry AS (
    SELECT * FROM read_csv('data/analysis/ministry_by_year.csv', header = true)
), scheme AS (
    SELECT * FROM read_csv('data/analysis/scheme_by_year.csv', header = true)
), latest AS (
    SELECT max(fiscal_year) AS fy FROM ministry
), gaps AS (
    SELECT demand, actual - be AS gap,
           row_number() OVER (PARTITION BY actual - be < 0 ORDER BY abs(actual - be) DESC) AS size_rank
    FROM ministry
    WHERE fiscal_year = (SELECT fy FROM latest) AND actual <> be
), drivers AS (            -- the scheme with the biggest gap in the same direction as its department's
    SELECT g.demand,
           CASE WHEN g.gap < 0 THEN arg_min(s.scheme, s.actual - s.be) ELSE arg_max(s.scheme, s.actual - s.be) END AS scheme,
           CASE WHEN g.gap < 0 THEN arg_min(s.be, s.actual - s.be)     ELSE arg_max(s.be, s.actual - s.be)     END AS be,
           CASE WHEN g.gap < 0 THEN arg_min(s.actual, s.actual - s.be) ELSE arg_max(s.actual, s.actual - s.be) END AS actual
    FROM gaps g JOIN scheme s ON s.demand = g.demand AND s.fiscal_year = (SELECT fy FROM latest)
    GROUP BY g.demand, g.gap
), steps AS (
    SELECT 1 AS part, size_rank AS ord, g.demand AS label, gap AS value, d.scheme, d.be, d.actual
    FROM gaps g LEFT JOIN drivers d USING (demand)
    WHERE gap < 0 AND size_rank <= 8
    UNION ALL
    SELECT 2, 99, (count(*) || ' other departments that underspent'), sum(gap), NULL, NULL, NULL
    FROM gaps WHERE gap < 0 AND size_rank > 8
    UNION ALL
    SELECT 3, size_rank, g.demand, gap, d.scheme, d.be, d.actual
    FROM gaps g LEFT JOIN drivers d USING (demand)
    WHERE gap > 0 AND size_rank <= 3
    UNION ALL
    SELECT 4, 99, (count(*) || ' other departments that overspent'), sum(gap), NULL, NULL, NULL
    FROM gaps WHERE gap > 0 AND size_rank > 3
)
SELECT (SELECT fy FROM latest) AS fy, label, value, scheme, be, actual
FROM steps
ORDER BY part, ord;
