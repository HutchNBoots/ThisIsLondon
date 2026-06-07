#!/usr/bin/env python3
"""
merge_demographics.py — Merge District line data into demographics.json.

Combines:
  - Existing demographics.json (Victoria line — do not overwrite)
  - census_processed.json (language, density, age)
  - gla_processed.json (income, green space, life expectancy, employment)
  - borough_facts_generated.json (editorial sentences)
  - district_stations.json (station-to-borough mapping)

Output: updated demographics.json with all District line stations added.

Sanity checks:
  - Every District line station must have borough_facts with >= 3 entries
  - Every District line station must have top_languages with >= 2 entries

Usage:
  python scripts/merge_demographics.py
"""

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
DATA = REPO_ROOT / "backend" / "data"


def load_json(path: Path) -> dict | list:
    with open(path) as f:
        return json.load(f)


def main():
    demographics = load_json(DATA / "demographics.json")
    district_stations = load_json(DATA / "district_stations.json")
    census = load_json(DATA / "census_processed.json")
    gla = load_json(DATA / "gla_processed.json")

    # Load optional generated facts (may not exist yet)
    facts_path = DATA / "borough_facts_generated.json"
    generated_facts = load_json(facts_path) if facts_path.exists() else {}

    # Build lookup of existing station IDs
    existing_ids = {d["station_id"] for d in demographics}

    added = 0
    skipped = 0

    for station in district_stations:
        station_id = station["id"]
        if station_id in existing_ids:
            skipped += 1
            continue

        borough = station.get("borough", "")
        borough_census = census.get(borough, {})
        borough_gla = gla.get(borough, {})
        borough_facts = generated_facts.get(borough, [])

        # Build demographics entry
        entry = {
            "station_id": station_id,
            "name": station["name"],
            "ward": station.get("ward", station["name"]),
            "borough": borough,
            "median_income_gbp": borough_gla.get("median_income"),
            "deprivation_index": None,
            "pct_born_outside_uk": None,
            "top_languages": borough_census.get("top_languages", []),
            "pct_no_qualifications": None,
            "population_density_per_km2": borough_census.get("population_density"),
            "median_age": borough_census.get("median_age"),
            "green_space_pct": borough_gla.get("green_space_pct"),
            "life_expectancy": borough_gla.get("life_expectancy"),
            "employment_rate": borough_gla.get("employment_rate"),
            "fact_sentence": f"This station serves {borough}.",
            "history_sentence": f"{station['name']} station is on the District line.",
            "borough_facts": borough_facts if borough_facts else [
                f"This station serves the borough of {borough}."
            ],
        }

        # Remove None values
        entry = {k: v for k, v in entry.items() if v is not None}

        demographics.append(entry)
        existing_ids.add(station_id)
        added += 1

    # Sanity check
    errors = []
    district_ids = {s["id"] for s in district_stations}
    for d in demographics:
        if d["station_id"] not in district_ids:
            continue
        facts = d.get("borough_facts", [])
        langs = d.get("top_languages", [])
        if len(facts) < 3:
            errors.append(f"{d['name']}: only {len(facts)} borough facts (need ≥ 3)")
        if len(langs) < 2:
            errors.append(f"{d['name']}: only {len(langs)} languages (need ≥ 2)")

    if errors:
        print("SANITY CHECK FAILURES:")
        for e in errors:
            print(f"  ✗ {e}")
        print(f"\nAdded {added} stations, skipped {skipped} (already existed)")
        print("Fix failures before deploying.")
    else:
        with open(DATA / "demographics.json", "w") as f:
            json.dump(demographics, f, indent=2)
        print(f"✓ Added {added} District line stations ({skipped} already existed)")
        print("✓ All sanity checks passed")
        print(f"✓ Written to {DATA / 'demographics.json'}")


if __name__ == "__main__":
    main()
