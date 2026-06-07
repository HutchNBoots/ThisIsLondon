"""
fetch_demographics.py

Fetches demographic data for wards surrounding each Victoria Line station
from the ONS Nomis API and Census 2021 data. Run this script to refresh
backend/data/demographics.json from live official sources.

Usage:
    pip install httpx
    python scripts/fetch_demographics.py

Output:
    backend/data/demographics.json

API reference:
    ONS Nomis: https://www.nomisweb.co.uk/api/v01/
    Census 2021 tables used:
        - TS017: Country of birth
        - TS021: Ethnic group
        - TS066: Economic activity
        - NM_2002_1: Annual Survey of Hours and Earnings (ward-level income)

Notes:
    - Nomis requires no API key for most tables; add ?uid=YOUR_KEY for
      higher rate limits (register free at nomisweb.co.uk).
    - Ward codes were correct at Census 2021; re-check against ONS
      Geography Portal if running after a boundary review.
"""

import json
import asyncio
import httpx
from pathlib import Path

# ---------------------------------------------------------------------------
# Station → ward / geography mapping
# Victoria Line stations mapped to their nearest Census ward and ONS codes.
# E-codes are 2021 Census ward codes; LAD codes are local authority districts.
# ---------------------------------------------------------------------------
STATIONS = [
    {"station_id": "940GZZLUBXN", "name": "Brixton",                  "ward": "Brixton Hill",          "ward_code": "E05011091", "lad_code": "E09000020"},
    {"station_id": "940GZZLUSTK", "name": "Stockwell",                 "ward": "Stockwell",              "ward_code": "E05011109", "lad_code": "E09000020"},
    {"station_id": "940GZZLUUXB", "name": "Vauxhall",                  "ward": "Oval",                   "ward_code": "E05011100", "lad_code": "E09000020"},
    {"station_id": "940GZZLUPCO", "name": "Pimlico",                   "ward": "Pimlico North",          "ward_code": "E05013806", "lad_code": "E09000033"},
    {"station_id": "940GZZLUVIC", "name": "Victoria",                  "ward": "Victoria",               "ward_code": "E05013813", "lad_code": "E09000033"},
    {"station_id": "940GZZLUGPK", "name": "Green Park",                "ward": "St James's",             "ward_code": "E05013808", "lad_code": "E09000033"},
    {"station_id": "940GZZLUOXC", "name": "Oxford Circus",             "ward": "West End",               "ward_code": "E05013815", "lad_code": "E09000033"},
    {"station_id": "940GZZLUWRR", "name": "Warren Street",             "ward": "Bloomsbury",             "ward_code": "E05013657", "lad_code": "E09000007"},
    {"station_id": "940GZZLUEAC", "name": "Euston",                    "ward": "Regent's Park",          "ward_code": "E05013665", "lad_code": "E09000007"},
    {"station_id": "940GZZLUKSX", "name": "King's Cross St. Pancras",  "ward": "King's Cross",           "ward_code": "E05013661", "lad_code": "E09000007"},
    {"station_id": "940GZZLUHBT", "name": "Highbury & Islington",      "ward": "Highbury East",          "ward_code": "E05013648", "lad_code": "E09000019"},
    {"station_id": "940GZZLUFPK", "name": "Finsbury Park",             "ward": "Finsbury Park",          "ward_code": "E05013645", "lad_code": "E09000019"},
    {"station_id": "940GZZLUSES", "name": "Seven Sisters",             "ward": "Seven Sisters",          "ward_code": "E05013739", "lad_code": "E09000014"},
    {"station_id": "940GZZLUTOT", "name": "Tottenham Hale",            "ward": "Tottenham Hale",         "ward_code": "E05013741", "lad_code": "E09000014"},
    {"station_id": "940GZZLUBLR", "name": "Blackhorse Road",           "ward": "Higham Hill",            "ward_code": "E05013779", "lad_code": "E09000031"},
    {"station_id": "940GZZLUWWL", "name": "Walthamstow Central",       "ward": "Highams Park",           "ward_code": "E05013782", "lad_code": "E09000031"},
]

NOMIS_BASE = "https://www.nomisweb.co.uk/api/v01/dataset"
OUTPUT_PATH = Path(__file__).parent.parent / "backend" / "data" / "demographics.json"


async def fetch_country_of_birth(client: httpx.AsyncClient, ward_code: str) -> float:
    """
    Fetch % born outside UK from Census 2021 table TS017 for a ward.
    Returns a float in [0, 1].
    """
    url = (
        f"{NOMIS_BASE}/NM_2028_1.json"
        f"?geography={ward_code}"
        f"&cell=0,1"          # 0=total, 1=born outside UK (simplified)
        f"&measures=20301"    # % of residents
        f"&select=geography_name,cell_name,obs_value"
    )
    r = await client.get(url, timeout=15)
    r.raise_for_status()
    data = r.json()
    # Parse the Nomis JSON structure: data["obs"] is a list of observations
    obs = data.get("obs", [])
    if len(obs) < 2:
        return 0.0
    total = obs[0]["obs_value"]["value"]
    outside_uk = obs[1]["obs_value"]["value"]
    return round(outside_uk / total, 4) if total else 0.0


