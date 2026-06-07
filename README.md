# This is London

A live data art installation visualising the pulse of London's Victoria Line.

The Underground is London's circulatory system. This piece renders it as one — amber boluses of light move through a vein-like artery at the speed of real trains. Each station flares with a colour drawn from the demographic makeup of its surrounding ward. Brixton flares differently to Green Park.

**[Live demo →](#)** *(URL added after deploy)*

---

## What you're looking at

- **The artery** — the Victoria Line, drawn as a bezier curve, barely visible amber
- **The boluses** — live train positions, estimated from TfL arrival predictions
- **The flares** — station halos whose colour encodes ward deprivation and wealth
- **The panel** — click any station for live arrivals + neighbourhood micro-facts
- **The gauge** — left edge, line service pressure, no numbers

## Running locally

### Backend
```bash
cd backend
pip install -r requirements.txt
TFL_APP_KEY=your_key_here uvicorn main:app --reload
```

### Frontend
Open `frontend/index.html` in a browser, or serve with any static server:
```bash
npx serve frontend
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `TFL_APP_KEY` | Yes | TfL Unified API key — free at api.tfl.gov.uk |
| `PORT` | Railway only | Set automatically by Railway |

## Data sources

| Source | Used for | Auth |
|---|---|---|
| [TfL Unified API](https://api.tfl.gov.uk) | Live train arrivals | Free API key |
| ONS Census 2021 | Ward demographics (static) | None |
| OpenStreetMap / Overpass | Amenity counts (static) | None |
| Wikipedia REST API | "On This Day" facts | None |
| CartoDB Dark Matter | Map tiles | None |

## Deploying

### Backend → Railway
1. Connect your GitHub repo to Railway
2. Set env var: `TFL_APP_KEY=your_key`
3. Railway auto-detects Python and deploys from `railway.toml`

### Frontend → Vercel
1. Connect your GitHub repo to Vercel
2. Set env var: `BACKEND_URL=https://your-railway-app.railway.app`
3. Vercel deploys the `frontend/` directory as static

## Architecture

```
Browser (Leaflet + Canvas)
        ↕ JSON / 20s polling
FastAPI backend (Railway)
  └─ APScheduler: polls TfL every 20s, caches in memory
  └─ Static JSON: demographics, amenities, halo colours
        ↕
TfL Unified API (never called from browser)
```

## Phase 2

- Thermal Portrait mode (WebGL shader)
- All 11 Tube lines as a full circulatory system
- Bolus diameter encoding real-time passenger load
- Time-lapse replay mode

---

*Built with FastAPI, Leaflet, Canvas 2D, CartoDB tiles, and TfL open data.*
