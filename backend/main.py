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
_central_line: list[dict] = []
_jubilee_line: list[dict] = []
_northern_line: list[dict] = []
_bakerloo_line: list[dict] = []
_piccadilly_line: list[dict] = []
_hammersmith_city_line: list[dict] = []
_circle_line: list[dict] = []
_metropolitan_line: list[dict] = []
_elizabeth_line: list[dict] = []
_waterloo_city_line: list[dict] = []
_demographics: dict[str, dict] = {}
_halo_colours: dict[str, dict] = {}
_ghost_stations: list[dict] = []
_gentrification: dict = {}
_language_map: dict = {}

_train_cache: dict[str, dict] = {}
_last_tfl_fetch: datetime | None = None

_on_this_day_cache: list[dict] = []
_on_this_day_date: str | None = None

_police_cache: dict[str, dict] = {}

_borough_geojson: dict = {}
_census_data: dict = {}
_gla_data: dict = {}

_weather_cache: dict = {}
_weather_fetched_at: datetime | None = None

_line_status_cache: list[dict] = []
_line_status_fetched_at: datetime | None = None

_air_quality_cache: dict = {}
_air_quality_fetched_at: datetime | None = None

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
    if any(kw in combined for kw in ("upminster", "barking", "tower hill", "city", "eastbound")):
        return "eastbound"
    if any(kw in combined for kw in ("wimbledon", "richmond", "ealing", "edgware", "westbound")):
        return "westbound"
    return "unknown"


def _normalise_direction_central(item: dict) -> str:
    towards = item.get("towards", "").lower()
    dest = item.get("destinationName", "").lower()
    combined = towards + " " + dest
    if any(kw in combined for kw in ("epping", "loughton", "woodford", "hainault", "eastbound", "stratford", "leytonstone")):
        return "eastbound"
    if any(kw in combined for kw in ("west ruislip", "ealing", "northolt", "westbound")):
        return "westbound"
    return "unknown"


def _normalise_direction_jubilee(item: dict) -> str:
    towards = item.get("towards", "").lower()
    dest = item.get("destinationName", "").lower()
    combined = towards + " " + dest
    if any(kw in combined for kw in ("stratford", "canary wharf", "london bridge", "southbound", "eastbound")):
        return "southbound"
    if any(kw in combined for kw in ("stanmore", "northbound", "westbound")):
        return "northbound"
    return "unknown"


def _normalise_direction_northern(item: dict) -> str:
    towards = item.get("towards", "").lower()
    dest = item.get("destinationName", "").lower()
    combined = towards + " " + dest
    if any(kw in combined for kw in ("morden", "southbound", "kennington", "oval")):
        return "southbound"
    if any(kw in combined for kw in ("edgware", "high barnet", "mill hill", "northbound", "camden")):
        return "northbound"
    return "unknown"


def _process_arrivals(raw: list[dict], line: str) -> dict[str, dict]:
    normalise = {
        "victoria": _normalise_direction_victoria,
        "district": _normalise_direction_district,
        "central": _normalise_direction_central,
        "jubilee": _normalise_direction_jubilee,
        "northern": _normalise_direction_northern,
    }.get(line, lambda x: "unknown")

    best: dict[str, dict] = {}
    for item in raw:
        vehicle_id = item.get("vehicleId") or item.get("vehicle_id") or ""
        if not vehicle_id:
            continue
        key = f"{line}:{vehicle_id}"
        time_to_station = int(item.get("timeToStation", 0))
        direction = normalise(item)
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

async def _fetch_borough_boundaries():
    global _borough_geojson
    url = (
        "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services"
        "/London_Borough_Excluding_MHW/FeatureServer/0/query"
    )
    params = {"where": "1=1", "outFields": "NAME", "geometryPrecision": "4", "outSR": "4326", "f": "geojson"}
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                _borough_geojson = resp.json()
                logger.info("Borough boundaries loaded: %d features", len(_borough_geojson.get("features", [])))
    except Exception as exc:
        logger.warning("Borough boundaries fetch failed: %s", exc)


async def _fetch_trains():
    global _train_cache, _last_tfl_fetch
    if tfl_client is None:
        return
    results = await tfl_client.get_all_arrivals()
    combined = {}
    for line, raw in results.items():
        combined.update(_process_arrivals(raw, line))
    _train_cache = combined
    _last_tfl_fetch = datetime.now(timezone.utc)
    counts = {ln: sum(1 for t in combined.values() if t["line"] == ln) for ln in results}
    logger.info("TfL fetch: %s", " + ".join(f"{c} {ln}" for ln, c in counts.items()))


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


