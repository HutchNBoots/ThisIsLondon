# This is London — Visual Design Rules
**Version:** 1.0  
**Date:** 2026-06-07  
**Status:** Authoritative. Feed this document to the implementation backlog agent.

---

## Preamble

These rules govern every visual decision in the "This is London" installation. They are grounded in: the existing codebase (Leaflet.js, Canvas bolus animation, Share Tech Mono typography, CartoDB Dark Matter tiles), and UX patterns observed in FlightRadar24, earth.nullschool.net, Windy.com, Google Maps, Citymapper, NYT interactive maps, TfL Go, Strava Global Heatmap, and Rome2Rio.

The installation is data art first, transit tool second. Every rule reflects that priority.

---

## Section 1 — Zoom Level Hierarchy

The map starts at zoom 11. Leaflet maxZoom is set to 20. The active zoom range for this installation is **10–17**; zoom 18+ is "geologist mode" and not a design target.

### 1.1 Station Markers

| Zoom | Marker form | Rationale |
|------|-------------|-----------|
| 10 | Hidden | Too many markers; map is context, not interface |
| 11 | 10px minimal dot (red ring + white centre, no bar) | Presence signal only — matches current `getRoundelCircleSize` logic |
| 12 | 16px compact roundel (ring + navy bar, no name) | Recognisable TfL form, not yet readable |
| 13 | 24px full roundel + station name inline | Name is now legible; roundel form complete |
| 14 | 32px full roundel + name | Comfortable tap target; roundel is dominant |
| 15+ | 40px full roundel + name | Maximum size; do not grow beyond 40px or markers crowd each other |

**Rule 1.1-A:** Station markers MUST NOT appear at zoom 10 or below. The line polylines alone carry the network story at that scale.  
**Priority:** P1  
**Reference:** Google Maps withholds station icons below a calculated density threshold; FlightRadar24 clusters aircraft icons below zoom 6.

**Rule 1.1-B:** The tap/click target for a station marker MUST be at least 44×44px on mobile regardless of the rendered marker size. Achieve this with a transparent Leaflet divIcon padding wrapper, not by enlarging the visual marker.  
**Priority:** P1  
**Reference:** Apple HIG, WCAG 2.5.5 (Target Size).

**Rule 1.1-C:** The current `getRoundelCircleSize` function already implements a correct size progression. The only gap is that zoom-10 markers are not hidden. Add an explicit `if (zoom <= 10) return null` guard before creating the icon.  
**Priority:** P1

### 1.2 Station Name Labels

| Zoom | Label behaviour |
|------|-----------------|
| ≤12 | Hidden entirely (no tooltip rendered) |
| 13 | Inline within the roundel SVG (existing behaviour) |
| 14–15 | Inline roundel name + persistent Leaflet tooltip visible on hover only |
| 16+ | Persistent Leaflet tooltip always visible; roundel name also present |

**Rule 1.2-A:** Station name labels MUST NOT appear as persistent (always-visible) text below zoom 16. Above zoom 15, label density on CartoDB Dark Matter creates visual noise that competes with the bolus animation.  
**Priority:** P1  
**Reference:** Google Maps applies this exact pattern — street-level labels appear at z16+; Apple Maps uses a similar threshold.

**Rule 1.2-B:** On mobile (viewport ≤600px), station labels MUST remain hidden at all zoom levels. The current CSS rule `display: none !important` is correct and must not be removed.  
**Priority:** P1

**Rule 1.2-C:** Label density MUST NOT exceed 8 visible station names per viewport at any zoom level. If auto-zoom or map pan results in more than 8 labels visible simultaneously, suppress labels for lower-prominence stations (those without an interchange marker) preferentially.  
**Priority:** P2  
**Reference:** NYT interactive maps apply editorial label suppression to prevent cartographic clutter.

### 1.3 Borough Boundaries

| Zoom | Borough overlay behaviour |
|------|--------------------------|
| ≤10 | Hidden |
| 11–12 | Boundary lines only, no fill (stroke opacity 0.3) |
| 13+ | Boundary lines + low-opacity fill (opacity ≤0.15 in DARK mode) |

**Rule 1.3-A:** Borough boundary polylines MUST NOT be visible below zoom 11. At that scale they add noise without meaning.  
**Priority:** P2  
**Reference:** Windy.com withholds administrative boundaries below regional zoom.

**Rule 1.3-B:** In Language Portrait and Gentrification modes, borough fills become the primary visual signal and MUST become visible at zoom 11 (one zoom level earlier than in neutral mode).  
**Priority:** P2

**Rule 1.3-C:** Borough boundaries MUST be clickable at zoom 12 and above. Below zoom 12, click events on borough areas are disabled (the polygons exist but have `interactive: false`).  
**Priority:** P2

### 1.4 Ghost Stations

| Zoom | Ghost station behaviour |
|------|------------------------|
| ≤12 | Hidden |
| 13 | Rendered at 50% the opacity of live stations; no label |
| 14+ | Full ghost rendering with label (grey, italic); flicker animation active |

**Rule 1.4-A:** Ghost stations MUST NOT appear before zoom 13. They are secondary storytelling elements; premature appearance creates confusion about which stations are operational.  
**Priority:** P2

