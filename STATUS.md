# This is London — Project Status Update
**Date:** 2026-06-07
**Phase:** PoC complete, live in production

---

## What's been built

"This is London" is live as a web-based data art installation. It visualises the Victoria Line as a circulatory system: amber boluses of light move through a vein-like artery at the speed of real trains, each station flaring with a halo colour drawn from the demographic makeup of its surrounding ward.

**Live URLs:**
- Frontend: *(Vercel URL — add here)*
- Backend API: `https://thisislondon-production.up.railway.app`

---

## Current feature set

| Feature | Status | Notes |
|---|---|---|
| Live train positions | ✅ Live | TfL API polled every 20s, 29–30 trains cached |
| Bloodstream canvas animation | ✅ Live | Amber boluses moving along artery path |
| Station flares (demographic colours) | ✅ Live | Halo colour encodes ward wealth/deprivation |
| Station click panel | ✅ Live | Slides in like a platform door |
| Dot-matrix arrivals board | ✅ Live | Live TfL arrival times per station |
| Neighbourhood facts feed | ✅ Live | Demographic, amenity, historical sentences |
| Wikipedia "On This Day" | ✅ Live | Live pull, filtered for London/Underground mentions |
| Line pressure gauge | ✅ Live | Analogue SVG gauge, left edge, no numbers |
| Atmosphere colour shifts | ✅ Live | Subliminal background tint shifts north/south |
| Typography wealth signal | ✅ Live | Station label weight varies by ward wealth score |
| FastAPI backend | ✅ Live | Railway.app, persistent APScheduler |
| Static demographic data | ✅ Live | 16 stations, ward-level Census 2021 data |
| CartoDB Dark Matter map | ✅ Live | No token required, free tier |

---

## Known issues / polish needed

| Issue | Priority | Notes |
|---|---|---|
| Map initial zoom cuts off Brixton and Walthamstow | Medium | Need to fit bounds to line on load |
| Station marker tooltip shape (left-pointing arrow) | Low | Leaflet default tooltip shape — needs CSS override |
| Arrival sound layer not yet implemented | Low | Planned in PLAN.md §5e, deferred |
| Borough portrait filmstrip not yet implemented | Low | Phase 2 item from brainstorm |
| Bolus animation needs visual QA in production | Medium | Not yet verified in live environment post-deploy |

---

## Infrastructure

| Component | Platform | Cost | Notes |
|---|---|---|---|
| Frontend | Vercel | Free | Static site |
| Backend | Railway.app | ~$0–5/month | Free tier ($5 credit/month) |
| TfL API | api.tfl.gov.uk | Free | API key in Railway env vars |
| Map tiles | CartoDB | Free | No token, no limits for this traffic level |
| Demographics data | ONS/Census 2021 | Free | Static JSON, committed to repo |

---

## What's next — Phase 2 backlog

See PROJECT.md Section 13 for the full prioritised backlog. Top candidates for the next sprint:

1. **Visual QA pass** — verify bolus animation, flare colours, and panel in production; fix any remaining rendering issues
2. **Arrival sound layer** — Web Audio API tones on station arrival (already designed, not yet coded)
3. **Map bounds fix** — auto-fit to Victoria Line on load so full line always visible
4. **Thermal Portrait mode** — the Phase 2 art moment (WebGL shader — see BRAINSTORM.md §2 Candidate C)
5. **Multi-line expansion** — add Jubilee or Central line as a second artery
6. **UK Police incident data** — wire arrhythmia to real incident counts (currently uses static threshold)
7. **Real-time passenger load** — bolus diameter encoding actual crowding data if TfL exposes it
8. **Mobile responsive layout** — currently desktop-only

---

## Decisions made autonomously (see DECISIONS.md for full log)

- **CartoDB tiles** over Mapbox — Mapbox public tokens can't be URL-restricted, unsuitable for open-source repo
- **Railway.app** over Vercel for backend — APScheduler requires a persistent process; Vercel serverless 10s limit incompatible
- **Static JSON** over SQLite for demographic data — sufficient for PoC, no database overhead
- **CartoDB Dark Matter** palette confirmed as the base — retro TfL amber reads well against it

---

*Built by Claude Code in one session, M0 through M6, with one human approval gate at M1 (plan approval).*