async def _fetch_line_status():
    global _line_status_cache, _line_status_fetched_at
    if tfl_client is None:
        return
    statuses = await tfl_client.get_line_status()
    _line_status_cache = statuses
    _line_status_fetched_at = datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup():
    global _victoria_line, _district_line, _central_line, _jubilee_line, _northern_line
    global _bakerloo_line, _piccadilly_line, _hammersmith_city_line, _circle_line
    global _metropolitan_line, _elizabeth_line, _waterloo_city_line
    global _demographics, _halo_colours, _ghost_stations, _gentrification, _language_map
    global tfl_client

    with open(DATA_DIR / "victoria_line.json") as f:
        _victoria_line = json.load(f)

    with open(DATA_DIR / "district_stations.json") as f:
        _district_line = json.load(f)

    # New lines — load if files exist, skip gracefully if not yet added
    for attr, fname in [
        ("_central_line", "central_line.json"),
        ("_jubilee_line", "jubilee_line.json"),
        ("_northern_line", "northern_line.json"),
        ("_bakerloo_line", "bakerloo_line.json"),
        ("_piccadilly_line", "piccadilly_line.json"),
        ("_hammersmith_city_line", "hammersmith_city_line.json"),
        ("_circle_line", "circle_line.json"),
        ("_metropolitan_line", "metropolitan_line.json"),
        ("_elizabeth_line", "elizabeth_line.json"),
        ("_waterloo_city_line", "waterloo_city_line.json"),
    ]:
        path = DATA_DIR / fname
        if path.exists():
            with open(path) as f:
                globals()[attr] = json.load(f)
            logger.info("Loaded %s: %d stations", fname, len(globals()[attr]))

    with open(DATA_DIR / "demographics.json") as f:
        for item in json.load(f):
            _demographics[item["station_id"]] = item

    with open(DATA_DIR / "halo_colours.json") as f:
        for item in json.load(f):
            _halo_colours[item["station_id"]] = item

    if (DATA_DIR / "ghost_stations.json").exists():
        with open(DATA_DIR / "ghost_stations.json") as f:
            _ghost_stations = json.load(f)

    if (DATA_DIR / "gentrification.json").exists():
        with open(DATA_DIR / "gentrification.json") as f:
            _gentrification = json.load(f)

    if (DATA_DIR / "language_map.json").exists():
        with open(DATA_DIR / "language_map.json") as f:
            _language_map = json.load(f)

    logger.info(
        "Loaded: %d Victoria, %d District, %d ghost stations",
        len(_victoria_line), len(_district_line), len(_ghost_stations),
    )

    tfl_client = TfLClient(TFL_APP_KEY)

    census_path = DATA_DIR / "census_processed.json"
    gla_path = DATA_DIR / "gla_processed.json"
    if census_path.exists():
        with open(census_path) as f:
            _census_data.update(json.load(f))
    if gla_path.exists():
        with open(gla_path) as f:
            _gla_data.update(json.load(f))

    try:
        await _fetch_borough_boundaries()
    except Exception as exc:
        logger.warning("Borough boundaries skipped: %s", exc)

    await _fetch_trains()
    await _refresh_on_this_day()
    await _fetch_line_status()

    scheduler.add_job(_fetch_trains, "interval", seconds=20, id="tfl_fetch")
    scheduler.add_job(_refresh_on_this_day, "interval", seconds=3600, id="on_this_day")
    scheduler.add_job(_fetch_line_status, "interval", seconds=60, id="line_status")
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
    return {"victoria": (12, 6), "district": (24, 12), "central": (24, 12),
            "jubilee": (20, 10), "northern": (20, 10)}.get(line, (10, 5))[0 if peak else 1]


def _all_lines() -> list[tuple[str, list[dict], str]]:
    return [
        ("victoria", _victoria_line, "#009DDC"),
        ("district", _district_line, "#007229"),
        ("central", _central_line, "#E32017"),
        ("jubilee", _jubilee_line, "#A0A5A9"),
        ("northern", _northern_line, "#000000"),
        ("bakerloo", _bakerloo_line, "#894E24"),
        ("piccadilly", _piccadilly_line, "#003688"),
        ("hammersmith-city", _hammersmith_city_line, "#F3A9BB"),
        ("circle", _circle_line, "#FFD300"),
        ("metropolitan", _metropolitan_line, "#9B0056"),
        ("elizabeth", _elizabeth_line, "#6950A1"),
        ("waterloo-city", _waterloo_city_line, "#95CDBA"),
    ]


def _find_station(station_id: str) -> dict | None:
    for line_name, stations, _ in _all_lines():
        for s in stations:
            if s["id"] == station_id:
                return {**s, "line": line_name}
    return None


async def _get_police_incidents(station_id: str, lat: float, lng: float) -> dict:
    global _police_cache
    cached = _police_cache.get(station_id)
    now = datetime.now(timezone.utc)
    if cached and (now - cached["fetched_at"]).total_seconds() < 3600:
        return cached["data"]

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
        **{f"{ln}_trains": sum(1 for t in _train_cache.values() if t["line"] == ln)
           for ln, _, _ in _all_lines()},
    }