async def fetch_no_qualifications(client: httpx.AsyncClient, ward_code: str) -> float:
    """
    Fetch % with no qualifications from Census 2021 table TS066 for a ward.
    """
    url = (
        f"{NOMIS_BASE}/NM_2083_1.json"
        f"?geography={ward_code}"
        f"&cell=0,1"
        f"&measures=20301"
        f"&select=geography_name,cell_name,obs_value"
    )
    r = await client.get(url, timeout=15)
    r.raise_for_status()
    data = r.json()
    obs = data.get("obs", [])
    if len(obs) < 2:
        return 0.0
    total = obs[0]["obs_value"]["value"]
    no_qual = obs[1]["obs_value"]["value"]
    return round(no_qual / total, 4) if total else 0.0


async def fetch_median_income(client: httpx.AsyncClient, lad_code: str) -> int:
    """
    Fetch median gross annual pay from ASHE (Annual Survey of Hours and Earnings)
    Nomis table NM_30_1 for the local authority district.
    Note: ward-level income data is not available from Nomis; LAD-level is used
    as a proxy. For finer granularity, consider CACI Acorn or ONS small-area
    income estimates (published irregularly, last 2018).
    """
    url = (
        f"{NOMIS_BASE}/NM_30_1.json"
        f"?geography={lad_code}"
        f"&sex=8"             # all (male+female combined)
        f"&item=2"            # median
        f"&pay=7"             # annual gross
        f"&measures=20100"
        f"&select=obs_value"
    )
    r = await client.get(url, timeout=15)
    r.raise_for_status()
    data = r.json()
    obs = data.get("obs", [])
    if not obs:
        return 0
    return int(obs[0]["obs_value"]["value"])


async def fetch_population_density(client: httpx.AsyncClient, ward_code: str) -> int:
    """
    Fetch population density (persons per km²) from Census 2021 table TS006.
    """
    url = (
        f"{NOMIS_BASE}/NM_2002_1.json"
        f"?geography={ward_code}"
        f"&measures=20100,20301"
        f"&select=geography_name,measures_name,obs_value"
    )
    r = await client.get(url, timeout=15)
    r.raise_for_status()
    data = r.json()
    obs = data.get("obs", [])
    # density is the second measure (20301 = per km²)
    for o in obs:
        if o.get("measures", {}).get("value") == 20301:
            return int(o["obs_value"]["value"])
    return 0


async def build_station_record(client: httpx.AsyncClient, station: dict) -> dict:
    """
    Assembles a complete demographic record for one station by calling
    multiple Nomis endpoints concurrently.
    """
    ward_code = station["ward_code"]
    lad_code = station["lad_code"]

    pct_outside_uk, pct_no_qual, median_income, pop_density = await asyncio.gather(
        fetch_country_of_birth(client, ward_code),
        fetch_no_qualifications(client, ward_code),
        fetch_median_income(client, lad_code),
        fetch_population_density(client, ward_code),
    )

    # Deprivation index: derived from IoD 2019 (Index of Multiple Deprivation).
    # Nomis does not serve IoD directly; a mapping from LSOA → ward is required.
    # See: https://www.gov.uk/government/statistics/english-indices-of-deprivation-2019
    # For now, this field is left as None; populate from the IoD CSV separately.
    deprivation_index = None

    # Top languages: not available from Nomis in a simple endpoint.
    # Source: Census 2021 table TS024 (main language). Requires SPARQL query
    # against the ONS Geography Linked Data or manual download from Nomis bulk.
    top_languages = []

    return {
        "station_id": station["station_id"],
        "name": station["name"],
        "ward": station["ward"],
        "borough": "",            # resolve from lad_code → name lookup if needed
        "median_income_gbp": median_income,
        "deprivation_index": deprivation_index,
        "pct_born_outside_uk": pct_outside_uk,
        "top_languages": top_languages,
        "pct_no_qualifications": pct_no_qual,
        "population_density_per_km2": pop_density,
        # Prose sentences are not regenerated by this script — they are curated
        # in the static JSON and should be preserved via a merge, not overwrite.
        "fact_sentence": "",
        "history_sentence": "",
    }


async def main():
    print(f"Fetching demographics for {len(STATIONS)} Victoria Line stations...")
    results = []
    async with httpx.AsyncClient() as client:
        tasks = [build_station_record(client, s) for s in STATIONS]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    # Filter errors and warn
    output = []
    for station, result in zip(STATIONS, results):
        if isinstance(result, Exception):
            print(f"  WARNING: {station['name']} failed — {result}")
        else:
            output.append(result)
            print(f"  OK: {station['name']}")

    OUTPUT_PATH.write_text(json.dumps(output, indent=2, ensure_ascii=False))
    print(f"\nWrote {len(output)} records to {OUTPUT_PATH}")
    print("NOTE: deprivation_index and top_languages require separate data sources.")
    print("      fact_sentence and history_sentence must be merged manually.")


if __name__ == "__main__":
    asyncio.run(main())
