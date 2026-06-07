#!/usr/bin/env python3
"""
process_gla.py — Process GLA London Borough Profiles CSV.

Downloads and processes the GLA Borough Profiles dataset from London Datastore:
  https://data.london.gov.uk/dataset/london-borough-profiles

Outputs: backend/data/gla_processed.json

Usage:
  python scripts/process_gla.py

Note: If the CSV is not available locally, a pre-curated gla_processed.json
      is used instead.
"""

import csv
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
OUTPUT = REPO_ROOT / "backend" / "data" / "gla_processed.json"

# Column name mapping (GLA CSV headers → our field names)
# These column names match the GLA Borough Profiles CSV format
COLUMN_MAP = {
    "Median Household Income Estimate (£)": "median_income",
    "Median House Price (£)": "median_house_price",
    "% area that is open space": "green_space_pct",
    "Life expectancy - Male (years)": "life_expectancy_male",
    "Life expectancy - Female (years)": "life_expectancy_female",
    "Employment rate (%)": "employment_rate",
}

DISTRICT_LINE_BOROUGHS = {
    "City of London",
    "Barking and Dagenham",
    "Ealing",
    "Hammersmith and Fulham",
    "Havering",
    "Hounslow",
    "Kensington and Chelsea",
    "Merton",
    "Newham",
    "Richmond upon Thames",
    "Tower Hamlets",
    "Wandsworth",
    "Westminster",
}

# Normalise borough names from GLA CSV to our format
def normalise_borough(name: str) -> str:
    mapping = {
        "Barking and Dagenham": "Barking & Dagenham",
        "Hammersmith and Fulham": "Hammersmith & Fulham",
        "Kensington and Chelsea": "Kensington & Chelsea",
    }
    return mapping.get(name, name)


def process_gla_csv(csv_path: Path) -> dict:
    results = {}
    with open(csv_path) as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row.get("Area name", row.get("Borough", "")).strip()
            normalised = normalise_borough(name)
            if normalised not in DISTRICT_LINE_BOROUGHS and name not in DISTRICT_LINE_BOROUGHS:
                continue
            borough_key = normalised if normalised in DISTRICT_LINE_BOROUGHS else normalise_borough(name)
            entry = {}

            for csv_col, field in COLUMN_MAP.items():
                val_str = row.get(csv_col, "").replace(",", "").replace("£", "").strip()
                try:
                    val = float(val_str)
                    entry[field] = round(val, 1)
                except ValueError:
                    pass

            # Derive single life expectancy figure
            if "life_expectancy_male" in entry and "life_expectancy_female" in entry:
                entry["life_expectancy"] = round(
                    (entry["life_expectancy_male"] + entry["life_expectancy_female"]) / 2, 1
                )
                del entry["life_expectancy_male"]
                del entry["life_expectancy_female"]

            if entry:
                results[borough_key] = entry

    return results


def main():
    gla_path = Path("data/raw/london_borough_profiles.csv")

    if not gla_path.exists():
        print("GLA Borough Profiles CSV not found. Using pre-curated gla_processed.json.")
        print("To regenerate: download the CSV from data.london.gov.uk/dataset/london-borough-profiles")
        print("and place it at data/raw/london_borough_profiles.csv")
        sys.exit(0)

    results = process_gla_csv(gla_path)
    print(f"Processed {len(results)} boroughs")

    with open(OUTPUT, "w") as f:
        json.dump(results, f, indent=2)
    print(f"Written to {OUTPUT}")


if __name__ == "__main__":
    main()