@app.get("/api/live-trains")
def live_trains():
    return {
        "fetched_at": _iso(_last_tfl_fetch),
        "trains": list(_train_cache.values()),
    }


@app.get("/api/line-status")
def line_status():
    return {
        "fetched_at": _iso(_line_status_fetched_at),
        "statuses": _line_status_cache,
    }


@app.get("/api/ghost-stations")
def ghost_stations_endpoint():
    return _ghost_stations


@app.get("/api/gentrification")
def gentrification_endpoint():
    return _gentrification


@app.get("/api/language-map")
def language_map_endpoint():
    return _language_map


@app.get("/api/station/{station_id}")
async def station(station_id: str):
    station_info = _find_station(station_id)
    if station_info is None:
        raise HTTPException(status_code=404, detail="Station not found")

    halo = _halo_colours.get(station_id, {})
    demo = _demographics.get(station_id, {})

    police = await _get_police_incidents(station_id, station_info["lat"], station_info["lng"])

    borough_name = station_info.get("borough") or demo.get("borough")
    lang_data = _language_map.get("boroughs", {}).get(borough_name, {}) if borough_name else {}
    gent_data = _gentrification.get("boroughs", {}).get(borough_name, {}) if borough_name else {}

    return {
        "id": station_info["id"],
        "name": station_info["name"],
        "lat": station_info["lat"],
        "lng": station_info["lng"],
        "zone": station_info["zone"],
        "borough": borough_name,
        "line": station_info.get("line"),
        "halo_hex": halo.get("halo_hex"),
        "wealth_score": halo.get("wealth_score"),
        "font_weight": halo.get("font_weight"),
        "bg_tint": halo.get("bg_tint"),
        "demographics": demo,
        "incident_count": police.get("incident_count"),
        "top_incident_type": police.get("top_incident_type"),
        "dominant_language": lang_data.get("language"),
        "dominant_language_pct": lang_data.get("pct"),
        "income_change_pct": gent_data.get("change_pct"),
        "median_income_2021": gent_data.get("median_2021"),
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
    total_running = len(_train_cache)
    total_scheduled = sum(_scheduled_trains(ln) for ln, stations, _ in _all_lines() if stations)
    ratio = round(total_running / total_scheduled, 2) if total_scheduled else 0.0
    status = "green" if ratio > 0.8 else "amber" if ratio >= 0.5 else "red"
    return {
        "running": total_running,
        "scheduled": total_scheduled,
        "ratio": ratio,
        "status": status,
        **{f"{ln}_running": sum(1 for t in _train_cache.values() if t["line"] == ln)
           for ln, _, _ in _all_lines()},
    }


@app.get("/api/stations")
def stations():
    result = []

    for line_name, station_list, default_halo in _all_lines():
        for s in station_list:
            sid = s["id"]
            halo = _halo_colours.get(sid, {})
            demo = _demographics.get(sid, {})
            result.append({
                "id": sid,
                "name": s["name"],
                "lat": s["lat"],
                "lng": s["lng"],
                "zone": s["zone"],
                "sequence": s.get("sequence", 0),
                "line": line_name,
                "branch": s.get("branch", "main"),
                "borough": s.get("borough") or demo.get("borough"),
                "halo_hex": halo.get("halo_hex", default_halo),
                "wealth_score": halo.get("wealth_score", 0.5),
                "font_weight": halo.get("font_weight", 450),
                "bg_tint": halo.get("bg_tint"),
            })

    return result


@app.get("/api/on-this-day")
async def on_this_day():
    await _refresh_on_this_day()
    return {"date": _on_this_day_date, "events": _on_this_day_cache}


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
                params={"latitude": 51.5074, "longitude": -0.1278, "current_weather": "true"},
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


@app.get("/api/air-quality")
async def air_quality():
    global _air_quality_cache, _air_quality_fetched_at
    now = datetime.now(timezone.utc)
    if _air_quality_fetched_at and (now - _air_quality_fetched_at).total_seconds() < 3600:
        return _air_quality_cache
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                "https://air-quality-api.open-meteo.com/v1/air-quality",
                params={
                    "latitude": 51.5074,
                    "longitude": -0.1278,
                    "hourly": "pm2_5,european_aqi",
                    "forecast_days": 1,
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                hourly = data.get("hourly", {})
                aqi_vals = [v for v in (hourly.get("european_aqi") or []) if v is not None]
                pm25_vals = [v for v in (hourly.get("pm2_5") or []) if v is not None]
                current_aqi = aqi_vals[now.hour] if len(aqi_vals) > now.hour else (aqi_vals[-1] if aqi_vals else 0)
                current_pm25 = pm25_vals[now.hour] if len(pm25_vals) > now.hour else (pm25_vals[-1] if pm25_vals else 0)
                if current_aqi <= 20:
                    category = "good"
                elif current_aqi <= 40:
                    category = "fair"
                elif current_aqi <= 60:
                    category = "moderate"
                elif current_aqi <= 80:
                    category = "poor"
                else:
                    category = "very poor"
                _air_quality_cache = {
                    "aqi": round(current_aqi),
                    "pm2_5": round(current_pm25, 1),
                    "category": category,
                }
                _air_quality_fetched_at = now
    except Exception as exc:
        logger.warning("Air quality API failed: %s", exc)
    return _air_quality_cache or {"aqi": 0, "pm2_5": 0.0, "category": "unknown"}


@app.get("/api/borough-boundaries")
def borough_boundaries():
    return _borough_geojson


@app.get("/api/borough/{borough_name}")
def borough(borough_name: str):
    census = _census_data.get(borough_name, {})
    gla = _gla_data.get(borough_name, {})
    gent = _gentrification.get("boroughs", {}).get(borough_name, {})
    lang = _language_map.get("boroughs", {}).get(borough_name, {})

    facts = []
    for demo in _demographics.values():
        if demo.get("borough") == borough_name:
            for f in demo.get("borough_facts", []):
                if f not in facts:
                    facts.append(f)
            if len(facts) >= 4:
                break

    return {
        "borough": borough_name,
        "population_density_per_km2": census.get("population_density"),
        "median_age": census.get("median_age"),
        "top_languages": census.get("top_languages", []),
        "median_income_gbp": gla.get("median_income"),
        "green_space_pct": gla.get("green_space_pct"),
        "life_expectancy": gla.get("life_expectancy"),
        "employment_rate": gla.get("employment_rate"),
        "borough_facts": facts[:4],
        "dominant_language": lang.get("language"),
        "dominant_language_pct": lang.get("pct"),
        "income_change_pct": gent.get("change_pct"),
        "median_income_2011": gent.get("median_2011"),
        "median_income_2021": gent.get("median_2021"),
        "gentrification_direction": gent.get("direction"),
    }


@app.get("/api/journey")
def journey(from_id: str, to_id: str):
    """Simple BFS journey planner across all lines."""
    # Build adjacency from all line sequences
    graph: dict[str, list[str]] = {}
    station_info: dict[str, dict] = {}

    for line_name, station_list, _ in _all_lines():
        for i, s in enumerate(station_list):
            sid = s["id"]
            if sid not in station_info:
                station_info[sid] = {**s, "line": line_name,
                                     "borough": s.get("borough") or _demographics.get(sid, {}).get("borough")}
            if sid not in graph:
                graph[sid] = []
            if i > 0:
                prev = station_list[i - 1]["id"]
                if prev not in graph[sid]:
                    graph[sid].append(prev)
                if sid not in graph.get(prev, []):
                    graph.setdefault(prev, []).append(sid)

    if from_id not in station_info:
        raise HTTPException(status_code=404, detail=f"Station {from_id} not found")
    if to_id not in station_info:
        raise HTTPException(status_code=404, detail=f"Station {to_id} not found")
    if from_id == to_id:
        return {"route": [from_id], "station_count": 1, "boroughs": [], "income_start": None, "income_end": None}

    # BFS
    from collections import deque
    queue = deque([[from_id]])
    visited = {from_id}
    while queue:
        path = queue.popleft()
        current = path[-1]
        for neighbor in graph.get(current, []):
            if neighbor == to_id:
                full_path = path + [neighbor]
                boroughs = []
                for sid in full_path:
                    b = station_info.get(sid, {}).get("borough")
                    if b and b not in boroughs:
                        boroughs.append(b)
                from_demo = _demographics.get(from_id, {})
                to_demo = _demographics.get(to_id, {})
                income_start = from_demo.get("median_income_gbp")
                income_end = to_demo.get("median_income_gbp")
                income_delta = None
                if income_start and income_end:
                    income_delta = income_end - income_start
                return {
                    "route": full_path,
                    "station_count": len(full_path),
                    "boroughs": boroughs,
                    "borough_count": len(boroughs),
                    "income_start": income_start,
                    "income_end": income_end,
                    "income_delta": income_delta,
                    "from_name": station_info[from_id]["name"],
                    "to_name": station_info[to_id]["name"],
                    "from_borough": station_info[from_id].get("borough"),
                    "to_borough": station_info[to_id].get("borough"),
                    "approx_minutes": (len(full_path) - 1) * 2,
                }
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(path + [neighbor])

    raise HTTPException(status_code=404, detail="No route found between these stations")