**Rule 1.4-B:** Ghost stations must be visually distinguishable from live stations by at least three simultaneous visual differences: colour (grey vs. red/navy), opacity (≤0.6 vs. 1.0), and stroke style (dashed vs. solid ring).  
**Priority:** P1  
**Reference:** Citymapper differentiates closed services through desaturation, strikethrough, and greyed iconography simultaneously — redundant coding for accessibility.

### 1.5 Line Polyline Weight

| Zoom | Stroke weight |
|------|---------------|
| 10 | 2px |
| 11 | 2.5px |
| 12 | 3px |
| 13 | 4px |
| 14 | 5px |
| 15 | 6px |
| 16+ | 7px |

**Rule 1.5-A:** Line weight MUST scale with zoom following the table above. Fixed-weight lines look broken at high zoom and invisible at low zoom.  
**Priority:** P2  
**Reference:** TfL's own digital tube map thickens lines at closer zoom; Strava Global Heatmap uses weight-by-zoom to maintain visual continuity.

**Rule 1.5-B:** Line weight scaling MUST be applied via Leaflet's `zoom` event listener, updating the polyline `weight` option on each `zoomend`.  
**Priority:** P2

### 1.6 Station Panel Reachability

**Rule 1.6-A:** The station panel MUST only be triggerable at zoom 12 and above. At zoom 11 and below, marker tap/click events are ignored and the panel does not open. This prevents accidental panel opens when the user is navigating at city scale.  
**Priority:** P2

---

## Section 2 — Visual Hierarchy Rules

### 2.1 Rendering Stack (Z-order, lowest to highest)

| Layer | Z-index | Opacity ceiling | Notes |
|-------|---------|-----------------|-------|
| CartoDB Dark Matter tiles | base | 1.0 | Never touch |
| Borough boundary fills (overlay modes) | 200 | 0.30 | Maximum; reduce to 0.20 in DARK mode |
| Borough boundary strokes (neutral mode) | 201 | 0.35 | |
| Atmosphere tint (`#atmosphere-tint`) | 1 (current) | 0.18 | mix-blend-mode: multiply is correct |
| Canvas bolus animation (`#art-layer`) | 400 (current) | 1.0 | Primary visual; must never be occluded |
| Station markers (Leaflet divIcons) | 500 | 1.0 | Sit above canvas |
| Station labels (Leaflet tooltips) | 510 | 0.85 | Slightly dimmed to recede behind markers |
| Pressure gauge | 1000 | 0.8 | |
| Borough panel | 1000 | 1.0 | |
| Station panel | 1000 | 1.0 | |
| Status banner | 1100 | 0.95 | |
| Title overlay + controls | 1000 | 0.9 | |
| Curtain raise | 2000 | 1.0 | |

**Rule 2.1-A:** The animated bolus (Canvas layer, z-index 400) is the primary visual. Nothing except UI chrome (panels, banner) may render above it. Borough fills, atmosphere tint, and map tiles must always be below the canvas.  
**Priority:** P1

**Rule 2.1-B:** When the station panel is open, the map canvas does NOT pause. The animation continues behind the panel. The panel is an overlay, not a replacement state.  
**Priority:** P1  
**Reference:** FlightRadar24 continues animating aircraft behind its detail panel.

**Rule 2.1-C:** Atmosphere tint (`mix-blend-mode: multiply`) must NEVER exceed 0.18 opacity. It is a subliminal effect; if a user can consciously name "there's a red tint in the south," it is too strong.  
**Priority:** P2

### 2.2 Overlap Resolution

When elements overlap, the following precedence applies:

1. Animated bolus > all map elements
2. Live station roundel > ghost station marker
3. Interchange station (multi-line) > single-line station roundel
4. Station label > borough label (borough labels are not yet implemented but planned)
5. Status banner > all beneath it

**Rule 2.2-A:** At an interchange station (e.g. Victoria, shared by District and Victoria lines), render a single roundel in the colour of the highest-ridership line served. Do not stack two roundels on the same coordinate. Use a concentric ring to indicate the second line.  
**Priority:** P2

---

## Section 3 — Colour and Contrast Standards

### 3.1 Line Colours

The existing palette (`LINE_PALETTE` in `main.js`) is:

| Line | Hex | Against `#0a0a0a` background | Compliance |
|------|-----|------------------------------|------------|
| Victoria | `#009DDC` | Contrast ratio ~5.2:1 | Passes AA |
| District | `#007229` | Contrast ratio ~3.1:1 | **Fails AA (3.0 minimum for UI, 4.5 for text)** |
| Central | `#E32017` | Contrast ratio ~4.8:1 | Marginal; passes AA for large objects |
| Jubilee | `#A0A5A9` | Contrast ratio ~6.1:1 | Passes AA |
| Northern | `#231F20` | Contrast ratio ~1.1:1 | **Critical failure — near-invisible on dark map** |

**Rule 3.1-A:** The Northern line colour `#231F20` MUST be changed for the DARK mode canvas rendering. The polyline and bolus should use `#4A4A4A` (minimum) or `#666666` (recommended) on dark tiles. The official TfL black is correct for light backgrounds only.  
**Priority:** P1

