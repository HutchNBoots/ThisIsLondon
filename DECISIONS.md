# DECISIONS.md

## 2026-06-07: CartoDB tiles over Mapbox for open-source repo

Confirmed CartoDB Dark Matter tiles (no token) over Mapbox for the PoC. Mapbox public tokens cannot be URL-restricted, making them unsuitable for an open-source public repo.

## 2026-06-07: Sprint 1 (Phase 2 M1–M4) autonomous decisions

### District line bolus colour
Chose `#0eb882` (teal-green) as the District line base colour, matching the official TfL District line colour. Wealth gradient runs dark teal (`#0d6e4e`) → bright cyan-teal (`#00caa8`), mirroring Victoria's amber palette approach.

### District line branching architecture
5 branch sequence arrays (`spine`, `upminster`, `richmond`, `ealing`, `horseshoe`) with priority routing (`upminster > horseshoe > richmond > ealing > spine`). Shared junction stations (Earl's Court, Hammersmith, Turnham Green) are routed to the highest-priority branch that contains the `towards_station_id`. This is an approximation but sufficient for bolus animation — exact branch cannot be determined from TfL API without vehicle tracking.

### Spur opacity
Spur arteries drawn at 50% opacity of spine (`0.08` vs `0.15`) to visually subordinate branches while keeping them legible.

### Borough facts sourcing
Curated ONS 2021 and GLA data from training knowledge rather than downloading CSVs at session time (no outbound network to those sources). Processing scripts (`process_census.py`, `process_gla.py`, `generate_borough_facts.py`, `merge_demographics.py`) written and committed so live data can be ingested in a CI environment. Pre-curated `census_processed.json` and `gla_processed.json` serve as the fallback.

### On This Day — backend proxy
Moved Wikimedia "On This Day" API call from frontend (`main.js`) to backend (`/api/on-this-day` in `main.py`). Reason: PROJECT.md §2 "golden rule" — frontend must never call external APIs directly. Backend caches the result per calendar day.

### Panel layout — static facts, no scroll
Replaced scrolling facts ticker with static `borough_facts` array displayed as `.fact-static` spans. Reason: scrolling was clipping in the panel height constraint and hiding data. Static display with flex column layout is more legible and aligns with the installation aesthetic.

### NaPTAN corrections
- Upton Park: `940GZZLUUPM` (Upminster) → `940GZZLUUPK` (correct)
- Bayswater: `940GZZLUBWR` (Bow Road) → `940GZZLUBWT` (correct)
- Victoria line: 5 wrong IDs corrected in `VICTORIA_SEQUENCE_IDS` (Vauxhall, Euston, Highbury, Seven Sisters, Walthamstow)

### Victoria bolus fix
`rebuildBoluses()` was reading `t.station_id` (undefined) and `t.time_to_station` (undefined). Fixed to `t.towards_station_id` and `t.time_to_station_seconds` to match actual TfL API response shape. This was the root cause of boluses being invisible in production.

### Map auto-fit bounds
Replaced fixed `setView([51.5, -0.12], 11)` with `map.fitBounds()` after all stations load. Prevents Brixton and Walthamstow from being clipped at default zoom.

### halo_colours.json District entries
Added District line halo entries keyed by station ID. Wealth score derived from borough median income (GLA data). Stations sharing a borough share a halo score. Richest: Kensington & Chelsea (`0.90`), Richmond (`0.82`). Poorest: Barking & Dagenham (`0.22`), Newham (`0.24`).

## 2026-06-07: Tile provider and hosting

- **CartoDB Dark Matter tiles** chosen instead of Mapbox for the PoC. No token required, free, looks great on dark maps. Mapbox can be added in Phase 2 with proper domain restrictions.
- **Railway.app** chosen for backend hosting. APScheduler requires a persistent process; Vercel serverless 10s limit is incompatible.
