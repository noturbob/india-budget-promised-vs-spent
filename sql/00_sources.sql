-- The tables every query reads, straight from the CSVs the pipeline wrote.
-- Run by analysis/findings.py; paths are relative to the project root.

CREATE OR REPLACE VIEW macro_lines AS            -- every headline number from Budget at a Glance
SELECT * FROM read_csv('data/processed/macro_totals.csv', header = true);

CREATE OR REPLACE VIEW scheme_lines AS           -- every line of every ministry's allocation table
SELECT * FROM read_csv('data/processed/scheme_lines.csv', header = true, all_varchar = false);

-- The government that presented the budget for a fiscal year such as '2016-17'.
CREATE OR REPLACE MACRO government(fy) AS
    CASE WHEN fy[1:4]::INT <= 2008 THEN 'UPA-1'
         WHEN fy[1:4]::INT <= 2013 THEN 'UPA-2'
         WHEN fy[1:4]::INT <= 2018 THEN 'NDA-1'
         WHEN fy[1:4]::INT <= 2023 THEN 'NDA-2'
         ELSE 'NDA-3' END;