**Rule 3.1-B:** The District line colour `#007229` must be brightened to `#00A84F` for DARK mode to achieve a minimum 4.5:1 contrast ratio against `#0a0a0a`. The existing teal (`#0eb882` used in the CSS hover) is already a better choice; adopt it as the district canvas colour.  
**Priority:** P1  
**Reference:** WCAG 2.1 SC 1.4.3 (Contrast Minimum). The bolus is a non-text graphical element requiring 3:1 minimum against adjacent colours per WCAG SC 1.4.11 (Non-text Contrast).

**Rule 3.1-C:** The Jubilee line (`#A0A5A9`) must have its polyline rendered at 3px minimum weight on dark tiles, because the grey-on-dark contrast is visually thin even at passing contrast ratios. Weight compensates for low chroma.  
**Priority:** P2

### 3.2 Bolus Colours

| Mode | Victoria bolus | District bolus | Other lines bolus |
|------|---------------|----------------|-------------------|
| DARK | `#ff9900` (amber) | `#0eb882` (teal) | Line colour lightened by 30% luminosity |
| GREEN | `#00ff88` | `#00ddcc` | Line colour lightened |
| LIGHT | `#003688` (navy) | `#007229` (standard green) | Line colour as-is |

**Rule 3.2-A:** In DARK mode, bolus colours MUST differ from their line polyline colours. The bolus is the event (the train); the polyline is the infrastructure. They are different semantic objects and must not be the same colour. Amber on blue (Victoria) and near-white-teal on dark green (District) is the correct approach.  
**Priority:** P1  
**Reference:** earth.nullschool.net uses particle colour distinct from background field colour.

**Rule 3.2-B:** No two active line bolus colours may share a hue within 30° on the HSL wheel when viewed simultaneously on screen.  
**Priority:** P1

### 3.3 Maximum Simultaneous Hues

**Rule 3.3-A:** In neutral DARK mode, the maximum simultaneous distinct hues on screen is **7**: dark map tile (neutral), 5 line colours, and the amber UI chrome. Adding an 8th (e.g. ghost station grey) is acceptable only if it is desaturated to a neutral, not a new chroma.  
**Priority:** P2  
**Reference:** Colour science: human pre-attentive processing identifies up to ~8 distinct colour categories simultaneously. NYT maps rarely use more than 6 distinct categorical colours.

### 3.4 Overlay Colours (Language Portrait / Gentrification)

**Rule 3.4-A:** Language Portrait palette MUST be drawn from a qualitative colour scheme with hues spaced ≥40° apart on the HSL wheel. Suggested: use ColorBrewer Set3 or a custom 12-colour qualitative palette. No Language Portrait colour may be within 20° of any TfL line colour.  
**Priority:** P1  
**Reference:** Colorbrewer2.org qualitative palettes are the cartographic standard for categorical map data (NYT, Guardian data team both use these).

**Rule 3.4-B:** Gentrification gradient MUST use a diverging palette (e.g. low income change = cool blue, high income change = warm orange/red). The midpoint (no change) MUST be a neutral near the map tile colour to minimise visual conflict with the base map.  
**Priority:** P1

**Rule 3.4-C:** In any overlay mode, the maximum opacity of any borough fill is **0.30**. At opacity above 0.30 on dark tiles, the borough fills begin to occlude the line polylines, which inverts the visual hierarchy (Section 2.1-A).  
**Priority:** P1

**Rule 3.4-D:** Language Portrait and Gentrification modes MUST NOT be active simultaneously. They use the same spatial layer (borough polygon fill) and would produce meaningless colour mixing. The UI toggle for the second mode must force-disable the first.  
**Priority:** P1

### 3.5 Text Contrast

**Rule 3.5-A:** All text rendered in the UI panels (station name, borough name, section labels, data values) must achieve WCAG AA contrast (4.5:1) against their background. The current amber `#ff9900` on `#0d0d0d` achieves ~7.5:1, which is AAA. Dimmed text (`--text-dim`: `#ff9900aa`) falls to ~4.8:1 — acceptable. `--text-faint` (`#ff990066`) falls to ~2.9:1 — **fails AA**. Faint text must only be used for truly decorative elements (separators, ghost labels), never for data values.  
**Priority:** P1

---

## Section 4 — Station Marker Rules

### 4.1 Size Progression

The current `getRoundelCircleSize` function is correct. The following formalises it as specification:

| Zoom | Visual diameter | Tap target (mobile) | Form |
|------|----------------|---------------------|------|
| 11 | 10px | 44×44px wrapper | Minimal dot |
| 12 | 16px | 44×44px wrapper | Compact roundel, no name |
| 13 | 24px | 44×44px wrapper | Full roundel + name in SVG |
| 14 | 32px | 44×44px wrapper | Full roundel + name |
| 15+ | 40px | 44×44px wrapper | Full roundel + name |

**Rule 4.1-A:** All station markers at all zoom levels on mobile MUST have a touch target of at least 44×44px. This is already implemented for `#panel-close` and `#mute-toggle` in the CSS; it must be extended to all Leaflet divIcon markers via a transparent wrapper div of 44×44px.  
**Priority:** P1

**Rule 4.1-B:** On desktop, the minimum click target is 32×32px. At zoom 11 (10px dot), the Leaflet icon `iconSize` must be overridden to [32, 32] with `iconAnchor` adjusted accordingly.  
**Priority:** P2

### 4.2 Interchange Stations

