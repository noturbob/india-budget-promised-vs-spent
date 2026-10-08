"""Download every source in sources.py into data/raw/ and write data/raw/MANIFEST.csv.

Re-running skips files already on disk, so the raw folder is a frozen snapshot.
Run: python3 pipeline/01_download.py
"""
import csv
import hashlib
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from sources import all_sources

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data/raw"
MANIFEST = RAW / "MANIFEST.csv"


def fetch(url: str, dest: Path) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (research; india-budget-analysis)"})
    with urllib.request.urlopen(req, timeout=120) as r:
        body = r.read()
        ctype = r.headers.get("Content-Type", "")
    # The site answers missing files with an HTML 404 page, sometimes with status 200.
    if dest.suffix == ".pdf" and not body.startswith(b"%PDF"):
        raise ValueError(f"not a PDF ({ctype}): {url}")
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(body)


def main() -> int:
    old = {}
    if MANIFEST.exists():
        with open(MANIFEST, newline="") as f:
            old = {r["file"]: r for r in csv.DictReader(f)}
    rows, failed = [], []
    for rel, url, purpose in all_sources():
        dest = RAW / rel
        if not dest.exists():
            try:
                print(f"get  {rel}", flush=True)
                fetch(url, dest)
                time.sleep(1)  # be polite to a government server
            except Exception as e:  # keep going; report at the end
                failed.append((rel, str(e)))
                continue
        data = dest.read_bytes()
        rows.append({
            "file": rel,
            "url": url,
            "purpose": purpose,
            "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest(),
            "downloaded_utc": old.get(rel, {}).get("downloaded_utc")
            or datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M"),
        })
    with open(MANIFEST, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    print(f"{len(rows)} files in manifest, {len(failed)} failed")
    for rel, err in failed:
        print(f"FAILED {rel}: {err}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
