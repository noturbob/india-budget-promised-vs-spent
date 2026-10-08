#!/usr/bin/env bash
# Rebuild everything in data/ from scratch. Each step exits non-zero if its checks fail.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 pipeline/01_download.py
python3 pipeline/02_extract_macro.py
python3 pipeline/03_extract_schemes.py
python3 analysis/panels.py                 # link ministries and schemes across documents
uv run python analysis/findings.py         # every number, computed in sql/ with DuckDB
