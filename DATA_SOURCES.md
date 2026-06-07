# Data Sources Reference

All data sources used in "This is London", with access details, update frequency, caching strategy, and what each source powers in the UI.

---

## Live APIs (backend-polled, never called from client)

### TfL Unified API — Train arrivals

| Field | Detail |
|---|---|
| Base URL | `https://api.tfl.gov.uk` |
| Victoria line | `GET /Line/victoria/Arrivals` |
| District line | `GET /Line/district/Arrivals` |
| Both lines | `GET /Line/victoria,district/Arrivals` |
| Station arrivals | `GET /StopPoint/{naptanId}/Arrivals` |
| Line status | `GET /Line/victoria,district/Status` |
| Auth | API key via `app_key` query param (set in Railway env var `TFL_API_KEY`) |
| Update frequency | Every 20 seconds via APScheduler |
| Cache strategy | In-memory only — never persisted to disk |
| Free tier | Yes — generous rate limits on free registration |
| Docs | `https://api.tfl.gov.uk` (Swagger UI) |

**What it powers:** animated boluses on the canvas, dot-matrix arrivals board in the station panel, line pressure gauge.

**District line branch IDs** (for filtering arrivals by branch):
- `district` — full line, all branches
- Wimbledon branch terminates at `940GZZLUWIM` (Wimbledon)
- Richmond branch terminates at `940GZZLURIC` (Richmond)
- Ealing Broadway terminates at `940GZZLUEBY` (Ealing Broadway)
- Upminster terminates at `940GZZLUUPM` (Upminster)

---

### TfL Line Status API

| Field | Detail |
|---|---|
| Endpoint | `GET /Line/victoria,district/Status` |
| Update frequency | Every 60 seconds (less critical than arrivals) |
| Cache strategy | In-memory |
| Severity codes | 10 = Good service, 6 = Severe delays, 5 = Part suspended, etc. |

**What it powers:** planned — arrhythmia effect on animation when service is disrupted (currently using static threshold).

---

### UK Police API — Street-level crime

| Field | Detail |
|---|---|
| Base URL | `https://data.police.uk/api` |
| Endpoint | `GET /crimes-at-location?lat={lat}&lng={lng}&date={YYYY-MM}` |
| Auth | None required |
| Update frequency | Once per user session (cached 1 hour) |
| Data lag | ~2 months behind current date |
| Free tier | Yes, no key needed |
| Docs | `https://data.police.uk/docs/` |

**What it powers:** "Right now" section in station panel — live incident count for the station area. Also planned for arrhythmia effect (bolus irregularity when crime count is elevated).

**Usage note:** pass the station's lat/lng coordinates. The API returns incidents within a radius. Sum all crime categories for a total count and pick the top category by volume for display.

---

### Wikimedia "On This Day" API

| Field | Detail |
|---|---|
| Base URL | `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/all` |
| Endpoint | `GET /onthisday/all/{MM}/{DD}` |
| Auth | None required (polite: add `User-Agent` header with project name) |
| Update frequency | Once per day (date changes at midnight) |
| Cache strategy | Cache result for the day |
| Free tier | Yes |

**Filter logic for "This is London":** from the returned events array, keep only entries whose `text` field contains at least one keyword from the borough/line filter list. Current Victoria line filter:
```python
VICTORIA_KEYWORDS = [
    'London', 'Underground', 'Victoria', 'Brixton', 'Stockwell',
    'Oval', 'Vauxhall', 'Pimlico', 'Westminster', 'Green Park',
    'Oxford Circus', 'Warren Street', 'Euston', 'King\'s Cross',
    'Highbury', 'Finsbury', 'Seven Sisters', 'Tottenham', 'Walthamstow'
]
```

**Add these keywords for District line stations and boroughs:**
```python
DISTRICT_KEYWORDS = [
    'District', 'Hammersmith', 'Fulham', 'Kensington', 'Chelsea',
    'Paddington', 'Whitechapel', 'Stepney', 'Tower Hamlets', 'Mile End',
    'Bow', 'Barking', 'Dagenham', 'Upminster', 'Ealing', 'Acton',
    'Richmond', 'Putney', 'Wimbledon', 'Merton', 'Wandsworth',
    'Earls Court', 'Earl\'s Court', 'Gloucester Road', 'South Kensington',
    'Sloane Square', 'Embankment', 'Temple', 'Blackfriars', 'Mansion House',
    'Cannon Street', 'Monument', 'Tower Hill'
]
```

