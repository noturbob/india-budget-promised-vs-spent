-- Government publicity and advertising lines, found by name, budgeted vs spent each year.
CREATE OR REPLACE TABLE publicity AS
SELECT *
FROM read_csv('data/analysis/scheme_by_year.csv', header = true)
WHERE regexp_matches(scheme, '(?i)publicity|advertis|information dissemination|information,? education and communication|mass communication|media plan|media and publicity');

SELECT fiscal_year AS fy, sum(be) AS be, sum(actual) AS actual
FROM publicity
GROUP BY fiscal_year
ORDER BY fiscal_year;
