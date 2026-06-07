import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

import httpx
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

_victoria_line: list[dict] = []
_district_line: list[dict] = []
_demographics: dict[str, dict] = {}    # station_id -> demographics object
_halo_colours: dict[str, dict] = {}    # station_id -> halo/colour object

# Live train cache — keyed by vehicle_id, with a 'line' field
_train_cache: dict[str, dict] = {}
_last_tfl_fetch: datetime | None = None

# On This Day cache — refreshed once per calendar day
_on_this_day_cache: list[dict] = []
_on_this_day_date: str | None = None  # "MM-DD"

# Police API cache — station_id -> {data, fetched_at}
_police_cache: dict[str, dict] = {}

# Weather cache — refreshed every 30 minutes
_weather_cache: dict = {}
_weather_fetched_at: datetime | None = None

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

def _normalise_direction_victoria(item: dict) -> str:
    direction = item.get("direction", "").lower()
    if direction in ("southbound", "northbound"):
        return direction
    towards = item.get("towards", "").lower()
    if "brixton" in towards or "south" in towards:
        return "southbound"
    elif "walthamstow" in towards or "north" in towards:
        return "northbound"
    return direction or "unknown"


def _normalise_direction_district(item: dict) -> str:
    towards = item.get("towards", "").lower()
    destination_name = item.get("destinationName", "").lower()
    combined = towards + " " + destination_name
    # Inbound = heading east/toward Tower Hill/City
    if any(kw in combined for kw in ("upminster", "barking", "tower hill", "city", "eastbound")):
        return "eastbound"
    # Outbound = heading west/southwest
    if any(kw in combined for kw in ("wimbledon", "richmond", "ealing", "edgware", "westbound")):
        return "westbound"
    return "unknown"


def _process_arrivals(raw: list[dict], line: str) -> dict[str, dict]:
    best: dict[str, dict] = {}
    for item in raw:
        vehicle_id = item.get("vehicleId") or item.get("vehicle_id") or ""
        if not vehicle_id:
            continue
        # Prefix vehicle_id with line to avoid collisions between lines
        key = f"{line}:{vehicle_id}"
        time_to_station = int(item.get("timeToStation", 0))

        if line == "victoria":
            direction = _normalise_direction_victoria(item)
        else:
            direction = _normalise_direction_district(item)

        clean = {
            "vehicle_id": vehicle_id,
            "line": line,
            "towards_station_id": item.get("naptanId", ""),
            "towards_station_name": item.get("towards", item.get("destinationName", "")),
            "time_to_station_seconds": time_to_station,
            "direction": direction,
            "current_location": item.get("currentLocation", ""),
            "platform_name": item.get("platformName", ""),
        }
        existing = best.get(key)
        if existing is None or time_to_station < existing["time_to_station_seconds"]:
            best[key] = clean
    return best


# ---------------------------------------------------------------------------
# Scheduler jobs
# ---------------------------------------------------------------------------

async def _fetch_trains():
    global _train_cache, _last_tfl_fetch
    if tfl_client is None:
        return
    victoria_raw = await tfl_client.get_victoria_arrivals()
    district_raw = await tfl_client.get_district_arrivals()

    combined = {}
    combined.update(_process_arrivals(victoria_raw, "victoria"))
    combined.update(_process_arrivals(district_raw, "district"))

    _train_cache = combined
    _last_tfl_fetch = datetime.now(timezone.utc)
    v_count = sum(1 for t in combined.values() if t["line"] == "victoria")
    d_count = sum(1 for t in combined.values() if t["line"] == "district")
    logger.info("TfL fetch: %d Victoria + %d District trains", v_count, d_count)