**Rule 4.2-A:** A station served by more than one active line (e.g. Victoria/District at Victoria station) MUST render a single roundel with a secondary concentric ring in the second line's colour. The concentric ring sits outside the primary red ring at 1.5× the radius of the main roundel, with a 2px stroke.  
**Priority:** P2

**Rule 4.2-B:** Interchange stations must not show separate marker icons for each line. Stacking two roundels on the same map point creates a visual artifact (misalignment due to subpixel rendering) and confuses the count of stations visible.  
**Priority:** P2

### 4.3 Ghost Station Differentiation

Ghost stations must be visually distinct through all of the following simultaneously (redundant coding for accessibility):

| Property | Live station | Ghost station |
|----------|-------------|---------------|
| Ring colour | `#E21836` (TfL red) | `#666666` (mid grey) |
| Bar colour | `#003688` (TfL navy) | `#444444` (dark grey) |
| Ring stroke | Solid | Dashed (4px dash, 3px gap) |
| Overall opacity | 1.0 | 0.45–0.60 (flickering via CSS animation) |
| Label style | Uppercase, `--text` colour | Italic, `#888888`, 70% opacity |

**Rule 4.3-A:** The ghost flicker animation (`ghost-flicker` keyframe in current CSS, cycling between 0.6 and 0.25 opacity) is correct in concept but the low end (0.25) risks total invisibility. Set the minimum opacity of the flicker to **0.35**.  
**Priority:** P2

**Rule 4.3-B:** Ghost station markers MUST NOT pulse with a glowing drop-shadow. Glows are reserved for live interactive elements. Ghost stations should feel archival, not alive.  
**Priority:** P2

### 4.4 Marker Hover State

**Rule 4.4-A:** On hover, live station markers MUST display a drop-shadow glow in the line colour (not the generic accent). The current CSS uses `drop-shadow(0 0 6px var(--accent))` for victoria-station and `drop-shadow(0 0 6px #0eb882)` for district-station. This pattern must be extended to all five lines when they are added.  
**Priority:** P2

---

## Section 5 — Typography Rules

### 5.1 Font

The project uses Share Tech Mono throughout. This is correct: it reads as functional/industrial (consistent with the dot-matrix aesthetic) and is legible at small sizes.

**Rule 5.1-A:** Share Tech Mono MUST be the only typeface used in the installation. Do not introduce a second face for headings, labels, or overlay text.  
**Priority:** P1

### 5.2 Font Sizes

| Element | Desktop | Mobile | Minimum allowable |
|---------|---------|--------|-------------------|
| Station name (panel header) | 16px | 15px | 14px |
| Borough name (panel subheader) | 10px | 11px | 9px |
| Section label (PEOPLE / PLACE) | 8px | 10px | 8px |
| Data value | 11px | 13px | 10px |
| Data label (left column) | 9px | 13px | 8px |
| Arrivals board | 11px | 13px | 10px |
| Station label tooltip | 10px | hidden | 9px |
| Title overlay | 11px | 10px | 9px |
| Subtitle overlay | 9px | 8px | 7px |
| Status banner | 10px | 9px | 9px |

**Rule 5.2-A:** No text in the installation may be set below **7px**. The gauge label at 7px (current) is the floor. Text below 7px is not legible on standard resolution screens.  
**Priority:** P1

**Rule 5.2-B:** Data values MUST always be at least 2px larger than their corresponding data labels. The label/value size hierarchy is a reading-speed optimisation.  
**Priority:** P2

### 5.3 Letter Spacing

Share Tech Mono is a monospace face with inherent spacing. Additional `letter-spacing` creates telegraphic rhythm that is part of the installation's identity.

| Context | Letter spacing |
|---------|---------------|
| Station name (panel) | 4px |
| Borough name | 3px |
| Section labels | 3px |
| Data labels | 2px |
| Arrivals text | 1px |
| Station tooltips | 2px |
| Title overlay | 4px |
| Status banner | 1px |
| Gauge label | 2px |

**Rule 5.3-A:** Letter spacing MUST NOT exceed 4px for any running text. Above 4px the monospace glyphs read as acronyms, not words, which breaks comprehension of station names.  
**Priority:** P2

**Rule 5.3-B:** Do not apply `text-transform: uppercase` to data values in the People section (population numbers, ages). Uppercase is correct for station names and borough names but wrong for numeric data — it implies shouting.  
**Priority:** P2

### 5.4 Label Permanence

**Rule 5.4-A:** At zoom ≤15, station name labels are hover-only. At zoom 16+, they become permanent (always-visible Leaflet tooltip with `permanent: true`). The zoom threshold event must switch tooltip permanence dynamically.  
**Priority:** P2

**Rule 5.4-B:** When permanent labels are active (zoom 16+), label opacity MUST be 0.80 (not 1.0). Full-opacity labels at high density create visual competition with the bolus animation. Dimming by 20% preserves legibility while maintaining animation dominance.  
**Priority:** P2

### 5.5 Wealth-Signal Font Weight

The existing system varies label `font-weight` from 300–600 based on ward wealth score. This is a core art-direction feature.

**Rule 5.5-A:** The wealth-weight range MUST remain 300–600. Do not use 700 (bold) or 100 (thin) — the range is intentionally compressed to be subliminal. A user should sense the difference, not immediately read it as a data chart.  
**Priority:** P1

