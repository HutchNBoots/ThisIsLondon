# PHASE4.md — This is London: Phase 4 Planning Document

**Prepared:** 2026-06-07  
**Status:** Draft for human review  
**Scope:** All remaining tube lines, line visibility controls, new data sources, UX improvements beyond UX_BACKLOG.md, test strategy, and a prioritised ticket list.

---

## 1. Additional Tube Lines

### Overview

Phase 1–3 covers: Victoria, District, Central, Jubilee, Northern.  
Remaining lines: Bakerloo, Circle, Elizabeth, Hammersmith & City, Metropolitan, Piccadilly, Waterloo & City.

### Per-Line Data Requirements

| Line | TfL Line ID | Approx. Stations | Branch Complexity | NaPTAN Format | Effort |
|---|---|---|---|---|---|
| Bakerloo | `bakerloo` | 25 | Simple — single trunk Harrow & Wealdstone → Elephant & Castle | `940GZZLU***` | S |
| Circle | `circle` | 36 | High — circular route sharing track with H&C, District, Met; no terminus | `940GZZLU***` | L |
| Elizabeth | `elizabeth` | 41 | High — branches to Reading/Heathrow/Shenfield; surface + tunnel sections; mix of NaPTAN and ATCO codes | `910G***` (surface), `940GZZLU***` (underground), `9400ZZ***` (crossrail-specific) | L |
| Hammersmith & City | `hammersmith-city` | 29 | Medium — shares track with Circle; branches at both ends | `940GZZLU***` | M |
| Metropolitan | `metropolitan` | 34 | High — 4 branches (Aldgate, Watford, Amersham/Chesham, Uxbridge); longest line | `940GZZLU***` (inner), `9100***` (outer/NR shared) | L |
| Piccadilly | `piccadilly` | 53 | Medium — Heathrow loop/spur plus Cockfosters trunk | `940GZZLU***` (most), `9400ZZLU***` (Heathrow terminals) | M |
| Waterloo & City | `waterloo-city` | 2 | None — shuttle, two stations only | `940GZZLU***` | S |

### Key notes per line

**Bakerloo** — Simplest addition after Waterloo & City. Bolus colour: brown (`#894E24`). 25 stations, clean single sequence, no branching. Ideal first Phase 4 line.

**Waterloo & City** — Only 2 stations (Waterloo, Bank). Animated as a shuttle: bolus bounces between endpoints. Rush-hour only (does not run evenings/Sundays). Backend must check service hours before animating. Effort S, but operationally interesting.

**Piccadilly** — 53 stations makes it the longest underground line. Heathrow loop adds branch logic similar to District. Bolus colour: dark blue (`#003688`). Shares track with District between Acton Town and Hammersmith — requires shared segment deconfliction on canvas.

**Hammersmith & City** — Shares almost all track with the Circle line. Should reuse Circle station JSON and add only unique stations. Bolus colour: pink (`#F3A9BB`).

**Circle** — No terminus: boluses circulate continuously. Backend must model direction of travel. The 20s TfL poll returns `towards_station_id`; direction can be inferred. Bolus colour: yellow (`#FFD329`) — high contrast risk on light tile mode, needs a darker stroke.

**Metropolitan** — Outermost stations (Amersham, Chesham, Uxbridge, Watford) use National Rail-shared track and have different NaPTAN formats. Outer branches should initially render at 50% bolus opacity (lower frequency service). Bolus colour: dark magenta (`#9B0056`).

**Elizabeth** — Largest scope: 41 stations, mixed NaPTAN/ATCO IDs, surface sections that cross Greater London boundary, TfL operates only part of the route. Recommended: Phase 4 implement central section (Paddington to Abbey Wood / Shenfield only), surface branches in Phase 5. Bolus colour: purple (`#6950A1`).

### Shared Track Problem

Circle, H&C, District, and Metropolitan share significant track. On canvas, overlapping boluses from multiple lines will conflict visually. Recommended approach: draw each line's bolus slightly offset from centre using a per-line canvas Y offset (`±3px` perpendicular to travel direction). This is an approximation but avoids visual pile-up.

---

## 2. Line On/Off Switches

### Design

Users should be able to hide any line's boluses and polyline independently. This reduces visual noise once 8+ lines are active.