async def _refresh_on_this_day():
    global _on_this_day_cache, _on_this_day_date
    if tfl_client is None:
        return
    now = datetime.now(timezone.utc)
    date_key = f"{now.month:02d}-{now.day:02d}"
    if _on_this_day_date == date_key and _on_this_day_cache:
        return
    events = await tfl_client.get_on_this_day(now.month, now.day)
    _on_this_day_cache = events
    _on_this_day_date = date_key
    logger.info("On This Day: %d London events fetched", len(events))


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup():
    global _victoria_line, _district_line, _demographics, _halo_colours
    global tfl_client

    with open(DATA_DIR / "victoria_line.json") as f:
        _victoria_line = json.load(f)

    with open(DATA_DIR / "district_stations.json") as f:
        _district_line = json.load(f)

    with open(DATA_DIR / "demographics.json") as f:
        for item in json.load(f):
            _demographics[item["station_id"]] = item

    with open(DATA_DIR / "halo_colours.json") as f:
        for item in json.load(f):
            _halo_colours[item["station_id"]] = item

    logger.info(
        "Loaded: %d Victoria stations, %d District stations, %d demographics, %d halo entries",
        len(_victoria_line), len(_district_line), len(_demographics), len(_halo_colours),
    )

    tfl_client = TfLClient(TFL_APP_KEY)
    await _fetch_trains()
    await _refresh_on_this_day()

    scheduler.add_job(_fetch_trains, "interval", seconds=20, id="tfl_fetch")
    scheduler.add_job(_refresh_on_this_day, "interval", seconds=3600, id="on_this_day")
    scheduler.start()
    logger.info("APScheduler started")


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


def _scheduled_trains(line: str) -> int:
    hour = datetime.now(timezone.utc).hour
    peak = 7 <= hour <= 9 or 17 <= hour <= 19
    if line == "victoria":
        return 12 if peak else 6
    else:
        # District line has more trains due to multiple branches
        return 24 if peak else 12


def _find_station(station_id: str) -> dict | None:
    for s in _victoria_line:
        if s["id"] == station_id:
            return {**s, "line": "victoria"}
    for s in _district_line:
        if s["id"] == station_id:
            return {**s, "line": "district"}
    return None


async def _get_police_incidents(station_id: str, lat: float, lng: float) -> dict:
    global _police_cache
    cached = _police_cache.get(station_id)
    now = datetime.now(timezone.utc)
    if cached:
        age_secs = (now - cached["fetched_at"]).total_seconds()
        if age_secs < 3600:
            return cached["data"]

    # Use previous month (police data has ~2 month lag)
    month = now.month - 1 or 12
    year = now.year if now.month > 1 else now.year - 1
    date_str = f"{year}-{month:02d}"

    result = {"incident_count": None, "top_incident_type": None}
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                "https://data.police.uk/api/crimes-at-location",
                params={"lat": lat, "lng": lng, "date": date_str},
            )
            if resp.status_code == 200:
                crimes = resp.json()
                if crimes:
                    result["incident_count"] = len(crimes)
                    cat_counts: dict[str, int] = {}
                    for c in crimes:
                        cat = c.get("category", "other")
                        cat_counts[cat] = cat_counts.get(cat, 0) + 1
                    result["top_incident_type"] = max(cat_counts, key=cat_counts.get).replace("-", " ")
    except Exception as exc:
        logger.warning("Police API failed for %s: %s", station_id, exc)

    _police_cache[station_id] = {"data": result, "fetched_at": now}
    return result


def _weather_condition(code: int) -> str:
    if code == 0: return "clear"
    if code <= 3: return "cloudy"
    if code in (45, 48): return "fog"
    if code <= 67: return "rain"
    if code <= 77: return "snow"
    if code <= 82: return "showers"
    return "storm"


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "ok",
        "last_tfl_fetch": _iso(_last_tfl_fetch),
        "train_count": len(_train_cache),
        "victoria_trains": sum(1 for t in _train_cache.values() if t["line"] == "victoria"),
        "district_trains": sum(1 for t in _train_cache.values() if t["line"] == "district"),
    }


@app.get("/api/live-trains")
def live_trains():
    return {
        "fetched_at": _iso(_last_tfl_fetch),
        "trains": list(_train_cache.values()),
    }


@app.get("/api/station/{station_id}")
async def station(station_id: str):
    station_info = _find_station(station_id)
    if station_info is None:
        raise HTTPException(status_code=404, detail="Station not found")

    halo = _halo_colours.get(station_id, {})
    demo = _demographics.get(station_id, {})

    # Police API call (cached 1hr)
    police = await _get_police_incidents(
        station_id,
        station_info["lat"],
        station_info["lng"],
    )

    return {
        "id": station_info["id"],
        "name": station_info["name"],
        "lat": station_info["lat"],
        "lng": station_info["lng"],
        "zone": station_info["zone"],
        "borough": station_info.get("borough", demo.get("borough")),
        "line": station_info.get("line"),
        "halo_hex": halo.get("halo_hex"),
        "wealth_score": halo.get("wealth_score"),
        "font_weight": halo.get("font_weight"),
        "bg_tint": halo.get("bg_tint"),
        "demographics": demo,
        "incident_count": police.get("incident_count"),
        "top_incident_type": police.get("top_incident_type"),
    }