---

## Section 6 — Motion and Animation Rules

### 6.1 Bolus Animation

**Rule 6.1-A:** The maximum number of simultaneously animated boluses across all lines is **40**. Beyond 40 moving elements the human visual system cannot track any individual element and the effect becomes noise rather than signal. If TfL data returns more than 40 active trains on the five lines combined, cull to the 40 with the most recent position update.  
**Priority:** P2  
**Reference:** earth.nullschool.net deliberately seeds particle counts to stay within cognitive tracking limits. FlightRadar24 clusters at high density rather than showing all aircraft.

**Rule 6.1-B:** Minimum bolus speed: the bolus must traverse the shortest inter-station gap (approximately 0.3km, e.g. Bank–Monument) in no fewer than **6 seconds** of animation time. Faster = jitter, not motion.  
**Priority:** P2

**Rule 6.1-C:** Maximum bolus speed: no bolus may traverse a station gap in fewer than **3 seconds** regardless of the underlying TfL arrival data. Cap the maximum interpolated speed to preserve the "living organism" feeling.  
**Priority:** P2

**Rule 6.1-D:** Bolus trail length (the fading tail behind the dot) MUST be between 30% and 60% of the inter-station distance. A trail shorter than 30% reads as a dot, not a bolus. A trail longer than 60% visually connects stations in a way that confuses the line polyline.  
**Priority:** P2

**Rule 6.1-E:** Bolus glow radius MUST NOT exceed 12px at the leading edge. The current amber glow on dark tiles is already well-calibrated. Larger glows on multi-line views (all 5 lines) will merge into a single light field.  
**Priority:** P2

### 6.2 Pulse Rings and Flares

**Rule 6.2-A:** Station arrival flares (pulse rings that expand when a bolus reaches a station) MUST complete their animation in ≤1.2 seconds. Longer flares linger into the next train's arrival cycle and compound visually.  
**Priority:** P2

**Rule 6.2-B:** A maximum of **6** pulse rings may be simultaneously active across the entire map. If a 7th would trigger before one of the existing 6 completes, the 7th is suppressed.  
**Priority:** P2

**Rule 6.2-C:** The demographic halo (coloured flare around a station encoding ward wealth/deprivation) is a persistent element, not an animation event. It MUST use CSS `box-shadow` or SVG glow, not a repeating keyframe animation. Persistent flickering haloes compete with the bolus animation.  
**Priority:** P2

### 6.3 UI Transitions

| Transition | Duration | Easing |
|-----------|----------|--------|
| Station panel open/close | 300ms | `ease-out` |
| Borough panel open/close | 300ms | `ease-out` |
| Mode toggle (colour mode change) | 400ms | `ease` |
| Tile layer swap (dark → light) | 600ms (Leaflet default crossfade) | — |
| Atmosphere tint shift | 2000ms | `ease` (current — correct) |
| Overlay mode activate/deactivate | 500ms | `ease` |
| Curtain raise fade | 1200ms | `ease` (current — correct) |
| Status banner appear | 300ms | `ease-out` |
| Status banner dismiss | 500ms | `ease-in` |

**Rule 6.3-A:** No UI transition should be shorter than 150ms or longer than 600ms. Below 150ms, users miss the affordance. Above 600ms, users feel blocked.  
**Priority:** P2  
**Reference:** Google Material Design 3 specifies 200–400ms for surface transitions.

### 6.4 Reduced Motion

**Rule 6.4-A:** When `prefers-reduced-motion: reduce` is active, the following MUST be suppressed: bolus animation reduced to a static position dot; pulse rings disabled; ghost flicker disabled; atmosphere tint transition set to 0ms. The installation becomes a static live-position map.  
**Priority:** P2  
**Reference:** WCAG 2.1 SC 2.3.3 (Animation from Interactions).

**Rule 6.4-B:** On devices with `navigator.deviceMemory < 2` (GB), reduce active bolus count to a maximum of 20. This is a progressive enhancement gate, not a user-facing setting.  
**Priority:** P3

---

## Section 7 — Information Panel Rules

### 7.1 Content Hierarchy

The station panel MUST present content in this fixed order, with no reordering:

1. Station name + borough name (always above the fold)
2. Dot-matrix arrivals board (always above the fold on desktop; first scrollable section on mobile)
3. People section (demographic data)
4. Place section (historical/cultural facts)
5. Right Now section (live police incidents, Wikipedia On This Day)
6. Compare toggle (below the fold, desktop only)
7. Journey mode button (below the fold)

**Rule 7.1-A:** Items 1 and 2 (station name and arrivals board) MUST be visible without scrolling on every device. If the viewport is too small to show both without scrolling, reduce arrivals board line height to 1.4 (from current 1.8) before resorting to scrolling.  
**Priority:** P1

### 7.2 Maximum Content Per Section

| Section | Maximum items |
|---------|--------------|
| Arrivals board | 6 arrival rows |
| People — data lines | 5 lines (population density, dominant language, second language, median age, one additional) |
| Place — facts | 3 curated sentences |
| Right Now — incidents | 1 line (count + category) |
| Right Now — On This Day | 1 entry (most recent/relevant) |

