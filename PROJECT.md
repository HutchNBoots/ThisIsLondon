# PROJECT.md — "This is London"

> **This document is the single source of truth for the project.** Claude Code should read this in full at the start of every session before doing any work. If anything here conflicts with a casual instruction in chat, ask before proceeding.

---

## 0. TL;DR for Claude Code

You are building a proof-of-concept (PoC) web-based **data art installation** about London. Before writing any code, you will use the **Superpowers brainstorming skill** to push the concept *beyond* the baseline features described in this document. The three features in Section 5 are a **floor, not a ceiling** — treat them as a starting point to exceed, not a spec to implement literally.

There is exactly **one human approval gate**: the post-brainstorm plan. Everything after that runs autonomously.

---

## 1. Project Overview

**"This is London"** is an interactive web-based data art installation and dashboard. It visualises the pulse of London by blending high-frequency live data (moving underground trains, local incidents) with low-frequency human data (demographics, borough statistics, culture). The goal is to contrast the *physical movement* of the city against the *social makeup* of its communities.

This is **art first, dashboard second.** Visual quality and atmosphere matter as much as data accuracy. A technically correct but visually generic result is a failure.

---

## 2. Ways of Working (read this carefully)

### 2.1 The toolchain
- **Claude Code** is the builder. It writes, edits, runs, tests, and commits.
- **Superpowers plugin** provides the disciplined workflow (clarify → design → plan → code → verify).
- **GitHub** is the source of truth for code. Commit at every milestone with clear messages.
- **Vercel** is the hosting target.
- The human (project owner) wants to **do as little as possible** and approve work **only when absolutely necessary.**

### 2.2 Install Superpowers first
At the start of the project, inside a Claude Code session, run:
```
/plugin install superpowers@claude-plugins-official
```
If `/plugin` is not recognised, run `npm update -g @anthropic-ai/claude-code`, restart the session, and try again. Verify the skills are loaded before proceeding.

### 2.3 The autonomy rule (IMPORTANT)
- There is **ONE mandatory human approval gate**: after the brainstorm + plan stage. The human reads and approves the plan before any code is written.
- **After plan approval, work autonomously.** Do not stop to ask for approval on individual implementation decisions, file changes, commits, styling choices, or refactors.
- Only interrupt the human after approval if you hit one of the **hard-stop conditions**:
  1. An API requires a paid plan, credentials, or a key the human must personally create.
  2. A decision would cost money or commit to a paid service.
  3. The plan needs to materially change scope (e.g. the chosen approach turns out to be infeasible).
  4. You are genuinely blocked and cannot make reasonable progress on any task.
- For everything else: **make a sensible decision, document it in a commit message or a DECISIONS.md log, and keep moving.**

### 2.4 Cloud-first execution
Run as much as possible in the cloud (GitHub Codespaces or equivalent) so the human does not need a local dev setup. Headless / background execution is preferred. The human checks in via GitHub, not the terminal.

---

## 3. The Brainstorm Mandate (do this BEFORE building)

Using the Superpowers **brainstorming skill**, run a proper ideation session on the concept *before* designing or coding. Goals:

- **Exceed the baseline.** The features in Section 5 are deliberately conservative. Propose genuinely novel ideas for how live transit data and human/demographic data can be fused into something artful and surprising.
- **Find the "art moment."** Identify the single most striking visual or interactive idea that makes this feel like art, not a dashboard. Pitch at least 3 candidates and recommend one.
- **Stay shippable.** Every idea must be deliverable in a ~7-day PoC within the scope guard (Section 4). Flag anything that isn't.
- **Output a short brainstorm summary** (BRAINSTORM.md) + a concrete build plan (PLAN.md) for the human to approve. This is the one approval gate.

---

## 4. Scope Guard (keep the PoC shippable)

To stop the brainstorm ballooning into something un-shippable:

- **One tube line** for the live transit feature (recommend the **Victoria Line** — short, simple, fully underground).
- **One borough** for the demographic layer (recommend **Westminster** or **Tower Hamlets**).
- Static station coordinates are fine for the PoC. No need for perfect geographic accuracy.
- Train animation: **start simple.** A pulsing dot *at* the station when a train is <60s away is acceptable for v1. Smooth line-interpolated movement is a stretch goal, not a requirement.
- If a brainstormed idea needs more than one line or borough to shine, note it as **Phase 2** and build the single-line/single-borough version first.

