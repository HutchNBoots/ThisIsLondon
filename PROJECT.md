# This is London — Project Document

**Status:** Phase 1 complete and live in production. Phase 2 active.
**Last updated:** 2026-06-07

---

## 1. Project overview

"This is London" is a live data art installation that visualises the pulse of London. It blends high-frequency live data (moving underground trains, local incidents) with human data (demographics, language, history, culture) to contrast the physical movement of the city against the social fabric of its communities.

**Live URLs:**
- Frontend: *(Vercel URL — add here)*
- Backend API: `https://thisislondon-production.up.railway.app`

---

## 2. Autonomy rules (unchanged from Phase 1)

Claude Code operates autonomously with one approval gate model. Stop and wait for human input only when:

1. You need a paid API key or credentials not already in Railway env vars
2. You are about to make a destructive change to the live production database or env
3. The plan needs to materially change scope beyond what is described in this document
4. You are genuinely blocked and cannot make reasonable progress on any task

For everything else: make a sensible decision, document it in DECISIONS.md, and keep moving.

---

## 3. Architecture (unchanged)

```
Client (Browser)
  Leaflet map + Canvas bolus animation
  Dot-matrix arrivals panel
  Station click panel (slides in)
        ▲  JSON via HTTP
        ▼
Backend (Python / FastAPI) — Railway.app
  /api/live-trains     → TfL arrivals, cached 20s, in memory
  /api/station/{id}    → TfL stop arrivals, pass-through
  /api/borough/{name}  → static demographic facts from JSON
  APScheduler polling TfL every 20s
        ▲  local reads
        ▼
Static JSON files (committed to repo)
  data/demographics.json   → ward/borough facts, language, history
  data/district_stations.json → station coordinates + borough mapping
```

**Golden rule:** the frontend never calls TfL or any external API directly.

---

## 4. Current feature set (Phase 1 complete)

| Feature | Status |
|---|---|
| Live train positions — Victoria line | ✅ Live |
| Bloodstream canvas animation (amber boluses) | ✅ Live |
| Station flares (demographic halo colour) | ✅ Live |
| Station click panel (slides in like a platform door) | ✅ Live |
| Dot-matrix arrivals board | ✅ Live |
| Neighbourhood facts feed | ✅ Live |
| Wikipedia "On This Day" (London/Underground filtered) | ✅ Live |
| Line pressure gauge (analogue SVG, left edge) | ✅ Live |
| Atmosphere colour shifts (north/south subliminal tint) | ✅ Live |
| Typography wealth signal (label weight by ward wealth) | ✅ Live |
| FastAPI backend on Railway.app | ✅ Live |
| Static demographic data — 16 Victoria line stations | ✅ Live |
| CartoDB Dark Matter base map | ✅ Live |

---

## 5. Phase 2 scope — what to build next

### 5a. District line as second artery (priority: HIGH)

Add the District line as a second animated artery alongside the Victoria line. The District line cuts through the most demographically diverse set of boroughs in London, making it the richest line for the data-art story.

**Boroughs covered:** Hammersmith & Fulham, Kensington & Chelsea, Westminster, City of London, Tower Hamlets, Newham, Ealing, Hounslow, Richmond, Wandsworth, Merton.

**TfL integration:**
- Line ID: `district`
- Endpoint: `/Line/district/Arrivals` — identical pattern to Victoria
- Branch decision: animate all four branch termini (Richmond, Wimbledon, Ealing Broadway, Upminster) from day one. The Wimbledon branch is most important for borough storytelling (Merton).
- Bolus colour: distinguish from Victoria amber — use a cooler teal/green to make the two lines visually distinct on the canvas

**Station data file:** create `data/district_stations.json` with coordinates, TfL stop IDs, and borough mapping for all District line stations. Refer to `DATA_SOURCES.md` for the full station list and borough assignments.

**Map bounds fix:** once District line stations are added, auto-fit map bounds to encompass both lines on load. Currently Brixton and Walthamstow are cut off — this also needs fixing.

### 5b. Enriched station click panel (priority: HIGH)

The station panel currently shows arrivals + a demographic sentence or two. Expand it to a richer "borough portrait" with distinct data layers.

**Target panel structure for each station click:**