@app.get("/api/station/{station_id}/arrivals")
async def station_arrivals(station_id: str):
    if tfl_client is None:
        return []
    raw = await tfl_client.get_station_arrivals(station_id)
    arrivals = sorted(raw, key=lambda x: x.get("timeToStation", 9999))[:5]
    return [
        {
            "towards_station_name": a.get("destinationName", a.get("towards", "Unknown")),
            "time_to_station_seconds": a.get("timeToStation", 0),
            "platform_name": a.get("platformName", ""),
            "current_location": a.get("currentLocation", ""),
        }
        for a in arrivals
    ]


@app.get("/api/line-pressure")
def line_pressure():
    victoria_running = sum(1 for t in _train_cache.values() if t["line"] == "victoria")
    district_running = sum(1 for t in _train_cache.values() if t["line"] == "district")

    v_scheduled = _scheduled_trains("victoria")
    d_scheduled = _scheduled_trains("district")

    total_running = victoria_running + district_running
    total_scheduled = v_scheduled + d_scheduled
    ratio = round(total_running / total_scheduled, 2) if total_scheduled else 0.0

    if ratio > 0.8:
        status = "green"
    elif ratio >= 0.5:
        status = "amber"
    else:
        status = "red"
    return {
        "running": total_running,
        "scheduled": total_scheduled,
        "ratio": ratio,
        "status": status,
        "victoria_running": victoria_running,
        "district_running": district_running,
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
            "line": "victoria",
            "branch": "main",
            "borough": _demographics.get(sid, {}).get("borough"),
            "halo_hex": halo.get("halo_hex"),
            "wealth_score": halo.get("wealth_score"),
            "font_weight": halo.get("font_weight"),
            "bg_tint": halo.get("bg_tint"),
        })

    for s in _district_line:
        sid = s["id"]
        # Skip Victoria station — it's already in the Victoria line list
        # but we still need it in the district for train routing
        halo = _halo_colours.get(sid, {})
        # Use district-specific halo if available; Victoria's halo is amber
        # so we need a teal one — fall back to generic teal if not found
        result.append({
            "id": sid,
            "name": s["name"],
            "lat": s["lat"],
            "lng": s["lng"],
            "zone": s["zone"],
            "sequence": s["sequence"],
            "line": "district",
            "branch": s.get("branch", "all"),
            "borough": s.get("borough", _demographics.get(sid, {}).get("borough")),
            "halo_hex": halo.get("halo_hex", "#0eb882"),
            "wealth_score": halo.get("wealth_score", 0.5),
            "font_weight": halo.get("font_weight", 450),
            "bg_tint": halo.get("bg_tint", "#00100a"),
        })

    return result


@app.get("/api/on-this-day")
async def on_this_day():
    await _refresh_on_this_day()
    return {
        "date": _on_this_day_date,
        "events": _on_this_day_cache,
    }


@app.get("/api/weather")
async def weather():
    global _weather_cache, _weather_fetched_at
    now = datetime.now(timezone.utc)
    if _weather_fetched_at and (now - _weather_fetched_at).total_seconds() < 1800:
        return _weather_cache
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": 51.5074,
                    "longitude": -0.1278,
                    "current_weather": "true",
                },
            )
            if resp.status_code == 200:
                cw = resp.json().get("current_weather", {})
                code = int(cw.get("weathercode", 0))
                _weather_cache = {
                    "weathercode": code,
                    "temperature_c": cw.get("temperature"),
                    "condition": _weather_condition(code),
                    "windspeed_kmh": cw.get("windspeed"),
                }
                _weather_fetched_at = now
    except Exception as exc:
        logger.warning("Weather API failed: %s", exc)
    return _weather_cache or {"weathercode": 0, "condition": "clear", "temperature_c": None}