---

## 5. Baseline Features (the FLOOR — exceed these)

### Feature 1: Live Transit Map
A dark-mode map plotting the chosen Underground line and estimating train movements between stations.
- **Source:** TfL Unified API — `/Line/{ids}/Arrivals`
- **Logic:** TfL gives *arrival predictions*, not GPS. The backend estimates positions: if a train is predicted at Station X in 60s, render it moving toward X.

### Feature 2: Retro Platform Display Board
Clicking a station opens a panel styled like a real TfL dot-matrix platform display.
- **Source:** TfL Unified API — `/StopPoint/{id}/Arrivals`
- **Logic:** Live-updates ~every 15s. Shows next 3 trains, destinations, minutes to arrival.

### Feature 3: Demographic & "Vibe" Overlay
A toggleable layer that shifts the visual theme based on neighbourhood data.
- **Sources:** ONS/Nomis (income, language, density) + UK Police API (local incidents)
- **Logic:** Inspecting a station shows a "Local Profile": e.g. average ward income, most common non-English language, live local incident ticker.

---

## 6. Art Direction — Retro TfL

The agreed aesthetic for the PoC is **retro Transport for London.**

- **Dot-matrix LED board:** glowing amber/orange dot-matrix text for the platform display. This is the signature visual.
- **Johnston-style typography:** use the TfL typographic heritage (Johnston / New Johnston style fonts, or a close free alternative) for UI chrome.
- **Dark-mode minimalist map:** muted, near-black base map so the line colours and train dots glow.
- **The "art moment" lives in motion:** train movement and the demographic overlay transitions are where generative/animated art should concentrate (Canvas or p5.js/Three.js overlay). Briefed properly, this is buildable.
- **Image/asset quality matters.** Do NOT ship default-looking placeholder graphics. Where atmospheric imagery or texture is needed, flag it so the human can supply or generate high-quality assets (e.g. via an image model) rather than settling for generic output. Prefer the *interface itself as art* over stock decoration.

---

## 7. Technical Stack

### Backend (Python)
- **Framework:** FastAPI (async, performant)
- **HTTP:** httpx (async, non-blocking TfL calls)
- **Scheduling:** APScheduler (background task refreshing live data on a loop)

### Frontend
- **Map:** Leaflet.js or Mapbox GL JS (dark minimalist style)
- **Styling:** Tailwind CSS + retro dot-matrix custom CSS
- **Animation:** HTML5 Canvas (or p5.js/Three.js) overlay for smooth train vectors without lagging the DOM

### Data / cache
- **Static demographic data:** SQLite or JSON, fetched once at setup
- **Live train data:** in-memory cache only, never persisted

### Hosting
- **Vercel** for the frontend. Python backend hosted compatibly (Vercel serverless functions, or a small free-tier service — decide during planning and log the choice).

---

## 8. Architecture (the protective-proxy pattern)

```
Client (Browser)
  Leaflet/Mapbox + Canvas animations
  Tailwind + retro dot-matrix UI
        ▲  JSON via HTTP / WebSocket
        ▼
Backend (Python / FastAPI)
  API router: unified data payloads
  Scheduler: pulls live data every 15–30s
  Processor: merges live feeds with local demographics
        ▲  local queries
        ▼
Local cache / DB (SQLite / JSON) — static Nomis & ONS data
```

**Golden rule:** the frontend **never** calls TfL (or any external API) directly. The Python backend is a protective shield — it hits TfL once every ~20s, caches the snapshot in memory, and serves that single snapshot to all clients. This prevents rate-limiting and IP blacklisting.

---

## 9. API & Data Mapping

| Component | Endpoint | Frequency | Storage |
|---|---|---|---|
| Train positions | TfL `/Line/{ids}/Arrivals` | every ~20s | memory only |
| Platform displays | TfL `/StopPoint/{id}/Arrivals` | on click | pass-through |
| Borough demographics | Nomis (by ward/borough) | once at setup | SQLite/JSON |
| Live incidents | UK Police `/crimes-at-location` | once/session | cached ~1hr |

