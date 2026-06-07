"""
fetch_amenities.py

Fetches amenity counts (pubs, cafes, places of worship, bookmakers,
supermarkets) for a 500m radius around each Victoria Line station from
the Overpass API (OpenStreetMap). Run this to refresh
backend/data/amenities.json from live OSM data.

Usage:
    pip install httpx
    python scripts/fetch_amenities.py

Output:
    backend/data/amenities.json

API reference:
    Overpass API: https://overpass-api.de/
    Overpass QL docs: https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL
    Public instance: https://overpass-api.de/api/interpreter
    Mirror (higher availability): https://overpass.kumi.systems/api/interpreter

Notes:
    - The Overpass public API has a fair-use rate limit. This script spaces
      requests 1s apart and uses a single compound query per station to
      minimise round-trips.
    - OSM data quality around London stations is generally excellent, but
      amenity tagging is community-maintained and may lag real-world changes.
    - For production use, consider caching the raw Overpass responses in a
      separate file and refreshing no more than weekly.
    - Radius is set to 500m (roughly a 6-minute walk). Adjust RADIUS_M below.
"""

import json
import asyncio
import time
import httpx
from pathlib import Path

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
RADIUS_M = 500          # search radius in metres around each station
REQUEST_DELAY = 1.2     # seconds between requests (be polite to the public API)
OUTPUT_PATH = Path(__file__).parent.parent / "backend" / "data" / "amenities.json"

# ---------------------------------------------------------------------------
# Station coordinates — lat/lng taken from victoria_line.json
# ---------------------------------------------------------------------------
STATIONS = [
    {"station_id": "940GZZLUBXN", "name": "Brixton",                 "lat": 51.4627, "lng": -0.1145},
    {"station_id": "940GZZLUSTK", "name": "Stockwell",                "lat": 51.4723, "lng": -0.1228},
    {"station_id": "940GZZLUUXB", "name": "Vauxhall",                 "lat": 51.4861, "lng": -0.1248},
    {"station_id": "940GZZLUPCO", "name": "Pimlico",                  "lat": 51.4893, "lng": -0.1334},
    {"station_id": "940GZZLUVIC", "name": "Victoria",                 "lat": 51.4965, "lng": -0.1447},
    {"station_id": "940GZZLUGPK", "name": "Green Park",               "lat": 51.5067, "lng": -0.1428},
    {"station_id": "940GZZLUOXC", "name": "Oxford Circus",            "lat": 51.5154, "lng": -0.1415},
    {"station_id": "940GZZLUWRR", "name": "Warren Street",            "lat": 51.5238, "lng": -0.1382},
    {"station_id": "940GZZLUEAC", "name": "Euston",                   "lat": 51.5282, "lng": -0.1337},
    {"station_id": "940GZZLUKSX", "name": "King's Cross St. Pancras", "lat": 51.5308, "lng": -0.1238},
    {"station_id": "940GZZLUHBT", "name": "Highbury & Islington",     "lat": 51.5462, "lng": -0.1033},
    {"station_id": "940GZZLUFPK", "name": "Finsbury Park",            "lat": 51.5642, "lng": -0.1007},
    {"station_id": "940GZZLUSES", "name": "Seven Sisters",            "lat": 51.5822, "lng": -0.0724},
    {"station_id": "940GZZLUTOT", "name": "Tottenham Hale",           "lat": 51.5882, "lng": -0.0598},
    {"station_id": "940GZZLUBLR", "name": "Blackhorse Road",          "lat": 51.5869, "lng": -0.0417},
    {"station_id": "940GZZLUWWL", "name": "Walthamstow Central",      "lat": 51.5832, "lng": -0.0197},
]

# ---------------------------------------------------------------------------
# OSM tag filters for each amenity category
# Each value is a list of (key, value) pairs that identify the feature.
# We count nodes, ways, and relations matching any of these tags.
# ---------------------------------------------------------------------------
AMENITY_TAGS = {
    "pubs": [
        ("amenity", "pub"),
        ("amenity", "bar"),
    ],
    "cafes": [
        ("amenity", "cafe"),
        ("amenity", "coffee_shop"),
    ],
    "places_of_worship": [
        ("amenity", "place_of_worship"),
    ],
    "bookmakers": [
        ("shop", "bookmaker"),
        ("shop", "betting"),
    ],
    "supermarkets": [
        ("shop", "supermarket"),
        ("shop", "convenience"),  # small convenience stores common in London
    ],
}