**Rule 7.2-A:** The arrivals board MUST cap at 6 rows. TfL APIs return up to 20+ predictions; showing all of them breaks the dot-matrix aesthetic and requires vertical scrolling within the board, which conflicts with the panel scroll.  
**Priority:** P1

**Rule 7.2-B:** The Place section MUST contain exactly 2–3 curated fact sentences. 1 fact is too sparse (the section header outweighs the content). 4+ facts require panel scrolling on mobile to reach People/Right Now, which buries live data.  
**Priority:** P2

### 7.3 Empty States

**Rule 7.3-A:** When arrivals data is loading, the arrivals board MUST show a blinking cursor row (`> FETCHING...` in the existing style), not a blank space or spinner. The dot-matrix aesthetic demands a textual loading state.  
**Priority:** P1

**Rule 7.3-B:** When a People data item is unavailable (null in demographics.json), the row MUST NOT render at all (not show "N/A"). Showing blank slots breaks the information density and looks unfinished.  
**Priority:** P2

**Rule 7.3-C:** When Right Now data is unavailable (API failure or no incidents), the section MUST show a single line: `NO INCIDENTS REPORTED` at `--text-faint` opacity. Do not show an error message or loading spinner.  
**Priority:** P2

### 7.4 Panel Dismissal

**Rule 7.4-A:** The panel MUST be dismissible by: (1) tapping the × button, (2) pressing Escape on desktop, (3) tapping the map outside the panel. All three methods must work on both platforms.  
**Priority:** P1

**Rule 7.4-B:** On mobile, the panel MUST be dismissible by swiping down. The swipe threshold is 80px downward movement within 300ms. Do not require a full panel-height swipe.  
**Priority:** P2

---

## Section 8 — Mobile-Specific Rules

### 8.1 Touch Targets

**Rule 8.1-A:** Every interactive element MUST have a minimum touch target of 44×44px. Current compliant elements: `#panel-close` (44px, correct), `#mute-toggle` (44px min-height, correct), `#mode-toggle` and `#thermal-toggle` (44px min-height, correct). Non-compliant: `#compare-toggle` (36px min-height — must be raised to 44px), `#journey-btn` (32px min-height — must be raised to 44px).  
**Priority:** P1

**Rule 8.1-B:** Touch targets MUST have at least 8px clearance from adjacent interactive elements. Packed controls (the current `#title-controls` flex row with 8px gap) are borderline; increase gap to 10px.  
**Priority:** P2

### 8.2 Elements Hidden on Mobile

The following elements are hidden on mobile (viewport ≤600px) and MUST remain hidden:

| Element | Reason |
|---------|--------|
| `#pressure-gauge` | Decorative; small viewport real estate too precious |
| `.station-label` tooltips | Density too high; labels unreadable at typical mobile zoom |
| `#compare-toggle` | Feature requires side-by-side comparison; impractical on single column |
| `#borough-story-btn` | Story mode requires hover interactions not available on touch |

**Rule 8.2-A:** The above elements MUST be hidden via CSS `display: none` inside `@media (max-width: 600px)`. Do not hide them via JavaScript state, which is unreliable across orientation changes.  
**Priority:** P1

### 8.3 Station Panel on Mobile

The current implementation: `position: fixed; bottom: 0; height: 72vh; transform: translateY(100%)`. This is correct.

**Rule 8.3-A:** The mobile panel MUST NOT exceed **75% of viewport height**. Current 72vh is within this bound. Do not increase it — the remaining 25% viewport must remain visible so the user can see enough map context to understand they haven't left the map.  
**Priority:** P1

**Rule 8.3-B:** The panel header (station name + borough + arrivals board) MUST fit within the first 35vh of panel height. This guarantees that critical information is visible without scrolling even at 320px screen width.  
**Priority:** P2

**Rule 8.3-C:** The panel's top edge MUST display a drag handle (a 32×4px rounded bar, `#ff990044` colour) centred horizontally. This affords the swipe-to-dismiss gesture (Rule 7.4-B).  
**Priority:** P2

### 8.4 Gesture Conflicts

**Rule 8.4-A:** When the station panel is open and the user scrolls within the panel, the map below MUST NOT pan. Achieve this with `touch-action: none` on the map container (already in CSS) and `touch-action: pan-y` explicitly set on `#station-panel` and `#borough-panel` when open.  
**Priority:** P1

**Rule 8.4-B:** Pinch-to-zoom on the map MUST continue to work when the panel is open (the map is still interactive behind the panel). Do not set `pointer-events: none` on the map container while the panel is open.  
**Priority:** P2

### 8.5 Borough Panel on Mobile

**Rule 8.5-A:** The borough panel on mobile (currently `height: 65vh`) MUST NOT exceed **70% viewport height**. It is less critical than the station panel (no live data) and can afford to be shorter.  
**Priority:** P2

---

## Section 9 — Overlay Mode Rules

### 9.1 Language Portrait Mode

**Rule 9.1-A:** Language Portrait fills MUST NOT use the same hue family as any TfL line colour. Specifically: no blue family (too close to Victoria `#009DDC` and TfL navy), no green family (too close to District `#007229`), no red family (too close to Central `#E32017`).  
**Priority:** P1

**Rule 9.1-B:** Language Portrait colours MUST be legible as categorical fills — meaning they need enough chroma to be distinguishable but enough lightness to not occlude the dark map tile. Target: HSL lightness 45–65%, saturation 50–80%.  
**Priority:** P1