```
[ Station name ]  [ Borough ]
[ Dot-matrix arrivals board — unchanged ]

── People ──────────────────────────────
  Population density: X per km²
  Most spoken language after English: Y (Z% of residents)
  Second most spoken: W
  Median age: N years

── Place ───────────────────────────────
  [2–3 curated historical/cultural facts]
  e.g. "The Statutes of Merton (1235) — the oldest statute law
        still on the books — were signed in this borough."

── Right now ───────────────────────────
  [Wikipedia On This Day — filtered for this borough]
  [Live Police API incident count for this area]
```

The "People" and "Place" sections are served from `data/demographics.json` (static, pre-curated). The "Right now" section is live.

**Data sources per section — see `DATA_SOURCES.md` for full detail.**

### 5c. Enriched static data (priority: HIGH — do this before 5a/5b go live)

The existing `data/demographics.json` covers 16 Victoria line stations/wards. Extend it to cover all District line boroughs using the following process:

1. **Download ONS Census 2021 dataset TS024** (main language, detailed) at borough level from `nomisweb.co.uk/sources/census_2021_bulk`. Extract top 3 non-English languages per District line borough.

2. **Download GLA Borough Profiles CSV** from `data.london.gov.uk/dataset/london-borough-profiles`. Extract these fields per borough: population density (persons/km²), median age, employment rate, median house price, life expectancy, % green space.

3. **Curate Wikipedia borough facts** — for each District line borough, write 2–3 editorial sentences in the existing "This is London" voice. Ground every sentence in a verifiable fact (Wikipedia, ONS, or GLA source). Do not invent facts.

4. **Run a Claude batch** to generate the full `borough_facts` array for each station's borough, using the downloaded data as grounding. Output format must match the existing `demographics.json` schema exactly so the frontend panel renders without changes.

5. **Extend the Wikipedia "On This Day" filter** — add District line borough names to the keyword filter: `['Merton', 'Wimbledon', 'Ealing', 'Richmond', 'Barking', 'Tower Hamlets', 'Whitechapel', 'Stepney', 'Hammersmith', 'Fulham', 'Kensington', 'Paddington']`.

### 5d. Known bugs to fix (priority: MEDIUM — fix alongside 5a)

| Bug | Fix |
|---|---|
| Map initial zoom cuts off Brixton and Walthamstow | Auto-fit bounds to all line stations on load |
| Station marker tooltip shape (left-pointing arrow) | CSS override on Leaflet default tooltip |
| Bolus animation not yet verified in production | Visual QA pass after District line deploy |

### 5e. Arrival sound layer (priority: LOW — after 5a/5b)

Web Audio API tones triggered when a bolus "arrives" at a station. Each line has a distinct tone. Volume low by default, toggle in UI. Already designed in PLAN.md §5e — implement after District line is stable.

### 5f. Mobile responsive layout (priority: LOW)

Currently desktop-only. After core Phase 2 features are stable, add responsive breakpoints so the panel and map work on a phone screen.

---

## 6. Art direction (unchanged)

- **Base palette:** CartoDB Dark Matter map, amber boluses for Victoria, teal/green for District
- **Dot-matrix LED board:** glowing amber/orange for arrivals panel — the signature visual
- **Typography:** station label weight varies by ward wealth score (existing behaviour)
- **Demographic halo:** station flare colour encodes ward wealth/deprivation (existing behaviour)
- **Atmosphere tint:** subliminal background colour shifts north/south of the Thames (existing behaviour)
- **Two lines = two circulatory systems** — Victoria and District should feel like arteries in the same body, not two separate maps

---

## 7. Technical stack (unchanged)

- **Backend:** Python / FastAPI on Railway.app with APScheduler
- **Frontend:** Leaflet.js + HTML5 Canvas + Tailwind CSS
- **Map tiles:** CartoDB Dark Matter (free, no token)
- **Data:** Static JSON for demographics, in-memory cache for live TfL data

---

## 8. Infrastructure

| Component | Platform | Cost |
|---|---|---|
| Frontend | Vercel | Free |
| Backend | Railway.app | ~$0–5/month |
| TfL API | api.tfl.gov.uk | Free |
| Map tiles | CartoDB | Free |
| Demographics | ONS/GLA/static JSON | Free |

---

## 9. Decisions log

See `DECISIONS.md` for full autonomous decision log. Key decisions from Phase 1:
- CartoDB over Mapbox (public tokens can't be URL-restricted)
- Railway.app over Vercel for backend (APScheduler needs persistent process)
- Static JSON over SQLite for demographics (sufficient for PoC)
- Victoria line chosen first (short, simple, fully underground)
- District line chosen for Phase 2 (most demographically diverse route)
