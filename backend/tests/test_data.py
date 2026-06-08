"""Tests that all JSON data files are valid and well-formed."""
import json
from pathlib import Path

import pytest

DATA_DIR = Path(__file__).parent.parent / "data"

STATION_FILES = [
    "victoria_line.json",
    "district_stations.json",
    "central_line.json",
    "jubilee_line.json",
    "northern_line.json",
]

ALL_JSON_FILES = list(DATA_DIR.glob("*.json"))


@pytest.mark.parametrize("filepath", ALL_JSON_FILES, ids=lambda p: p.name)
def test_json_is_valid(filepath):
    with open(filepath) as f:
        data = json.load(f)
    assert data is not None


@pytest.mark.parametrize("filename", STATION_FILES)
def test_station_file_is_list_of_dicts(filename):
    path = DATA_DIR / filename
    if not path.exists():
        pytest.skip(f"{filename} not present")
    with open(path) as f:
        stations = json.load(f)
    assert isinstance(stations, list), f"{filename} should be a list"
    assert len(stations) > 0, f"{filename} should not be empty"
    for station in stations:
        assert isinstance(station, dict), f"Each item in {filename} should be a dict"
        for key in ("id", "name", "lat", "lng"):
            assert key in station, f"Missing key '{key}' in {filename}: {station}"


@pytest.mark.parametrize("filename", STATION_FILES)
def test_station_lat_in_london_bounds(filename):
    path = DATA_DIR / filename
    if not path.exists():
        pytest.skip(f"{filename} not present")
    with open(path) as f:
        stations = json.load(f)
    for station in stations:
        lat = station["lat"]
        assert 51.0 <= lat <= 51.9, (
            f"Latitude {lat} out of London bounds in {filename}: {station['name']}"
        )


@pytest.mark.parametrize("filename", STATION_FILES)
def test_station_lng_in_london_bounds(filename):
    path = DATA_DIR / filename
    if not path.exists():
        pytest.skip(f"{filename} not present")
    with open(path) as f:
        stations = json.load(f)
    for station in stations:
        lng = station["lng"]
        assert -1.0 <= lng <= 0.5, (
            f"Longitude {lng} out of London bounds in {filename}: {station['name']}"
        )