**Rule 9.1-C:** Language Portrait mode MUST include a legend. The legend MUST be positioned bottom-left (above the status banner if active), show language name + colour swatch, max 8 entries visible without scrolling.  
**Priority:** P2

**Rule 9.1-D:** The language toggle button MUST change its text label when active: from `LANG` to `LANG ×`. Do not rely on opacity or border changes alone to indicate active state — colour blind users must have a text affordance.  
**Priority:** P1

### 9.2 Gentrification Gradient Mode

**Rule 9.2-A:** Gentrification gradient boroughs MUST use a diverging colour scale. Recommended: `#2166ac` (stable/declining) → `#f7f7f7` (neutral, matches dark tile midtone) → `#d73027` (high gentrification). This avoids conflict with TfL colours while being maximally readable.  
**Priority:** P1

**Rule 9.2-B:** The gentrification scale MUST NOT use green for the low end. Green is the District line colour and would create a false implication that District line boroughs are less gentrified.  
**Priority:** P1

**Rule 9.2-C:** Gentrification mode MUST include a gradient legend bar (not categorical swatches). Continuous scale, positioned bottom-left, labeled with "STABLE" and "RAPID CHANGE" at the poles.  
**Priority:** P2

### 9.3 Thermal (Heatmap) Mode

**Rule 9.3-A:** The thermal overlay MUST use a black-body radiation palette: black → dark red → orange → yellow → white, representing low-to-high density. Do not use a rainbow/spectrum palette (poor perceptual linearity; colourblind-inaccessible).  
**Priority:** P1  
**Reference:** Strava Global Heatmap uses a near-identical palette for the same reason.

**Rule 9.3-B:** Thermal mode may be combined with DARK, GREEN, or LIGHT colour modes. It MUST NOT be combinable with Language Portrait or Gentrification modes (they occupy the same spatial layer). The UI must enforce mutual exclusivity.  
**Priority:** P1

**Rule 9.3-C:** Thermal overlay opacity MUST NOT exceed **0.55**. Above this level it occlude line polylines entirely in high-density central London areas.  
**Priority:** P1

### 9.4 Mode Indicator Standards