### UI placement

**Mobile** — Add a "LINES" toggle button to the existing bottom bar (between the current toggles). Tapping LINES opens a compact full-width drawer above the bottom bar. The drawer shows one pill per line, labelled with the line abbreviation and coloured with the line's palette colour. Active lines are fully opaque; hidden lines are 30% opacity.

**Desktop** — A collapsible sidebar panel on the right edge (mirror image of the left pressure gauge). Shows all lines as labelled coloured swatches. Click to toggle. Panel header: `LINES`. Collapses to a thin coloured strip when closed.

**Interaction with station toggle** — When a line is hidden, its station markers remain visible (they serve multiple lines). Only hide markers that belong exclusively to that line. If a station is served by at least one visible line, it stays on map. If a station is served only by hidden lines, hide it.

### Data structure

```js
// frontend/main.js — add to state section
const lineVisibility = {
  victoria: true,
  district: true,
  central: true,
  jubilee: true,
  northern: true,
  bakerloo: true,
  circle: true,
  elizabeth: true,
  'hammersmith-city': true,
  metropolitan: true,
  piccadilly: true,
  'waterloo-city': true,
};
```

### JS API

```js
// Set a single line's visibility
function setLineVisible(lineId, visible) {
  lineVisibility[lineId] = visible;
  // 1. Show/hide polyline layer
  const entry = tubePolylines.find(p => p.line === lineId);
  if (entry) visible ? map.addLayer(entry.layer) : map.removeLayer(entry.layer);
  // 2. Update bloodstream — suppress boluses for hidden lines
  updateBloodstreamVisibility(lineVisibility);
  // 3. Recompute station marker visibility
  recomputeMarkerVisibility();
  // 4. Persist to localStorage
  localStorage.setItem('lineVisibility', JSON.stringify(lineVisibility));
}

// Restore on load
function restoreLineVisibility() {
  const saved = localStorage.getItem('lineVisibility');
  if (saved) Object.assign(lineVisibility, JSON.parse(saved));
}
```

`bloodstream.js` receives the visibility map and skips rendering boluses for hidden lines. `recomputeMarkerVisibility()` iterates `stationMarkers` and checks if any active line serves that station.

### Persistence

Line visibility is persisted to `localStorage` so installation mode (always showing all lines) works without cookies, but a returning visitor on a phone retains their preferences.

---

## 3. New Data Sources

Minimum 10. Grouped by theme.

