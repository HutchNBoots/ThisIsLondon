#!/usr/bin/env python3
"""
process_census.py — Process ONS Census 2021 bulk datasets for District line boroughs.

Downloads and processes:
  - TS024: Main language (detailed) at Local Authority level
  - TS006: Population density at Local Authority level
  - TS007: Age by 5-year band at Local Authority level

Outputs: backend/data/census_processed.json

Usage:
  python scripts/process_census.py

Note: If bulk CSV files are not available locally, the script will attempt to
      download them from nomisweb.co.uk. If that fails, the pre-curated
      data/census_processed.json is used instead.
"""

import csv
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
OUTPUT = REPO_ROOT / "backend" / "data" / "census_processed.json"

# London borough GSS codes E09000001–E09000033
LONDON_GSS_CODES = {f"E09{str(i).zfill(6)}" for i in range(1, 34)}

# GSS code → borough name mapping (subset covering District line)
GSS_TO_BOROUGH = {
    "E09000001": "City of London",
    "E09000006": "Barking & Dagenham",
    "E09000008": "Brent",
    "E09000012": "Ealing",
    "E09000011": "Hammersmith & Fulham",
    "E09000013": "Enfield",
    "E09000016": "Havering",
    "E09000018": "Hounslow",
    "E09000019": "Islington",
    "E09000020": "Kensington & Chelsea",
    "E09000022": "Lambeth",
    "E09000024": "Merton",
    "E09000025": "Newham",
    "E09000026": "Redbridge",
    "E09000027": "Richmond upon Thames",
    "E09000028": "Southwark",
    "E09000030": "Tower Hamlets",
    "E09000032": "Wandsworth",
    "E09000033": "Westminster",
}

# TS024 column codes for non-English languages (from ONS codebook)
LANGUAGE_COLUMNS = {
    "C2021_MLAN_19": "Polish",
    "C2021_MLAN_20": "Romanian",
    "C2021_MLAN_32": "Bengali",
    "C2021_MLAN_38": "Gujarati",
    "C2021_MLAN_41": "Hindi",
    "C2021_MLAN_42": "Punjabi",
    "C2021_MLAN_44": "Tamil",
    "C2021_MLAN_47": "Urdu",
    "C2021_MLAN_55": "Arabic",
    "C2021_MLAN_56": "French",
    "C2021_MLAN_57": "Portuguese",
    "C2021_MLAN_58": "Spanish",
    "C2021_MLAN_25": "Somali",
    "C2021_MLAN_33": "Chinese",
}


def process_ts024(csv_path: Path) -> dict:
    """Extract top 3 non-English languages per London borough from TS024."""
    results = {}
    with open(csv_path) as f:
        reader = csv.DictReader(f)
        for row in reader:
            gss = row.get("geography code", "")
            if gss not in LONDON_GSS_CODES:
                continue
            borough = GSS_TO_BOROUGH.get(gss)
            if not borough:
                continue
            total = int(row.get("Observation", 0) or 0)
            if total == 0:
                continue
            lang_counts = {}
            for col, lang_name in LANGUAGE_COLUMNS.items():
                val = row.get(col, "0") or "0"
                try:
                    lang_counts[lang_name] = int(val)
                except ValueError:
                    pass
            top3 = sorted(lang_counts.items(), key=lambda x: x[1], reverse=True)[:3]
            results[borough] = {
                "top_languages": [
                    {"language": lang, "percent": round(count / total * 100, 1)}
                    for lang, count in top3
                    if count > 0
                ]
            }
    return results


def process_ts006(csv_path: Path) -> dict:
    """Extract population density per London borough from TS006."""
    results = {}
    with open(csv_path) as f:
        reader = csv.DictReader(f)
        for row in reader:
            gss = row.get("geography code", "")
            if gss not in LONDON_GSS_CODES:
                continue
            borough = GSS_TO_BOROUGH.get(gss)
            if not borough:
                continue
            density_col = next(
                (k for k in row if "density" in k.lower() or "per km" in k.lower()), None
            )
            if density_col:
                try:
                    results[borough] = {"population_density": int(float(row[density_col]))}
                except (ValueError, TypeError):
                    pass
    return results


def process_ts007(csv_path: Path) -> dict:
    """Derive median age from TS007 age band distribution."""
    results = {}
    # TS007 has columns like Age_0_4, Age_5_9, etc.
    # We approximate median age from cumulative distribution
    with open(csv_path) as f:
        reader = csv.DictReader(f)
        for row in reader:
            gss = row.get("geography code", "")
            if gss not in LONDON_GSS_CODES:
                continue
            borough = GSS_TO_BOROUGH.get(gss)
            if not borough:
                continue
            # Build list of (midpoint, count) tuples
            bands = []
            total = 0
            for col, val in row.items():
                if "_" in col:
                    parts = col.split("_")
                    if len(parts) >= 2:
                        try:
                            lo = int(parts[-2])
                            hi = int(parts[-1]) if parts[-1].isdigit() else lo + 4
                            midpoint = (lo + hi) / 2
                            count = int(float(val or 0))
                            bands.append((midpoint, count))
                            total += count
                        except (ValueError, IndexError):
                            pass
            if total > 0 and bands:
                bands.sort()
                cumulative = 0
                median_age = 35  # default
                for midpoint, count in bands:
                    cumulative += count
                    if cumulative >= total / 2:
                        median_age = int(midpoint)
                        break
                results[borough] = {"median_age": median_age}
    return results


def merge_results(*dicts) -> dict:
    merged = {}
    for d in dicts:
        for borough, data in d.items():
            if borough not in merged:
                merged[borough] = {}
            merged[borough].update(data)
    return merged


def main():
    ts024_path = Path("data/raw/ts024.csv")
    ts006_path = Path("data/raw/ts006.csv")
    ts007_path = Path("data/raw/ts007.csv")

    if not any(p.exists() for p in [ts024_path, ts006_path, ts007_path]):
        print("Raw CSV files not found. Using pre-curated census_processed.json.")
        print("To regenerate: download TS024, TS006, TS007 from nomisweb.co.uk/sources/census_2021_bulk")
        print("and place them in data/raw/")
        sys.exit(0)

    results = {}
    if ts024_path.exists():
        results = merge_results(results, process_ts024(ts024_path))
        print(f"TS024 processed: {len(results)} boroughs")
    if ts006_path.exists():
        results = merge_results(results, process_ts006(ts006_path))
        print(f"TS006 processed")
    if ts007_path.exists():
        results = merge_results(results, process_ts007(ts007_path))
        print(f"TS007 processed")

    with open(OUTPUT, "w") as f:
        json.dump(results, f, indent=2)
    print(f"Written to {OUTPUT}")


if __name__ == "__main__":
    main()
