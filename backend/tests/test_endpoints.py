"""
Endpoint tests for the This is London FastAPI backend.
TfL HTTP calls are mocked via respx so tests run without network access.
The module-level state in backend.main is pre-populated so startup side-effects
are not needed (ASGITransport does not run lifespan events).
"""
import json
from pathlib import Path
import pytest
import respx
import httpx
from httpx import AsyncClient, ASGITransport

import backend.main as _main
from backend.main import app
from backend.tfl import TfLClient

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

DATA_DIR = Path(__file__).parent.parent / "data"

TFL_BASE = "https://api.tfl.gov.uk"
ARCGIS_URL = (
    "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services"
    "/London_Borough_Excluding_MHW/FeatureServer/0/query"
)
WIKI_BASE = "https://api.wikimedia.org"


def _load_stations(filename):
    path = DATA_DIR / filename
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return []


def _line_status_payload():
    lines = ["victoria", "district", "central", "jubilee", "northern"]
    return [
        {
            "id": line,
            "lineStatuses": [
                {"statusSeverity": 10, "statusSeverityDescription": "Good Service", "reason": ""}
            ],
        }
        for line in lines
    ]


@pytest.fixture(autouse=True)
def _seed_app_state():
    """Pre-populate module-level state that startup() would normally set."""
    _main._victoria_line = _load_stations("victoria_line.json")
    _main._district_line = _load_stations("district_stations.json")
    _main._central_line = _load_stations("central_line.json")
    _main._jubilee_line = _load_stations("jubilee_line.json")
    _main._northern_line = _load_stations("northern_line.json")

    with open(DATA_DIR / "demographics.json") as f:
        for item in json.load(f):
            _main._demographics[item["station_id"]] = item

    with open(DATA_DIR / "halo_colours.json") as f:
        for item in json.load(f):
            _main._halo_colours[item["station_id"]] = item

    ghost_path = DATA_DIR / "ghost_stations.json"
    if ghost_path.exists():
        with open(ghost_path) as f:
            _main._ghost_stations = json.load(f)

    with open(DATA_DIR / "gentrification.json") as f:
        _main._gentrification = json.load(f)

    with open(DATA_DIR / "language_map.json") as f:
        _main._language_map = json.load(f)

    _main._line_status_cache = [
        {"line": line, "severity": 10, "description": "Good Service", "reason": "", "disrupted": False}
        for line in ["victoria", "district", "central", "jubilee", "northern"]
    ]
    _main.tfl_client = TfLClient("")

    yield

    # Teardown — reset to empty so tests don't bleed state
    _main._victoria_line = []
    _main._district_line = []
    _main._central_line = []
    _main._jubilee_line = []
    _main._northern_line = []
    _main._demographics = {}
    _main._halo_colours = {}
    _main._ghost_stations = []
    _main._gentrification = {}
    _main._language_map = {}
    _main._line_status_cache = []
    _main.tfl_client = None


@pytest.fixture()
async def client():
    """Async test client with all external HTTP mocked."""
    with respx.mock(assert_all_called=False):
        # TfL arrivals for each line
        for line in ["victoria", "district", "central", "jubilee", "northern"]:
            respx.get(f"{TFL_BASE}/Line/{line}/Arrivals").mock(
                return_value=httpx.Response(200, json=[])
            )

        # TfL combined line status
        lines_joined = "victoria,district,central,jubilee,northern"
        respx.get(f"{TFL_BASE}/Line/{lines_joined}/Status").mock(
            return_value=httpx.Response(200, json=_line_status_payload())
        )

        # Borough boundaries (ArcGIS)
        respx.get(ARCGIS_URL).mock(
            return_value=httpx.Response(200, json={"type": "FeatureCollection", "features": []})
        )

        # Wikipedia "On This Day"
        respx.get(url__startswith=WIKI_BASE).mock(
            return_value=httpx.Response(200, json={"events": []})
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_health(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"


@pytest.mark.anyio
async def test_stations(client):
    resp = await client.get("/api/stations")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) > 0
    for item in data[:5]:
        for key in ("id", "name", "lat", "lng", "line"):
            assert key in item, f"Missing key '{key}' in station: {item}"


@pytest.mark.anyio
async def test_line_status(client):
    resp = await client.get("/api/line-status")
    assert resp.status_code == 200
    data = resp.json()
    # Endpoint returns {"fetched_at": ..., "statuses": [...]}
    statuses = data.get("statuses", data) if isinstance(data, dict) else data
    assert isinstance(statuses, list)
    for item in statuses:
        for key in ("line", "severity", "disrupted"):
            assert key in item, f"Missing key '{key}' in status: {item}"


@pytest.mark.anyio
async def test_ghost_stations(client):
    resp = await client.get("/api/ghost-stations")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.anyio
async def test_gentrification(client):
    resp = await client.get("/api/gentrification")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "boroughs" in data


@pytest.mark.anyio
async def test_language_map(client):
    resp = await client.get("/api/language-map")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "boroughs" in data


@pytest.mark.anyio
async def test_borough_boundaries(client):
    resp = await client.get("/api/borough-boundaries")
    assert resp.status_code == 200
    assert isinstance(resp.json(), dict)


@pytest.mark.anyio
async def test_journey(client):
    resp = await client.get(
        "/api/journey",
        params={"from_id": "940GZZLUBXN", "to_id": "940GZZLUWWL"},
    )
    assert resp.status_code in (200, 404)
    data = resp.json()
    assert "route" in data or "error" in data or "detail" in data