| # | Source | What it shows | API / Endpoint | Auth | Update freq | Maps to network how | Effort |
|---|---|---|---|---|---|---|---|
| 1 | **TfL Crowding API** | Relative crowding per station by hour (historical model) | `api.tfl.gov.uk/crowding/{naptan}/Live` | TfL app_key | Hourly (live available rush hour) | Colour-codes station marker intensity: full = bright, empty = dim | S |
| 2 | **TfL Bike Point** | Live availability of Santander Cycles docks near stations | `api.tfl.gov.uk/BikePoint` | None (free) | 60s | Shows bike availability dot badge on station panel for nearest dock | S |
| 3 | **Police Data API — Stop & Search** | Stop-and-search incidents by borough, rolling month | `data.police.uk/api/stops-street?lat=&lng=&date=` | None | Monthly | Heat value per borough, shown in gentrification-style overlay | M |
| 4 | **Police Data API — Street Crime** | Crime category counts by lat/lng | `data.police.uk/api/crimes-street/all-crime?lat=&lng=&date=` | None | Monthly | New overlay mode: crime density heatmap per borough | M |
| 5 | **DEFRA Air Quality Index** | Hourly NO₂/PM2.5 readings at monitoring stations | `api.erg.kcl.ac.uk/ERG/AirQuality/...` | None | Hourly | Map monitoring stations; interpolate AQI to nearest tube station; show in Right Now panel | M |
| 6 | **OpenStreetMap Overpass — Pubs** | Count of licensed premises within 250m of each station | Overpass API `overpass-api.de/api/interpreter` | None | Static (weekly refresh) | "Pub density" fact in Place section; bonus detail for cultural layer | S |
| 7 | **Eventbrite Public Events** | Live events near each station within 7 days | `api.eventbrite.com/v3/events/search/?location.latitude=` | OAuth2 (free tier) | On demand / cached 1h | Right Now panel: "N events near here this week" | M |
| 8 | **ONS Nomis — Unemployment** | Claimant count rate by local authority, quarterly | `api.nomis.co.uk/v1/...` | None | Quarterly | Economic overlay mode: unemployment rate per borough; blue-to-red diverging scale | M |
| 9 | **Historic England Listed Buildings** | Grade I/II listed building count per borough | `historicengland.org.uk/listing/the-list/` (static CSV) | None | Annual | "Listed buildings" count in Place section; bonus heritage layer | S |
| 10 | **Airbnb Insideairbnb** | Short-term rental density per borough (proxy for housing pressure) | `insideairbnb.com/get-the-data/` (static CSV monthly) | None | Monthly | Supplement gentrification overlay: Airbnb density as secondary signal | S |
| 11 | **TfL Step-Free Access** | Which stations have step-free access to platform | `api.tfl.gov.uk/StopPoint/{id}/AccessibilityClaims` | None | Infrequent | Badge on station marker; filter in journey planner | S |
| 12 | **Wikimedia Commons — Station Photos** | Historic / current photos of station | `commons.wikimedia.org/w/api.php?action=query&titles=...` | None | Static | Image in station panel header — cultural enrichment | M |
| 13 | **Transport Stats — Annual Entries/Exits** | Annual passenger counts per station (TfL open data) | Static CSV from `tfl.gov.uk/corporate/publications-and-reports/` | None | Annual | Scale station marker size by annual entries — busiest stations visually largest | S |
| 14 | **London Datastore — House Prices** | Median house price per borough, Land Registry data | `data.london.gov.uk/api/action/datastore_search` | None | Quarterly | Supplement gentrification overlay; hover tooltip on borough shows median price | S |
| 15 | **Met Office Weather API** | Current temperature and conditions at central London | `datahub.metoffice.gov.uk/` | API key (free) | Hourly | Modulate atmosphere tint intensity with temperature: hot days redder tint | M |

---

## 4. UX Improvements Beyond Existing Backlog

The following are net-new ideas not present in UX_BACKLOG.md (UX-001 through UX-087).

