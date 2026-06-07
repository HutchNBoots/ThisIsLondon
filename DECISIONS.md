# DECISIONS.md

## 2026-06-07: CartoDB tiles over Mapbox for open-source repo

Confirmed CartoDB Dark Matter tiles (no token) over Mapbox for the PoC. Mapbox public tokens cannot be URL-restricted, making them unsuitable for an open-source public repo.

## 2026-06-07: Tile provider and hosting

- **CartoDB Dark Matter tiles** chosen instead of Mapbox for the PoC. No token required, free, looks great on dark maps. Mapbox can be added in Phase 2 with proper domain restrictions.
- **Railway.app** chosen for backend hosting. APScheduler requires a persistent process; Vercel serverless 10s limit is incompatible.