Merge both lists and deduplicate for a single filter across both lines.

---

## Static data (downloaded once at setup, committed to repo)

### ONS Census 2021 — Main Language (TS024)

| Field | Detail |
|---|---|
| Source | `https://www.nomisweb.co.uk/sources/census_2021_bulk` |
| Dataset | TS024 — Main language (detailed) |
| Geography | Local Authority (borough) level |
| Download format | CSV bulk download |
| Update frequency | Decennial — next update ~2031 |
| Licence | Open Government Licence |

**How to download:**
1. Go to `nomisweb.co.uk/sources/census_2021_bulk`
2. Find dataset TS024
3. Download the "Lower Tier Local Authority" CSV file
4. Filter rows for London boroughs (GSS codes E09000001–E09000033)

**Fields to extract per borough:**
- `C2021_MLAN_19` = Polish speakers
- `C2021_MLAN_20` = Romanian speakers  
- `C2021_MLAN_32` = Bengali speakers
- `C2021_MLAN_38` = Gujarati speakers
- `C2021_MLAN_41` = Hindi speakers
- `C2021_MLAN_42` = Punjabi speakers
- `C2021_MLAN_44` = Tamil speakers
- `C2021_MLAN_47` = Urdu speakers
- `C2021_MLAN_55` = Arabic speakers
- `C2021_MLAN_56` = French speakers
- `C2021_MLAN_57` = Portuguese speakers
- `C2021_MLAN_58` = Spanish speakers
- (plus all others — calculate top 3 non-English languages by count per borough)

**Target output per borough in `demographics.json`:**
```json
{
  "top_languages": [
    { "language": "Bengali", "percent": 32.1 },
    { "language": "Sylheti", "percent": 8.4 },
    { "language": "Somali", "percent": 3.2 }
  ]
}
```

---

### ONS Census 2021 — Population Density (TS006) and Age (TS007)

| Field | Detail |
|---|---|
| Source | `https://www.nomisweb.co.uk/sources/census_2021_bulk` |
| Datasets | TS006 (density), TS007 (age by 5yr band) |
| Geography | Local Authority level |
| Licence | Open Government Licence |

**Fields to extract:**
- TS006: `population_density` (persons per km²) per borough
- TS007: derive median age per borough from age band distribution

---

### GLA London Datastore — Borough Profiles

| Field | Detail |
|---|---|
| Source | `https://data.london.gov.uk/dataset/london-borough-profiles` |
| Format | CSV, updated annually |
| API | Datastore API at `https://data.london.gov.uk/guidance/datastore-api/` |
| Licence | Open Government Licence |

**Fields to extract per borough** (column names from the CSV):

| CSV column | Use in panel |
|---|---|
| `Median House Price (£)` | Wealth indicator for halo colour |
| `% of population aged 0-15` | Demographics flavour |
| `Employment rate (%)` | Local profile |
| `Life expectancy - Male` | Social indicator |
| `Life expectancy - Female` | Social indicator |
| `% area that is open space` | Green space fact |
| `Happiness score` | Wellbeing flavour |
| `Median Household Income Estimate (£)` | Wealth signal for flare colour |

**Note:** The `Median Household Income Estimate` is the primary input for the station flare halo colour (already used in Phase 1 for Victoria line). Ensure District line boroughs are added to this mapping.

---

### Wikipedia borough facts (pre-curated JSON)

Not an API — these are editorial sentences written once and stored in `data/demographics.json`. Each borough gets 3–5 facts. Rules:

- Every fact must be verifiable from Wikipedia, ONS, or GLA sources
- Write in the existing "This is London" editorial voice: precise, slightly poetic, never dry
- Prioritise the surprising, the specific, and the human over the statistical
- Maximum one pure statistics sentence per fact set — the rest should be cultural, historical, or linguistic

**Example format in demographics.json:**
```json
{
  "borough": "Merton",
  "borough_facts": [
    "The Statutes of Merton, signed here in 1235, are the oldest statute law still on the English books — the first brick in the foundations of Parliament.",
    "Every July, 500,000 extra people pour into this borough for Wimbledon. For two weeks, the entire world watches a patch of SW19 grass.",
    "Tamil is spoken in roughly 1 in 10 Merton homes — one of the highest concentrations in Europe outside Tamil Nadu.",
    "William Morris ran his workshop on the River Wandle here in the 1880s. Arthur Liberty lived nearby. The borough has always attracted makers."
  ]
}
```