| # | Idea | Category | Rationale |
|---|---|---|---|
| N-01 | **First-use curtain with 3-second animated line reveal** — on very first visit (no localStorage), draw each tube line polyline sequentially with a stroke-dasharray animation, one line every 0.4s, before boluses start. Creates an "awakening London" effect. | Onboarding | Sets art context before user touches anything. |
| N-02 | **Tooltip on line polyline** — hovering or tapping a tube line polyline (not a station) shows a minimal tooltip: line name + current status severity. Gives users who miss station markers a way in. | Information density | Reduces "nothing to click" confusion at low zoom. |
| N-03 | **Line-specific sound themes** — each tube line has its own tone cluster in Web Audio (already planned as "arrival sound" but extend to ambient: Jubilee = low industrial hum, Victoria = higher frequency pulse). Sound toggles per-line if sound is enabled. | Animation polish | Deepens the "circulatory system" metaphor. |
| N-04 | **"Last updated" pulse on data panel** — the arrivals board shows a faint `●` pulse every time fresh data arrives from backend (every 20s). Confirms liveness without adding text. | Information density | Reassures viewers the installation is live. |
| N-05 | **Zoom-to-line button on line selector** — in the line visibility drawer/sidebar, each line has a small locate icon. Tapping it flies the map to a bounds fit for that line's stations (similar to `map.fitBounds` on load). | Line switching | Solves "I toggled a line but can't see it" UX problem. |
| N-06 | **Borough spotlight mode** — clicking a borough name in the station panel highlights that borough with a brighter fill and dims all others. Escape or re-click dismisses. Contextualises the station within its neighbourhood. | Panel information architecture | Makes geography tangible without a separate overlay mode. |
| N-07 | **Journey planner waypoint count badge** — when journey mode is active, show a badge on the map counting stops remaining in the route. Updates as boluses pass through route stations (metaphor: tracking progress). | Animation polish | Deepens journey planner as a data-art experience. |
| N-08 | **Interchange station expanded panel** — clicking an interchange station shows arrival boards for all lines serving it, tabbed by line colour. Currently only the primary line arrivals are shown. | Panel information architecture | Correct behaviour for King's Cross (6 lines), Liverpool Street (4 lines), etc. |
| N-09 | **Ghost station "why closed" tooltip** — hovering a ghost station shows a one-line explanation (e.g. "Closed 1940 — Blitz damage, never reopened"). Data from a static `ghost_stations.json`. | Onboarding | Ghost stations generate curiosity; this rewards it without opening a full panel. |
| N-10 | **Bolus speed visual legend** — a micro-legend (bottom right, 3 lines) explaining the bolus metaphor: "● = live train  trail = direction of travel  speed = time to next station". Shown only on first visit, dismissible. | Onboarding | The bolus concept is not self-evident; this bridges it once. |
| N-11 | **Line pressure gauge per-line breakdown** — the existing SVG gauge shows total network pressure. Add a secondary readout showing each active line's individual pressure as a small horizontal bar chart below the gauge. | Information density | Gives installation visitors something to watch change over time. |
| N-12 | **"Night mode" automatic at 23:00–05:30 local time** — reduce bolus count to max 10, dim all panel lighting further (`--accent` at 40% opacity), show a `NIGHT SERVICE` overlay. Reflects actual TfL night tube operation. | Animation polish | Mirrors real-world tube cadence; creates a distinct nocturnal aesthetic. |
| N-13 | **Station search bar** — a minimal text input (desktop only, keyboard shortcut `/` to focus) that filters station markers by name and flies to the matching station. Useful for presentation / demo mode. | Panel information architecture | Reduces reliance on knowing where stations are at low zoom. |
| N-14 | **"This line stops here" visual indicator during line hide** — when a user hides a line, affected exclusive stations briefly flash a grey fade-out animation (200ms) before disappearing, so users understand what changed. | Line switching | Prevents confusion when stations vanish silently. |
| N-15 | **Arrival count sparkline** — the pressure gauge area could show a 1-hour sparkline of train arrival counts (stored in a rolling 180-slot array, updated every 20s). Shows rhythm: peaks at rush hour, troughs mid-afternoon. | Information density | Turns the gauge into a temporal story, not just a snapshot. |
| N-16 | **Borough-to-borough comparison mode** — extend existing compare mode to support two boroughs side-by-side (not just two stations). Shows demographic delta table: population density, median age, top language, house price. | Panel information architecture | Useful for data storytelling at exhibitions. |
| N-17 | **Bolus trail colour fade by line age** — trains that are older in the TfL data (higher `time_to_station_seconds`) render with a slightly cooler/desaturated trail compared to imminent arrivals. Encodes urgency visually within the same line's colour family. | Animation polish | Adds a temporal dimension to the existing spatial animation. |
| N-18 | **Offline graceful degradation** — if the backend becomes unreachable (Railway downtime), show a subtle `SIGNAL LOST` banner and freeze boluses at last known position rather than clearing the canvas. | Onboarding | Installation context: visitors should see something, not a blank map. |
| N-19 | **Accessibility: high-contrast mode** — detect `prefers-contrast: more` and switch to a high-contrast palette: white polylines on black map, no opacity gradients, boluses rendered as solid coloured circles with white border. | Panel information architecture | Extends installation reach to visitors with visual impairments. |
| N-20 | **Cursor-follows-bolus demo mode** — an optional "tour mode" where the map auto-pans to follow a selected bolus as it travels along its line, with the station panel opening automatically at each stop. Triggered by a hidden keyboard shortcut (`T`). | Animation polish | Exhibition / demo use case: dramatic automated walk-through. |

---

## 5. Test Strategy

### 5.1 Backend: pytest unit tests

