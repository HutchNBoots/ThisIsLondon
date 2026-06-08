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

## 2026-06-08: All 12 tube lines shipped (Phase 4 sprint)

### New line data files
Created JSON station files for Bakerloo (25 stations), Piccadilly (52), Waterloo & City (2), Hammersmith & City (32), Circle (41), Metropolitan (39), Elizabeth (34). All use `940GZZLU***` NaPTAN IDs except Elizabeth surface stations (`910G***`). Files live in `backend/data/`.

### Shared-station deduplication
Circle/Met/H&C share many stations. Frontend `loadStations()` now skips marker creation if `stationData[station_id]` already exists. Only the first line's data is used for the marker; all lines are available via `stationData` for polyline rendering.

### Per-line toggle design
Implemented as coloured pill buttons (`#line-toggles`) inside `#title-overlay`, not a separate sidebar panel (as PHASE4.md proposed). Rationale: simpler, no extra DOM, consistent with existing control placement. The `lineVisible` state object drives `toggleLine()` which shows/hides both polylines and station markers. localStorage persistence deferred to a future session.

### Sequence IDs for new lines
Rather than exporting from `bloodstream.js`, new line sequences (BAKERLOO_SEQUENCE_IDS, PICCADILLY_SEQUENCE_IDS, etc.) are defined directly in `main.js`. Bloodstream only needs them if bolus animation is added for those lines — keeping them separate avoids coupling until that work starts.

### Bolus animation — new lines not yet animated
Polylines and station markers are rendered for all 12 lines. Bolus animation (`bloodstream.js`) still only processes victoria/district/central/jubilee/northern. Extending to remaining 7 lines is Phase 4 follow-on work.

### Test suite
48 pytest tests: endpoint integration tests (`test_endpoints.py`), TfL client unit tests (`test_tfl.py`), JSON data file validation (`test_data.py`). GitHub Actions CI at `.github/workflows/ci.yml` runs both backend tests and frontend ESM syntax check. Frontend syntax checker fixed to use `node --input-type=module --check` (vm.Script incorrectly rejects ESM import/export).

### ACTIVE_LINES updated to 12
`backend/tfl.py` ACTIVE_LINES now includes all 12 lines. Backend polls TfL arrivals for all 12 every 20s; only lines with parsed boluses are animated in the frontend for now.


- **CartoDB Dark Matter tiles** chosen instead of Mapbox for the PoC. No token required, free, looks great on dark maps. Mapbox can be added in Phase 2 with proper domain restrictions.
- **Railway.app** chosen for backend hosting. APScheduler requires a persistent process; Vercel serverless 10s limit is incompatible.