**Rule 9.4-A:** When any overlay mode is active, the corresponding button MUST display three simultaneous indicators: (1) changed text content (add ` ×`), (2) increased opacity (from 0.6 to 1.0), (3) changed text colour (the mode's accent colour). Never rely on a single indicator.  
**Priority:** P1

**Rule 9.4-B:** When entering an overlay mode, the map MUST display a 1-second brief label ("LANGUAGE PORTRAIT MODE" or equivalent) as a centred, fading overlay, then disappear. This is the confirmation signal.  
**Priority:** P3

---

## Section 10 — Disruption Communication Standards

### 10.1 Severity Levels

The status banner supports `status-red` and `status-amber` dot classes. Add a third: `status-green`.

| Severity | Colour | Dot CSS class | Meaning |
|----------|--------|---------------|---------|
| Good service | `#00cc66` | `status-green` | No disruption; all lines operating |
| Minor disruption | `#ffaa00` | `status-amber` | Delays; no line suspended |
| Severe disruption | `#ff2200` | `status-red` | Line suspended or part-suspended |

**Rule 10.1-A:** Good service MUST NOT show a banner at all. The banner should only appear when there is disruption (amber or red). A "GOOD SERVICE" banner wastes viewport real estate and trains users to ignore the banner.  
**Priority:** P1  
**Reference:** Citymapper only surfaces status messages when something is wrong; TfL Go buries good service in a collapsible.

**Rule 10.1-B:** The banner MUST show exactly one status item per disrupted line. If three lines are disrupted, show three items. Do not concatenate disruptions into one unreadable string.  
**Priority:** P1

### 10.2 Banner Auto-Dismiss

**Rule 10.2-A:** The disruption banner MUST NOT auto-dismiss. Disruption information is safety-critical UX. A user who hasn't seen the banner yet should not miss it because it auto-dismissed. The banner persists until the disruption clears (polled at the same 20-second interval as train positions).  
**Priority:** P1  
**Reference:** Neither TfL Go nor Citymapper auto-dismiss disruption alerts.

**Rule 10.2-B:** If the user actively clicks/taps the banner area, it MUST expand to show the full disruption reason text (currently the TfL "statusSeverityDescription" string). Collapsed default state shows: dot + line name + severity word only.  
**Priority:** P2

### 10.3 Bolus Appearance During Disruption

**Rule 10.3-A:** During a "Severe delays" status (amber), the affected line's boluses MUST pulse at reduced frequency: instead of continuous motion, boluses pause for 1 second every 3 seconds (stuttering effect). This communicates congestion visually without text.  
**Priority:** P3  
**Reference:** earth.nullschool.net uses particle density and speed to communicate wind strength — the same "data as physics" principle.

**Rule 10.3-B:** During a "Part suspended" or "Suspended" status (red), boluses for the affected line MUST stop and drain (fade out over 2 seconds). The line polyline remains but boluses cease. This is the strongest visual signal available.  
**Priority:** P2

**Rule 10.3-C:** Do not flash or blink the line polyline during disruption. Flashing is a seizure risk (WCAG 2.3.1 — Three Flashes) and is also visually aggressive beyond the disruption's severity.  
**Priority:** P1

### 10.4 Disruption Colour Semantics

**Rule 10.4-A:** Red (`#ff2200`) is reserved exclusively for: (1) severe disruption in the status banner, and (2) the TfL roundel ring. It MUST NOT appear in any other UI context. Overloading red dilutes its urgency signal.  
**Priority:** P1

**Rule 10.4-B:** Amber (`#ffaa00` / `#ff9900`) is the primary UI chrome colour (existing). To avoid confusion, disruption "minor delay" amber MUST use a slightly different hue: `#ffbb00` (more yellow) for the status dot specifically. This separates the UI chrome amber from the disruption amber.  
**Priority:** P2

---

## Appendix A — Priority Summary

### P1 — Must Fix Now (blocks production quality)

- Rule 1.1-A: Hide markers at zoom 10
- Rule 1.1-B: 44px touch targets for markers on mobile
- Rule 1.1-C: Add zoom-10 guard to `getRoundelCircleSize`
- Rule 1.4-B: Ghost stations must differ by 3 simultaneous visual properties
- Rule 2.1-A: Canvas bolus is primary visual — nothing except chrome renders above it
- Rule 2.1-B: Animation continues behind open panel
- Rule 3.1-A: Fix Northern line colour (currently near-invisible on dark tiles)
- Rule 3.1-B: Fix District line colour to minimum 4.5:1 contrast on dark tiles
- Rule 3.2-A: Bolus colour must differ from polyline colour
- Rule 3.2-B: No two bolus colours within 30° HSL hue
- Rule 3.4-C: Borough fill opacity cap at 0.30
- Rule 3.4-D: Language Portrait + Gentrification are mutually exclusive
- Rule 3.5-A: `--text-faint` only for decorative elements, not data values
- Rule 4.1-A: All markers have 44px mobile touch target
- Rule 5.1-A: Share Tech Mono only
- Rule 5.5-A: Wealth-weight range stays 300–600
- Rule 6.4-C: `prefers-reduced-motion` support
- Rule 7.1-A: Station name + arrivals above fold always
- Rule 7.2-A: Cap arrivals at 6 rows
- Rule 7.3-A: Loading state uses blinking cursor, not spinner
- Rule 8.1-A: `#compare-toggle` and `#journey-btn` raised to 44px touch target
- Rule 8.2-A: Hidden mobile elements hidden via CSS, not JS
- Rule 8.3-A: Mobile panel max 75vh
- Rule 8.4-A: No map pan while scrolling inside open panel
- Rule 9.1-A: Language Portrait fills avoid TfL line colour hue families
- Rule 9.1-D: Mode button shows text change when active
- Rule 9.3-A: Thermal mode uses black-body radiation palette
- Rule 9.3-B: Thermal cannot combine with Language Portrait / Gentrification
- Rule 9.3-C: Thermal opacity cap 0.55
- Rule 9.4-A: Active mode shows 3 simultaneous indicators
- Rule 10.1-A: No banner when service is good
- Rule 10.1-B: One banner item per disrupted line
- Rule 10.2-A: Banner does not auto-dismiss
- Rule 10.3-C: No flashing polylines (WCAG 2.3.1)
- Rule 10.4-A: Red reserved for severe disruption + roundel only

### P2 — Should Fix (next sprint)

Rules: 1.2-A, 1.2-C, 1.3-A through 1.3-C, 1.4-A, 1.5-A, 1.5-B, 1.6-A, 2.1-C, 2.2-A, 3.1-C, 3.4-A, 3.4-B, 4.1-B, 4.2-A, 4.2-B, 4.3-A, 4.3-B, 4.4-A, 5.2-B, 5.3-A, 5.3-B, 5.4-A, 5.4-B, 6.1-A through 6.1-E, 6.2-A through 6.2-C, 6.3-A, 6.4-B (device memory), 7.2-B, 7.3-B, 7.3-C, 7.4-A, 7.4-B, 8.1-B, 8.3-B, 8.3-C, 8.4-B, 8.5-A, 9.1-B, 9.1-C, 9.2-A through 9.2-C, 10.2-B, 10.3-B, 10.4-B

### P3 — Nice to Have (backlog)

Rules: 1.2-C (label density algorithm), 6.4-B (device memory gate), 9.4-B (mode confirmation overlay), 10.3-A (bolus stutter during delays)

---

## Appendix B — Design Invariants

These properties define the installation's identity and MUST NOT change without explicit human approval:

1. **Dark map tiles as default.** CartoDB Dark Matter is non-negotiable for the DARK mode. The amber-on-black aesthetic is the signature.
2. **Share Tech Mono as the sole typeface.** The dot-matrix aesthetic depends on it.
3. **Victoria = amber boluses.** This is established and referenced in all project documentation.
4. **District = teal boluses.** Established in Phase 2 specification.
5. **Animation is continuous.** The boluses never pause for UI interactions. The map is always alive.
6. **Two lines = two circulatory systems.** Victoria and District must feel like organs of the same body, not two separate maps.
7. **Panels are overlays, not navigation.** Opening a panel does not change the map state or stop animation.
8. **The installation is data art first, transit tool second.** Visual hierarchy decisions always prioritise the aesthetic over the functional when forced to choose.