| Test target | File | What to assert |
|---|---|---|
| `TfLClient._get_line_arrivals` | `backend/tfl.py` | Returns `[]` on HTTP error, not an exception; correctly parses JSON list |
| `TfLClient.get_all_arrivals` | `backend/tfl.py` | Returns dict keyed by all `ACTIVE_LINES`; failed lines return `[]` not missing key |
| `TfLClient.get_line_status` | `backend/tfl.py` | Returns one entry per line; `disrupted=True` when `severity < 10`; reason truncated at 200 chars |
| `TfLClient.get_on_this_day` | `backend/tfl.py` | Only London-keyword-matched events returned; handles empty `events` list |
| `LONDON_KEYWORDS` coverage | `backend/tfl.py` | Each currently active line's key borough names are present in the keyword list |
| Backend polling cache | `backend/main.py` | After APScheduler fires, `/api/live-trains` returns data matching mock TfL response |
| `/api/borough/{name}` | `backend/main.py` | Returns 404 for unknown borough; returns correct JSON schema for known borough |
| `/api/station/{id}` | `backend/main.py` | Proxies TfL correctly; returns empty arrivals list on TfL failure without 500 |
| Station JSON validation | `data/*.json` | All station entries have `id`, `lat`, `lon`, `borough` fields; no null coordinates |

Use `pytest-asyncio` for async TfLClient methods. Mock `httpx.AsyncClient` with `respx` to avoid live TfL calls in CI.

### 5.2 Frontend: pure functions testable without a browser

These functions have no DOM or Leaflet dependencies and can be tested with Vitest or Jest in Node:

| Function | File | Test what |
|---|---|---|
| `getPolylineWeight(zoom)` | `frontend/main.js` | Returns correct weight at zoom 10, 13, 16 boundary values |
| `getRoundelCircleSize(zoom)` | `frontend/main.js` | Returns expected sizes at key zoom levels; no value below 0 |
| Bolus branch routing (towards_station → branch selection) | `frontend/bloodstream.js` | Given `towards_station_id` for each District branch terminal, returns the correct branch array |
| `setLineVisible(lineId, visible)` — state mutation only | `frontend/main.js` | `lineVisibility[lineId]` is set correctly; `localStorage.setItem` is called with serialised state |
| `cullLabels()` — label count logic | `frontend/main.js` | With 10 markers in bounds, output count ≤ 8; interchange markers have priority |
| Wealth-weight clamp | wherever computed | `computeWeightFromWealthScore(score)` returns value in [300, 600] for any input in [0,1] |
| Journey BFS route | `frontend/main.js` or dedicated module | BFS from Brixton to Walthamstow returns a valid path; disconnected stations return null |
| `MAX_BOLUSES` culling | `frontend/bloodstream.js` | Given 50 trains, only 40 are retained; retained are most recently updated |
| Air quality colour mapping | wherever AQI is computed | AQI index 1 maps to green family, index 6 maps to red family |

### 5.3 Integration / E2E scenarios

These require a real browser (Playwright recommended):

| Scenario | Why it matters |
|---|---|
| Page loads → map renders → boluses appear within 5s | Core happy path; regression catch for backend polling timing |
| Click station at zoom 12 → panel opens with arrivals board | Most-used interaction; validates panel/backend wiring |
| Click station at zoom 11 → panel does NOT open | UX-048 guard |
| Toggle a line off → polyline disappears, exclusive station markers disappear | Line visibility system |
| Escape key closes open panel | UX-014 |
| Swipe down on mobile station panel → panel closes | UX-070 |
| Network offline → SIGNAL LOST banner shown, canvas not blank | N-18 graceful degradation |
| `prefers-reduced-motion: reduce` → boluses static | UX-066 |
| Open Language Portrait → Gentrification auto-deactivates | UX-023 |
| Journey planner: select two stations → route polyline drawn | Journey planner regression |

### 5.4 CI: recommended GitHub Actions jobs

```yaml
jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -r backend/requirements.txt pytest pytest-asyncio respx
      - run: pytest backend/tests/ -v

  frontend-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run test:unit   # Vitest, no browser

  e2e:
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-unit]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci && npx playwright install --with-deps chromium
      - run: npm run test:e2e    # starts local dev server, runs Playwright
    env:
      BACKEND_URL: http://localhost:8000   # or mock server
```

Aim: backend tests < 30s, frontend unit tests < 15s, E2E < 3 minutes. E2E runs only on `main` branch pushes and PR merges, not on every commit.

---

## 6. Phase 4 Ticket List

