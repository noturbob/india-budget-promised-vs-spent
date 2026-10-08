-- Across all years: how many programme-years spent less than half their budget, and how much
-- money that left unspent.
SELECT count(*)                                               AS lines,
       count(*) FILTER (WHERE actual < 0.5 * be)              AS under_half,
       coalesce(sum(be - actual) FILTER (WHERE actual < 0.5 * be), 0) AS under_half_gap
FROM programmes;
