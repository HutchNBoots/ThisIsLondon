# Phase 2 Backlog

Prioritised task list for Claude Code. Work top-to-bottom unless a dependency blocks you — document any blocking decisions in DECISIONS.md and continue with the next unblocked task.

**Autonomy rule:** do not stop for human approval unless you hit one of the four hard-stop conditions in PROJECT.md §2. Everything else: decide, document, ship.

---

## Sprint 1 — District line + data enrichment

These three workstreams can proceed in parallel. Start with M1 (data) because M2 and M3 depend on it.

---

### M1 · Enrich static demographic data (District line boroughs)

**Depends on:** nothing — start here
**Blocks:** M2 (station panel), M3 (District line flare colours)

#### M1a — Download and process ONS language data

1. Download ONS Census 2021 dataset TS024 (main language, detailed) at Local Authority level from `https://www.nomisweb.co.uk/sources/census_2021_bulk`
2. Write a Python script `scripts/process_census.py` that:
   - Reads the TS024 CSV
   - Filters for London borough GSS codes (E09000001–E09000033)
   - Calculates top 3 non-English languages by count per borough
   - Outputs a dict keyed by borough name
3. Also process TS006 (density) and TS007 (age) from the same source
4. Output: `data/census_processed.json` with schema:
```json
{
  "Merton": {
    "population_density": 5811,
    "median_age": 37,
    "top_languages": [
      { "language": "Tamil", "percent": 3.8 },
      { "language": "Polish", "percent": 2.1 },
      { "language": "Urdu", "percent": 1.9 }
    ]
  }
}
```

#### M1b — Download and process GLA Borough Profiles

1. Download the Borough Profiles CSV from `https://data.london.gov.uk/dataset/london-borough-profiles`
2. Write `scripts/process_gla.py` that extracts per borough:
   - Median household income
   - Median house price
   - % green space
   - Life expectancy (male + female, derive a single figure)
   - Employment rate
3. Output: `data/gla_processed.json` with schema:
```json
{
  "Merton": {
    "median_income": 42300,
    "median_house_price": 510000,
    "green_space_pct": 38,
    "life_expectancy": 81.4,
    "employment_rate": 74.2
  }
}
```

#### M1c — Generate editorial borough facts via Claude batch

1. Write `scripts/generate_borough_facts.py` that:
   - Reads `census_processed.json` and `gla_processed.json`
   - Calls the Anthropic API (use `claude-sonnet-4-20250514`) for each borough
   - Prompt: generate 4 editorial sentences about this borough in the voice of "This is London" — precise, slightly poetic, surprising, human. Ground each sentence in a real fact from the provided data or widely known history. Return JSON only.
   - Writes results to `data/borough_facts_generated.json`
2. Human review not required — if any sentence reads as generic or factually vague, the script can re-run that borough with a stricter prompt

**Borough list to generate** (District line boroughs not already in demographics.json):
Hammersmith & Fulham, Kensington & Chelsea, City of London, Tower Hamlets, Newham, Barking & Dagenham, Ealing, Hounslow, Richmond, Wandsworth, Merton, Havering

#### M1d — Merge into demographics.json

1. Write `scripts/merge_demographics.py` that combines:
   - Existing `data/demographics.json` (Victoria line — do not overwrite)
   - `data/census_processed.json`
   - `data/gla_processed.json`
   - `data/borough_facts_generated.json`
   - The station-to-borough mapping from `data/district_stations.json`
2. Output: updated `data/demographics.json` with all District line stations added, following the exact same schema as existing Victoria line entries
3. Sanity check: every District line station must have a `borough_facts` array of at least 3 entries and a `top_languages` array of at least 2 entries

---

### M2 · Enrich station click panel UI

**Depends on:** M1d (demographics.json with District line data)
**Blocks:** nothing — can ship independently once data is ready

#### M2a — Backend endpoint update

Update `GET /api/borough/{borough_name}` (or equivalent existing endpoint) to return the full enriched payload:
```json
{
  "borough": "Merton",
  "population_density": 5811,
  "median_age": 37,
  "top_languages": [...],
  "borough_facts": [...],
  "median_income": 42300,
  "green_space_pct": 38,
  "life_expectancy": 81.4
}
```
Also ensure the Police API call is made at this point (cached 1hr per location) and appended to the response as `incident_count` and `top_incident_type`.

#### M2b — Frontend panel redesign

Expand the station click panel to show three labelled sections. Keep the existing dot-matrix arrivals board at the top — it's the signature visual. Below it, add:

**People section:**
- Population density (X per km²)
- Top 2 non-English languages with percentages
- Median age

**Place section:**
- 2–3 borough facts from `borough_facts` array (rotate through them on each click or show all)
- Wikipedia "On This Day" entry if one exists for today filtered to this borough

**Right now section:**
- Live Police API incident count for the last month
- Top incident category

Keep the panel's sliding-door animation and dot-matrix aesthetic for the arrivals board. The new sections should feel like the same installation — same dark background, same amber/orange type, subtle section separators.

**Do not add scrollbars.** If the content overflows, reduce font size or truncate facts — the panel must feel like a fixed platform display, not a webpage.

#### M2c — Extend Wikipedia "On This Day" keyword filter

