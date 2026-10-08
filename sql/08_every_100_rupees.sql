-- Where every ₹100 of the newest budget goes: each budget line is put in the first plain-English
-- bucket whose rule it matches, then the buckets are drawn as 100 squares. Squares are rounded
-- down, and the leftover squares go to the buckets with the largest remainders, so they total 100.
WITH latest AS (
    SELECT max(budget) AS budget FROM scheme_lines
), bucketed AS (
    SELECT CASE
             WHEN demand = 'Interest Payments'                                   THEN 1
             WHEN ministry LIKE '%DEFENCE%'                                      THEN 2
             WHEN ministry LIKE '%ROAD TRANSPORT%' OR ministry LIKE '%RAILWAYS%' THEN 3
             WHEN demand LIKE 'Transfers to%'                                    THEN 4
             WHEN demand IN ('Department of Food and Public Distribution', 'Department of Fertilisers') THEN 5
             WHEN ministry LIKE '%RURAL DEVELOPMENT%' OR ministry LIKE '%AGRICULTURE%' THEN 6
             WHEN ministry LIKE '%HOME AFFAIRS%'                                 THEN 7
             WHEN ministry LIKE '%HEALTH%' OR ministry LIKE '%EDUCATION%'        THEN 8
             WHEN demand = 'Pensions'                                            THEN 9
             ELSE 10 END AS bucket,
           be_total
    FROM scheme_lines
    WHERE budget = (SELECT budget FROM latest)
      AND row_type IN ('item', 'sub', 'unlabelled', 'other')     -- leaf lines only, never subtotals
), names(bucket, name) AS (
    VALUES (1, 'Interest on past borrowing'), (2, 'Defence'), (3, 'Roads and railways'), (4, 'Transfers to states'),
           (5, 'Food and fertiliser subsidies'), (6, 'Rural development and farming'), (7, 'Police and home affairs'),
           (8, 'Health and education'), (9, 'Pensions'), (10, 'Everything else')
), sums AS (
    SELECT n.bucket, n.name, coalesce(sum(b.be_total), 0) AS crore
    FROM names n LEFT JOIN bucketed b USING (bucket)
    GROUP BY n.bucket, n.name
), shares AS (
    SELECT *, 100 * crore / sum(crore) OVER () AS exact, floor(100 * crore / sum(crore) OVER ())::INT AS floor_squares
    FROM sums
), ranked AS (
    SELECT *, row_number() OVER (ORDER BY exact - floor_squares DESC, bucket) AS remainder_rank,
              100 - sum(floor_squares) OVER () AS leftover
    FROM shares
)
SELECT (SELECT budget FROM latest)                                      AS budget,
       name,
       crore,
       floor_squares + CASE WHEN remainder_rank <= leftover THEN 1 ELSE 0 END AS squares
FROM ranked
ORDER BY bucket;
