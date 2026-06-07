import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.tfl import TfLClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Static data — loaded once at startup
# ---------------------------------------------------------------------------

DATA_DIR = Path(__file__).parent / "data"

_victoria_line: list[dict] = []        # list of station objects
_demographics: dict[str, dict] = {}    # station_id -> demographics object
_amenities: dict[str, dict] = {}       # station_id -> amenities object
_halo_colours: dict[str, dict] = {}    # station_id -> halo/colour object

# Live train cache
_train_cache: dict[str, dict] = {}     # vehicle_id -> clean train object
_last_tfl_fetch: datetime | None = None

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

TFL_APP_KEY = os.getenv("TFL_APP_KEY", "")

app = FastAPI(title="This is London")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

scheduler = AsyncIOScheduler()
tfl_client: TfLClient | None = None


# ---------------------------------------------------------------------------
# Train processing
# ---------------------------------------------------------------------------

def _process_arrivals(raw: list[dict]) -> dict[str, dict]:
    """Convert raw TfL arrival predictions to clean train objects.

    Deduplicates by vehicle_id, keeping the entry with the smallest
    time_to_station_seconds per vehicle.
    """
    best: dict[str, dict] = {}
    for item in raw:
        vehicle_id = item.get("vehicleId") or item.get("vehicle_id") or ""
        if not vehicle_id:
            continue
        time_to_station = int(item.get("timeToStation", 0))
        direction = item.get("direction", "").lower()
        if direction not in ("southbound", "northbound"):
            # Normalise TfL's varied direction strings
            towards = item.get("towards", "").lower()
            if "brixton" in towards or "south" in towards:
                direction = "southbound"
            elif "walthamstow" in towards or "north" in towards:
                direction = "northbound"
            else:
                direction = direction or "unknown"

        clean = {
            "vehicle_id": vehicle_id,
            "towards_station_id": item.get("naptanId", ""),
            "towards_station_name": item.get("towards", ""),
            "time_to_station_seconds": time_to_station,
            "direction": direction,
            "current_location": item.get("currentLocation", ""),
            "platform_name": item.get("platformName", ""),
        }
        existing = best.get(vehicle_id)
        if existing is None or time_to_station < existing["time_to_station_seconds"]:
            best[vehicle_id] = clean
    return best


# ---------------------------------------------------------------------------
# Scheduler job
# ---------------------------------------------------------------------------

async def _fetch_trains():
    global _train_cache, _last_tfl_fetch
    if tfl_client is None:
        return
    raw = await tfl_client.get_victoria_arrivals()
    _train_cache = _process_arrivals(raw)
    _last_tfl_fetch = datetime.now(timezone.utc)
    logger.info("TfL fetch: %d trains cached", len(_train_cache))


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup():
    global _victoria_line, _demographics, _amenities, _halo_colours
    global tfl_client

    # Load static JSON data
    with open(DATA_DIR / "victoria_line.json") as f:
        _victoria_line = json.load(f)

    with open(DATA_DIR / "demographics.json") as f:
        for item in json.load(f):
            _demographics[item["station_id"]] = item

    with open(DATA_DIR / "amenities.json") as f:
        for item in json.load(f):
            _amenities[item["station_id"]] = item

    with open(DATA_DIR / "halo_colours.json") as f:
        for item in json.load(f):
            _halo_colours[item["station_id"]] = item

    logger.info(
        "Loaded static data: %d stations, %d demographics, %d amenities, %d halo colours",
        len(_victoria_line), len(_demographics), len(_amenities), len(_halo_colours),
    )

    # TfL client + scheduler
    tfl_client = TfLClient(TFL_APP_KEY)
    await _fetch_trains()  # initial fetch (may return empty list without key)

    scheduler.add_job(_fetch_trains, "interval", seconds=20, id="tfl_fetch")
    scheduler.start()
    logger.info("APScheduler started — TfL poll every 20 s")


@app.on_event("shutdown")
async def shutdown():
    scheduler.shutdown(wait=False)
    if tfl_client:
        await tfl_client.aclose()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def _scheduled_trains() -> int:
    """Estimate scheduled Victoria Line trains based on time of day (one direction)."""
    hour = datetime.now(timezone.utc).hour
    # Approximate London local time (UTC+1 BST, UTC+0 GMT — use UTC as proxy)
    # Peak: 07-09, 17-19; off-peak otherwise
    if 7 <= hour <= 9 or 17 <= hour <= 19:
        return 12
    return 6


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "ok",
        "last_tfl_fetch": _iso(_last_tfl_fetch),
        "train_count": len(_train_cache),
    }


@app.get("/api/live-trains")
def live_trains():
    return {
        "fetched_at": _iso(_last_tfl_fetch),
        "trains": list(_train_cache.values()),
    }


@app.get("/api/station/{station_id}")
def station(station_id: str):
    # Find base station info
    station_info = next((s for s in _victoria_line if s["id"] == station_id), None)
    if station_info is None:
        raise HTTPException(status_code=404, detail="Station not found")

    halo = _halo_colours.get(station_id, {})
    demo = _demographics.get(station_id, {})
    amenities = _amenities.get(station_id, {})

    return {
        "id": station_info["id"],
        "name": station_info["name"],
        "lat": station_info["lat"],
        "lng": station_info["lng"],
        "zone": station_info["zone"],
        "sequence": station_info["sequence"],
        "halo_hex": halo.get("halo_hex"),
        "wealth_score": halo.get("wealth_score"),
        "font_weight": halo.get("font_weight"),
        "bg_tint": halo.get("bg_tint"),
        "demographics": demo,
        "amenities": amenities,
    }


@app.get("/api/line-pressure")
def line_pressure():
    running = len(_train_cache)
    scheduled = _scheduled_trains()
    ratio = round(running / scheduled, 2) if scheduled else 0.0
    if ratio > 0.8:
        status = "green"
    elif ratio >= 0.5:
        status = "amber"
    else:
        status = "red"
    return {
        "running": running,
        "scheduled": scheduled,
        "ratio": ratio,
        "status": status,
    }


@app.get("/api/stations")
def stations():
    result = []
    for s in _victoria_line:
        sid = s["id"]
        halo = _halo_colours.get(sid, {})
        result.append({
            "id": sid,
            "name": s["name"],
            "lat": s["lat"],
            "lng": s["lng"],
            "zone": s["zone"],
            "sequence": s["sequence"],
            "halo_hex": halo.get("halo_hex"),
            "wealth_score": halo.get("wealth_score"),
            "font_weight": halo.get("font_weight"),
            "bg_tint": halo.get("bg_tint"),
        })
    return result