Update the backend Wikipedia filter to include District line borough and station keywords. See `DATA_SOURCES.md` for the full `DISTRICT_KEYWORDS` list to add.

---

### M3 · District line as second artery

**Depends on:** M1d (for flare colours and borough facts), M2a (for panel data)
**Can start in parallel:** station coordinate file and TfL integration don't need M1

#### M3a — District line station data file

Create `data/district_stations.json` with all stations from the list in `DATA_SOURCES.md`. Schema should match the existing Victoria line station file exactly:
```json
[
  {
    "name": "Wimbledon",
    "naptan_id": "940GZZLUWIM",
    "lat": 51.4213,
    "lng": -0.2072,
    "borough": "Merton",
    "zone": 3,
    "branch": "Wimbledon"
  }
]
```
Verify NaPTAN IDs via `GET /StopPoint/Search/{name}?modes=tube` before committing. Confirm lat/lng from TfL StopPoint data.

#### M3b — Backend: poll District line arrivals

1. Add `district` to the existing TfL arrivals polling job (or create a parallel scheduler entry)
2. Expose via `GET /api/live-trains?line=district` (or unify both lines in one endpoint)
3. Apply identical position-interpolation logic used for Victoria line
4. In-memory cache only — same 20s refresh

#### M3c — Frontend: render District line on canvas

1. Add District line path geometry to the canvas layer — use the station coordinates from `district_stations.json` to define the artery path segments (one per branch)
2. Bolus colour: use teal/green (`#1D9E75` or similar from the existing palette) to distinguish from Victoria amber. The two lines should feel like different circulatory systems in the same body.
3. Station markers: add District line stations as Leaflet markers with the same click handler as Victoria stations
4. Station label typography: apply the same wealth-signal font-weight logic using the `median_income` field from the enriched demographics data
5. Station flare halo: same colour-encoding as Victoria line (halo colour from ward wealth score)

#### M3d — Map bounds fix

Once District line stations are on the map, auto-fit the Leaflet map bounds to encompass all stations from both lines on load:
```javascript
const allStations = [...victoriaStations, ...districtStations];
const bounds = L.latLngBounds(allStations.map(s => [s.lat, s.lng]));
map.fitBounds(bounds, { padding: [40, 40] });
```
This also fixes the existing bug where Brixton and Walthamstow are cut off.

---

### M4 · Bug fixes (do alongside M3, not after)

| Bug | Fix |
|---|---|
| Map initial zoom cuts off Brixton and Walthamstow | Fixed by M3d map bounds auto-fit |
| Station marker tooltip shape (left-pointing arrow) | Override Leaflet tooltip CSS: `.leaflet-tooltip { border-radius: 4px; } .leaflet-tooltip-left::before, .leaflet-tooltip-right::before { display: none; }` |
| Bolus animation not verified in production | Deploy District line, then do a full visual QA pass: both lines animating, station flares correct colours, panel opens on click, arrivals board updating |

---

## Sprint 2 — Sound + mobile (after Sprint 1 is stable in production)

### M5 · Arrival sound layer

Already designed in PLAN.md §5e. Implement once District line is stable.

- Web Audio API — no library needed
- Victoria line: warm amber tone (A4, ~440Hz, short decay)
- District line: cooler tone (D4, ~294Hz, short decay)
- Triggered when a bolus "arrives" at a station (bolus position reaches station coordinates)
- Volume: low by default (0.15 gain), with a mute/unmute toggle in the UI
- Wrap in `AudioContext.resume()` on first user gesture (browser autoplay policy)

### M6 · Mobile responsive layout

- The panel currently overlaps the map on small screens — make it slide up from the bottom on mobile rather than in from the right
- Station labels: hide on screens < 480px wide, show on tap
- Gauge: hide on mobile, it's a nice-to-have
- Test at 375px (iPhone SE) and 390px (iPhone 15) widths

---

## Sprint 3 — Future art moments (Phase 3 candidates)

These are not committed — evaluate after Sprint 2.

| Idea | What it is | Effort |
|---|---|---|
| Thermal Portrait mode | WebGL shader that re-renders the map as a heat map driven by live crime + demographic data | High |
| Passenger load bolus diameter | Bolus width encodes actual crowding data if TfL exposes it | Medium |
| Real-time weather layer | Subtle background texture changes with Met Office weather data (rain = darker, sun = lighter atmosphere) | Low |
| Multi-station comparison | Click two stations to see a side-by-side borough comparison panel | Medium |
| Night mode / day mode | Automatic palette shift at dawn/dusk based on London sunrise/sunset times | Low |

---

## Definition of done for Sprint 1

Sprint 1 is complete when all of the following are true in the live production environment:

- [ ] District line trains animate on the canvas as teal/green boluses
- [ ] District line station markers appear on the map and are clickable
- [ ] Clicking any District line station opens the panel with arrivals + enriched facts
- [ ] The "People" section shows real language data from ONS Census 2021
- [ ] The "Place" section shows at least 3 borough facts
- [ ] Map auto-fits to show all stations from both lines on load (no cutoffs)
- [ ] Wikipedia "On This Day" filter includes District line borough keywords
- [ ] All Sprint 1 bugs in M4 are resolved
- [ ] DECISIONS.md is updated with any non-trivial choices made during implementation