**Boroughs to curate for District line** (in addition to existing Victoria line wards):

| Borough | Key District line stations | Notable facts to research |
|---|---|---|
| Hammersmith & Fulham | Hammersmith, Barons Court, Fulham Broadway, Parsons Green | Largest inner London green space, Stamford Bridge |
| Kensington & Chelsea | Earl's Court, Gloucester Road, South Kensington | Most expensive borough, Natural History Museum, Freddie Mercury |
| Westminster | Sloane Square, Victoria, St James's Park, Westminster | Parliament, Buckingham Palace, highest office density |
| City of London | Mansion House, Cannon Street, Monument, Tower Hill | Square Mile, medieval street plan, financial centre |
| Tower Hamlets | Whitechapel, Stepney Green, Mile End, Bow Road | Bengali community (32%), oldest mosque in UK, Huguenot history |
| Newham | West Ham, Plaistow, Upton Park, East Ham, Barking | Most linguistically diverse borough in England, 2012 Olympics |
| Barking & Dagenham | Upney, Becontree, Dagenham | Largest council estate ever built (Becontree), Ford factory history |
| Ealing | Ealing Broadway, Ealing Common | Britain's oldest film studio, Polish community |
| Hounslow | Gunnersbury, Kew Gardens, Richmond | Kew Gardens (UNESCO), Heathrow proximity, South Asian community |
| Richmond | Richmond | Richest London borough by income, Richmond Park (650 deer) |
| Wandsworth | East Putney, Putney Bridge, Southfields | Largest green space of any inner London borough |
| Merton | Colliers Wood, South Wimbledon, Wimbledon | Statutes of Merton 1235, Wimbledon Championships, Tamil community |

---

## District line station list

Full list of stations with TfL NaPTAN IDs and borough assignments for `data/district_stations.json`.