| ID | Title | Category | Priority | Effort | Dependencies |
|---|---|---|---|---|---|
| P4-001 | Add Bakerloo line — stations JSON, sequence, bolus colour | Lines | P1 | S | — |
| P4-002 | Add Waterloo & City line — shuttle animation, service hours guard | Lines | P1 | S | — |
| P4-003 | Add Piccadilly line — stations JSON, Heathrow branch routing | Lines | P1 | M | P4-001 |
| P4-004 | Add Hammersmith & City line — reuse Circle station data | Lines | P2 | M | P4-005 |
| P4-005 | Add Circle line — circular bolus routing, no terminus logic | Lines | P2 | L | — |
| P4-006 | Add Metropolitan line — 4 branches, outer NaPTAN format handling | Lines | P2 | L | — |
| P4-007 | Add Elizabeth line — central section only (Paddington–Abbey Wood/Shenfield) | Lines | P3 | L | P4-006 |
| P4-008 | Shared track canvas offset — prevent bolus pile-up on shared segments | Lines | P2 | M | P4-004, P4-005 |
| P4-009 | Extend `ACTIVE_LINES` and `LONDON_KEYWORDS` for all new lines | Backend | P1 | S | P4-001 |
| P4-010 | Extend `halo_colours.json` with new line station entries | Data | P1 | S | P4-001, P4-003 |
| P4-011 | Extend `demographics.json` for new line boroughs | Data | P1 | M | P4-001 |
| P4-012 | Line visibility state + `setLineVisible()` JS API | UI | P1 | M | — |
| P4-013 | Line selector drawer — mobile bottom bar LINES toggle | UI | P1 | M | P4-012 |
| P4-014 | Line selector sidebar — desktop right-edge collapsible panel | UI | P2 | M | P4-012 |
| P4-015 | Zoom-to-line button in line selector | UI | P2 | S | P4-013 |
| P4-016 | Station marker visibility when line hidden — exclusive vs interchange logic | UI | P1 | S | P4-012 |
| P4-017 | Persist line visibility to localStorage | UI | P2 | S | P4-012 |
| P4-018 | "Line stops here" flash animation on line hide | UI | P3 | S | P4-012 |
| P4-019 | TfL Crowding API — station crowding colour intensity | Data | P2 | S | — |
| P4-020 | TfL Bike Point — nearest dock availability in station panel | Data | P3 | S | — |
| P4-021 | Police Data API — stop & search borough overlay | Data | P2 | M | — |
| P4-022 | DEFRA Air Quality — AQI per station, Right Now panel | Data | P2 | M | — |
| P4-023 | ONS Nomis — unemployment rate economic overlay mode | Data | P3 | M | — |
| P4-024 | London Datastore — house prices supplement to gentrification overlay | Data | P2 | S | — |
| P4-025 | TfL Step-Free Access badge on station markers | Data | P2 | S | — |
| P4-026 | Annual station entries/exits — scale marker size | Data | P3 | S | — |
| P4-027 | First-use animated line reveal (curtain with sequential polyline draw) | Onboarding | P2 | M | — |
| P4-028 | Bolus speed visual legend — first visit only, dismissible | Onboarding | P2 | S | — |
| P4-029 | Ghost station "why closed" tooltip from static JSON | Onboarding | P2 | S | — |
| P4-030 | Offline graceful degradation — SIGNAL LOST banner + frozen boluses | UX | P2 | M | — |
| P4-031 | Interchange station expanded panel — tabbed arrivals by line | UX | P2 | L | P4-008, UX-050 |
| P4-032 | Line polyline hover/tap tooltip — line name + status | UX | P2 | S | — |
| P4-033 | Station search bar (desktop, `/` shortcut) | UX | P3 | M | — |
| P4-034 | Night mode — auto at 23:00–05:30, reduced boluses, dimmed chrome | UX | P3 | M | — |
| P4-035 | Arrival count sparkline in pressure gauge area | UX | P3 | M | — |
| P4-036 | Accessibility: high-contrast mode for `prefers-contrast: more` | UX | P2 | M | — |
| P4-037 | Set up pytest backend test suite with respx mocks | Testing | P1 | M | — |
| P4-038 | Set up Vitest frontend unit test suite | Testing | P1 | M | — |
| P4-039 | Playwright E2E: page load → boluses appear within 5s | Testing | P1 | S | P4-037, P4-038 |
| P4-040 | Playwright E2E: station panel open/close + Escape key | Testing | P1 | S | P4-039 |
| P4-041 | Playwright E2E: line visibility toggle | Testing | P2 | S | P4-012, P4-039 |
| P4-042 | Playwright E2E: offline graceful degradation | Testing | P2 | S | P4-030, P4-039 |
| P4-043 | GitHub Actions CI: backend + frontend unit + E2E jobs | Testing | P1 | S | P4-037, P4-038, P4-039 |