---

## 10. Milestones (PoC, ~7 days)

> Note: the brainstorm (Section 3) may reshape these. After plan approval, run autonomously through whatever the agreed plan is. The below is the baseline.

- **M0 — Setup:** Install Superpowers. Init repo, push to GitHub, set up Codespace, scaffold FastAPI + frontend, wire Vercel. Commit.
- **M1 — Brainstorm + Plan:** Run the brainstorm. Produce BRAINSTORM.md + PLAN.md. **← human approval gate.**
- **M2 — Local data ingestion:** Pull Nomis demographics for the one chosen borough into local JSON/SQLite.
- **M3 — TfL bridge:** FastAPI `/api/live-trains` endpoint, proxying + caching the chosen line's arrivals; return clean JSON (Line, StationName, TimeToStation, Direction).
- **M4 — Frontend blueprint:** Leaflet map, static station markers, JS fetching the backend, data rendered live.
- **M5 — The art:** Dot-matrix LED platform board, train motion on the map, demographic-driven colour/theme shifts. This is where visual quality is proven.
- **M6 — Deploy + verify:** Live on Vercel, end-to-end working, README written.

---

## 11. Risks & Mitigations

- **Rate-limiting / blacklisting:** never call TfL from the client. Backend caches and serves one snapshot to all users (Section 8).
- **Train-positioning complexity:** don't perfect millimetre animation in the PoC. Pulsing dot at station when <60s away is fine for v1; smooth interpolation is Phase 2.
- **Generic visuals:** actively guard against default-looking output (Section 6). Flag asset needs to the human rather than shipping bland placeholders.
- **Scope creep from brainstorm:** anything beyond one line / one borough is Phase 2 (Section 4).

---

## 12. Logging decisions

Maintain a **DECISIONS.md** in the repo. Every time you make a non-trivial autonomous choice (hosting approach, library swap, data shortcut), log it in one line with a date. This lets the human stay hands-off but still audit the trail.

---

## 13. Phase 2 Backlog (post-PoC)

The PoC (M0–M6) is complete. The following backlog is prioritised for Phase 2 development. Items are ordered by impact vs. effort. All scope-guard rules from Section 4 still apply — expand one thing at a time.

### Polish / immediate fixes
| Item | Effort | Notes |
|---|---|---|
| Map auto-fit to Victoria Line on load | XS | `map.fitBounds()` from station coordinates |
| Station tooltip CSS (remove Leaflet arrow shape) | XS | CSS override on `.leaflet-tooltip` |
| Bolus animation visual QA in production | S | Verify 60fps, glow quality, halo colours |
| Arrival sound layer (`?sound=1`) | S | Already designed in PLAN.md §5e — Web Audio API sine tones |

### Phase 2 art features
| Item | Effort | Notes |
|---|---|---|
| UK Police incident data wired to arrhythmia | S | Replace static threshold with live `/crimes-at-location` API |
| Borough portrait filmstrip | M | Algorithmically-generated building silhouettes at screen bottom using OS Open Data |
| Thermal Portrait mode (toggle) | L | WebGL fragment shader — see BRAINSTORM.md §2 Candidate C. Render it perfectly or not at all. |
| Time-lapse / clock replay | L | Historical TfL data replay; clock-face scrubber UI |

### Phase 2 data expansion
| Item | Effort | Notes |
|---|---|---|
| Mobile responsive layout | M | Currently desktop-only |
| Second tube line (Jubilee or Central) | M | Adds a second artery — keep Bloodstream metaphor |
| Real-time passenger load → bolus diameter | M | Requires TfL crowding API (`/crowding/{line}`) |
| Multi-line full circulatory system | XL | All 11 lines — Phase 3 really |

### Phase 2 station panel
| Item | Effort | Notes |
|---|---|---|
| Flickr average-colour halo tinting | S | Geotagged photos near each station → extract average colour |
| TheyWorkForYou MP data for Westminster | S | "This is where it is decided" — see BRAINSTORM.md §6 |
| Met Office weather → bolus glow intensity | S | Cold/overcast = dimmer boluses; hot = brighter |

### Effort key: XS = hours, S = 1 day, M = 2–3 days, L = 4–5 days, XL = 1 week+