| Station | NaPTAN ID | Borough | Branch |
|---|---|---|---|
| Upminster | 940GZZLUUPM | Havering | Upminster |
| Upminster Bridge | 940GZZLUUMB | Havering | Upminster |
| Hornchurch | 940GZZLUHCH | Havering | Upminster |
| Elm Park | 940GZZLUELP | Havering | Upminster |
| Dagenham East | 940GZZLUDGE | Barking & Dagenham | Upminster |
| Dagenham Heathway | 940GZZLUDGN | Barking & Dagenham | Upminster |
| Becontree | 940GZZLUBEC | Barking & Dagenham | Upminster |
| Upney | 940GZZLUUPN | Barking & Dagenham | Upminster |
| Barking | 940GZZLUBKG | Barking & Dagenham | Upminster/Wimbledon |
| East Ham | 940GZZLUEHA | Newham | Upminster/Wimbledon |
| Upton Park | 940GZZLUUPM | Newham | Upminster/Wimbledon |
| Plaistow | 940GZZLUPLA | Newham | Upminster/Wimbledon |
| West Ham | 940GZZLUWEH | Newham | Upminster/Wimbledon |
| Bromley-by-Bow | 940GZZLUBBB | Tower Hamlets | Upminster/Wimbledon |
| Bow Road | 940GZZLUBWR | Tower Hamlets | Upminster/Wimbledon |
| Mile End | 940GZZLUMLE | Tower Hamlets | Upminster/Wimbledon |
| Stepney Green | 940GZZLUSTG | Tower Hamlets | Upminster/Wimbledon |
| Whitechapel | 940GZZLUWCH | Tower Hamlets | Upminster/Wimbledon |
| Aldgate East | 940GZZLUADE | Tower Hamlets | Upminster/Wimbledon |
| Tower Hill | 940GZZLUTOH | City of London | Upminster/Wimbledon |
| Monument | 940GZZLUMMT | City of London | Upminster/Wimbledon |
| Cannon Street | 940GZZLUCST | City of London | Upminster/Wimbledon |
| Mansion House | 940GZZLUMSH | City of London | Upminster/Wimbledon |
| Blackfriars | 940GZZLUBLF | City of London | Upminster/Wimbledon |
| Temple | 940GZZLUTEM | Westminster | Upminster/Wimbledon |
| Embankment | 940GZZLUEMB | Westminster | Upminster/Wimbledon |
| Westminster | 940GZZLUWSM | Westminster | Upminster/Wimbledon |
| St James's Park | 940GZZLUSJP | Westminster | Upminster/Wimbledon |
| Victoria | 940GZZLUVIC | Westminster | Upminster/Wimbledon |
| Sloane Square | 940GZZLUSSQ | Kensington & Chelsea | Upminster/Wimbledon |
| South Kensington | 940GZZLUSKN | Kensington & Chelsea | Upminster/Wimbledon |
| Gloucester Road | 940GZZLUGTR | Kensington & Chelsea | Upminster/Wimbledon |
| Earl's Court | 940GZZLUERC | Kensington & Chelsea | All branches split |
| High Street Kensington | 940GZZLUHSK | Kensington & Chelsea | Wimbledon/Richmond/EB |
| Notting Hill Gate | 940GZZLUNHG | Kensington & Chelsea | Wimbledon/Richmond/EB |
| Bayswater | 940GZZLUBWR | Westminster | Wimbledon/Richmond/EB |
| Paddington | 940GZZLUPAC | Westminster | Wimbledon/Richmond/EB |
| Edgware Road | 940GZZLUEGR | Westminster | Wimbledon/Richmond/EB |
| Fulham Broadway | 940GZZLUFBY | Hammersmith & Fulham | Wimbledon |
| Parsons Green | 940GZZLUPSG | Hammersmith & Fulham | Wimbledon |
| Putney Bridge | 940GZZLUPYB | Hammersmith & Fulham | Wimbledon |
| East Putney | 940GZZLUEPY | Wandsworth | Wimbledon |
| Southfields | 940GZZLUSWF | Merton | Wimbledon |
| Wimbledon Park | 940GZZLUWIP | Merton | Wimbledon |
| Wimbledon | 940GZZLUWIM | Merton | Wimbledon |
| West Brompton | 940GZZLUWBP | Hammersmith & Fulham | Richmond/EB |
| Barons Court | 940GZZLUBRC | Hammersmith & Fulham | Richmond/EB |
| Hammersmith | 940GZZLUHSD | Hammersmith & Fulham | Richmond/EB |
| Ravenscourt Park | 940GZZLURVP | Hounslow | Richmond |
| Stamford Brook | 940GZZLUSTB | Hounslow | Richmond |
| Turnham Green | 940GZZLUTNG | Hounslow | Richmond/EB |
| Gunnersbury | 940GZZLUGNY | Hounslow | Richmond |
| Kew Gardens | 940GZZLUKWG | Richmond | Richmond |
| Richmond | 940GZZLURIC | Richmond | Richmond |
| Chiswick Park | 940GZZLUCYP | Hounslow | Ealing Broadway |
| Acton Town | 940GZZLUACT | Ealing | Ealing Broadway |
| Ealing Common | 940GZZLUECM | Ealing | Ealing Broadway |
| Ealing Broadway | 940GZZLUEBY | Ealing | Ealing Broadway |

**Note:** verify NaPTAN IDs against the TfL API before committing. Some IDs above are approximate. Use `GET /StopPoint/Search/{name}?modes=tube` to confirm the correct ID for any station.

---

## Data flow summary

```
Setup (once):
  Nomis TS024 CSV → extract languages per borough → demographics.json
  Nomis TS006/TS007 CSV → extract density/age per borough → demographics.json
  GLA Borough Profiles CSV → extract income/green space/etc → demographics.json
  Wikipedia research → curate 3–5 facts per borough → demographics.json
  Claude batch → generate editorial sentences from above data → demographics.json

Runtime (every 20s):
  TfL /Line/victoria,district/Arrivals → in-memory cache → canvas boluses

Runtime (every 60s):
  TfL /Line/victoria,district/Status → in-memory cache → arrhythmia effect

Runtime (on station click):
  TfL /StopPoint/{id}/Arrivals → pass-through → dot-matrix board
  demographics.json → read borough key → panel facts
  Police API (1hr cache) → incident count → "right now" section

Runtime (once per day):
  Wikimedia On This Day → filtered for London keywords → panel "on this day"
```