### Ticket count: 43 tickets across Lines, Backend, Data, UI, UX, Onboarding, Testing.

### Recommended Phase 4 sprint order

**Sprint 1 (foundations):** P4-001, P4-002, P4-009, P4-010, P4-037, P4-038, P4-043  
**Sprint 2 (lines + visibility):** P4-003, P4-005, P4-011, P4-012, P4-013, P4-016, P4-039, P4-040  
**Sprint 3 (data + UX):** P4-004, P4-006, P4-008, P4-019, P4-022, P4-024, P4-027, P4-030  
**Sprint 4 (polish + stretch):** P4-007, P4-014, P4-017, P4-021, P4-023, P4-025, P4-031, P4-036, P4-041, P4-042  
**Sprint 5 (delight):** P4-018, P4-020, P4-026, P4-028, P4-029, P4-032, P4-033, P4-034, P4-035  

---

## 7. Known Bugs to Fix in Phase 4

| ID | Bug | Root Cause | Fix Approach |
|---|---|---|---|
| BUG-001 | Borough overlays (LANG/GENT) never render | `boroughLayer` not created — static GeoJSON loads but Leaflet `L.geoJSON()` style function may conflict with `applyBoroughOverlay()` `setStyle()` call; or borough name keys don't match GeoJSON `NAME` property exactly | Add console logging to `applyBoroughOverlay()` to confirm iteration count and name matches; add a visible debug indicator when layer has 0 matched features; cross-check all 33 borough names against both JSON data files |
| BUG-002 | Lines invisible in light mode on first load | `polylineStyle()` reads `document.body.classList` at draw time but light mode class may not be set yet when `drawTubePolylines()` runs | Call `applyPolylineMode()` after a short `setTimeout` post draw, or read mode from a module-level variable set before station load |
| BUG-003 | Mobile bottom bar overlaps slide-up panel content | Panel `padding-bottom` calculation doesn't account for iOS safe area on all devices | Test on iPhone 14 Pro (Dynamic Island); may need larger `env(safe-area-inset-bottom)` value |

---

## 8. Wild Features (Brainstorm)

Five deliberately ambitious, unconventional ideas. Not constrained by effort or feasibility. Meant to spark discussion.

---

### WILD-001 — Tube Séance: Time-Travel the Network

**The idea:** A timeline scrubber (1863 → present) that morphs the map to show the tube network as it existed in any given year. Stations appear and disappear. Lines grow in real time as you drag the slider — the Metropolitan opening in 1863, the Jubilee Extension appearing in 1999. 

**Why it's wild:** Requires a complete historical dataset of every station opening/closure date, every line extension. Boluses animate on the historically-correct topology, not today's. The map itself visually ages — sepia at 1863, faded colour by 1950, full colour by 1980.

**Data source:** Wikipedia / TfL historical records; partially available via Wikidata SPARQL queries. Station opening dates scraped from structured data.

**Technical hook:** `YEAR_FILTER` state variable; station JSON gains `opened_year` and `closed_year` fields; `drawTubePolylines()` filters by year; `stationMarkers` toggled by year range.

---

### WILD-002 — The Commuter Genome

**The idea:** Every line segment between two adjacent stations has a "genome" — a fingerprint of who statistically travels it. Age distribution, income band, top profession, dominant language, average commute time. Click any segment between two stations and see a side-by-side portrait of the people moving through that exact stretch of tunnel.

**Why it's wild:** It makes invisible social geography physical. The 1.5 minutes between Bank and London Bridge is one of the sharpest class transitions in the city. You can feel the city's social fault lines as tube segments.

**Data source:** ONS Census 2021 travel-to-work flows, TfL Oyster anonymised journey data (published annually), LSOA-level income/occupation data.

**Technical hook:** Edge-level data structure (not station-level); segment clicked via nearest-point-on-polyline calculation; panel shows demographic bar charts rendered on canvas.