def build_overpass_query(lat: float, lng: float, radius_m: int) -> str:
    """
    Builds a single Overpass QL query that counts all amenity categories
    around a point in one request, returning JSON.

    The query uses 'around' filters: around:<radius>,<lat>,<lng>.
    Each amenity group is unioned and output together; we count server-side
    using 'out count' per group.
    """
    parts = []
    for category, tags in AMENITY_TAGS.items():
        # Build a union of node/way/relation for each tag pair in this category
        selectors = []
        for key, val in tags:
            for element in ("node", "way", "relation"):
                selectors.append(
                    f'  {element}["{key}"="{val}"](around:{radius_m},{lat},{lng});'
                )
        parts.append(
            f"  // {category}\n"
            f"  (\n"
            + "\n".join(selectors)
            + f"\n  );\n"
            f"  out count;\n"
        )

    # Overpass QL: run each category as a separate union, output count only
    # We wrap in a union to get per-category counts by splitting the response.
    # Simpler approach: run one query per category (see fetch_station_amenities).
    return "\n".join(parts)


def build_count_query(lat: float, lng: float, radius_m: int, tags: list) -> str:
    """
    Build a minimal Overpass QL query that returns the count of elements
    matching any of the given (key, value) tag pairs within radius_m metres.
    """
    selectors = []
    for key, val in tags:
        for element in ("node", "way", "relation"):
            selectors.append(f'  {element}["{key}"="{val}"](around:{radius_m},{lat},{lng});')
    query = (
        "[out:json][timeout:10];\n"
        "(\n"
        + "\n".join(selectors)
        + "\n);\n"
        "out count;\n"
    )
    return query


def parse_count_response(data: dict) -> int:
    """
    Parse the count from an Overpass 'out count' JSON response.
    The response looks like:
        {"elements": [{"type": "count", "tags": {"total": "14", ...}}]}
    """
    elements = data.get("elements", [])
    for el in elements:
        if el.get("type") == "count":
            return int(el.get("tags", {}).get("total", 0))
    return 0


def fetch_station_amenities(station: dict) -> dict:
    """
    Synchronous fetch of all amenity counts for one station.
    Uses a separate HTTP request per amenity category to keep queries simple.
    """
    lat, lng = station["lat"], station["lng"]
    counts = {}

    with httpx.Client(timeout=20) as client:
        for category, tags in AMENITY_TAGS.items():
            query = build_count_query(lat, lng, RADIUS_M, tags)
            try:
                r = client.post(OVERPASS_URL, data={"data": query})
                r.raise_for_status()
                counts[category] = parse_count_response(r.json())
            except Exception as exc:
                print(f"    WARNING: {station['name']} / {category} failed — {exc}")
                counts[category] = 0
            time.sleep(REQUEST_DELAY)

    # Build an amenity sentence from the live counts
    amenity_sentence = (
        f"{counts['pubs']} pub{'s' if counts['pubs'] != 1 else ''}, "
        f"{counts['places_of_worship']} place{'s' if counts['places_of_worship'] != 1 else ''} of worship, "
        f"and {counts['bookmakers']} bookmaker{'s' if counts['bookmakers'] != 1 else ''} "
        f"within {RADIUS_M}m of {station['name']} station."
    )

    return {
        "station_id": station["station_id"],
        "name": station["name"],
        "pubs": counts["pubs"],
        "cafes": counts["cafes"],
        "places_of_worship": counts["places_of_worship"],
        "bookmakers": counts["bookmakers"],
        "supermarkets": counts["supermarkets"],
        # NOTE: auto-generated sentence is functional but not art-directed.
        # After running this script, review amenity_sentence values and rewrite
        # them as atmospheric copy before committing.
        "amenity_sentence": amenity_sentence,
    }


def main():
    print(f"Fetching amenities for {len(STATIONS)} stations (radius={RADIUS_M}m)...")
    print(f"Estimated time: ~{len(STATIONS) * len(AMENITY_TAGS) * REQUEST_DELAY:.0f}s\n")
    output = []
    for i, station in enumerate(STATIONS):
        print(f"  [{i+1}/{len(STATIONS)}] {station['name']}...")
        record = fetch_station_amenities(station)
        output.append(record)
        print(f"       pubs={record['pubs']} cafes={record['cafes']} "
              f"worship={record['places_of_worship']} "
              f"bookmakers={record['bookmakers']} supermarkets={record['supermarkets']}")

    OUTPUT_PATH.write_text(json.dumps(output, indent=2, ensure_ascii=False))
    print(f"\nWrote {len(output)} records to {OUTPUT_PATH}")
    print("REMINDER: Review and rewrite amenity_sentence values as art copy.")


if __name__ == "__main__":
    main()