---

### WILD-003 — Heartbeat City

**The idea:** The bolus animation speed and density is driven by the actual live heartbeat of the city — not just train data, but layered rhythms. At 08:45 the network pulses fast. At 14:30 it slows. At 23:00 it fades to almost nothing. Emergency events (terrorism alerts, strikes, major incidents) trigger a visual shock — all boluses freeze, then restart slowly.

Underneath, a slow sine-wave "breath" shifts the atmosphere tint over 24 hours: dawn is rose-gold, midday is bleached white, evening turns deep amber, night collapses to near-black.

**Why it's wild:** Transforms a data viz into something genuinely felt. The map becomes a living organism with circadian rhythms.

**Data source:** TfL aggregate entry/exit counts by hour (published as open data, updated daily). Historical hourly patterns used as a baseline; live data overlaid when available. Time-of-day drives the base animation; actual train density modulates it.

**Technical hook:** `CITY_RHYTHM` lookup table keyed by hour; `bolus.speed` multiplier derived from rhythm × actual train count; atmosphere tint interpolated on a 24-point colour gradient.

---

### WILD-004 — Tube Orchestra

**The idea:** Every line is an instrument. Victoria is a cello — deep, smooth, north-south. Northern is a double bass. Central is a trumpet cutting east-west. District is a violin section, sprawling and branching. Jubilee is a muted horn.

Every time a bolus crosses a station, it plays a note. The pitch is determined by the station's position on the line (terminus = low, midpoint = high). Density of trains = volume. Disruptions introduce dissonance — a scraping string, a missed beat.

You can listen to London commute.

**Why it's wild:** Pure synesthesia. The audio layer becomes a real-time sonic portrait of the city's movement. Rush hour sounds like an orchestra tuning up. 3am sounds like a single cello note.

**Data source:** Web Audio API (no external data needed). Existing TfL train positions drive the audio engine. Station sequence position maps to MIDI note on a pentatonic scale (avoids dissonance).

**Technical hook:** Extend `playArrivalTone()` in `bloodstream.js` into a full `TubeOrchestra` class; each line gets an `OscillatorNode` with distinct waveform and envelope; station position on sequence maps to frequency via `lerp(rootNote, rootNote * 2, seqPosition / seqLength)`.

---

### WILD-005 — The Invisible City: Dead Drops and Secret Stations

**The idea:** Unlock a hidden layer — accessible only by entering a code or shaking the phone — that reveals things the official map doesn't show. Churchill's wartime bunker connected to Down Street. The MI6 tunnels under Vauxhall. The Mail Rail running parallel to the Central Line. The dead letter drops and cache points used during Cold War London.

Layer on modern urban mythology: the "ghost frequency" between stations (real electromagnetic anomalies reported by drivers), the spots where the underground floods in heavy rain, the maintenance shafts that open onto ordinary streets.

**Why it's wild:** Turns the data art piece into an alternate reality game. People share the unlock code. Each visit might reveal something different — a new "discovered" location, a redacted document, a sound recording from deep in the tunnel.

**Data source:** Historic England Listed Buildings API, Wikipedia/Wikidata for historical locations, crowd-sourced urban exploration community data (with permission). Some content hand-authored for dramatic effect.

**Technical hook:** `UNLOCKED` localStorage flag; shake detection via `DeviceMotionEvent`; `ghost-layer` separate Leaflet pane at z-index 500; marker icons use a distinct "classified document" aesthetic with redaction bars.

---

| ID | Wild Feature | Wow Factor | Effort | Data Available |
|---|---|---|---|---|
| WILD-001 | Tube Séance — time-travel the network | ★★★★★ | XL | Partial (Wikidata) |
| WILD-002 | Commuter Genome — social fingerprint of every segment | ★★★★★ | L | Yes (ONS/TfL) |
| WILD-003 | Heartbeat City — circadian rhythm animation | ★★★★☆ | M | Yes (TfL open data) |
| WILD-004 | Tube Orchestra — the network as live music | ★★★★☆ | M | No external needed |
| WILD-005 | Invisible City — secret layers and dead drops | ★★★★★ | L | Partial + hand-authored |

---

*End of PHASE4.md*
