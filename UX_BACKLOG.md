# UX Backlog — This is London
**Generated:** 2026-06-07  
**Source of truth:** `VISUAL_DESIGN_RULES.md` v1.0  
**Codebase read:** `frontend/main.js`, `frontend/bloodstream.js`, `frontend/style.css`

---

## P1 Tickets

---

### UX-001: Fix Northern line colour — near-invisible on dark tiles
**Priority:** P1  
**Rule ref:** 3.1-A  
**File(s):** `frontend/main.js`  
**Current behaviour:** `LINE_PALETTE.northern = '#231F20'` (line 15). Against `#0a0a0a` dark tile background this is contrast ratio ~1.1:1 — effectively invisible. The polyline and any Northern-line boluses rendered on canvas share this colour.  
**Required behaviour:** Change `LINE_PALETTE.northern` to `'#666666'` (recommended) or at minimum `'#4A4A4A'`. This value is used to draw the polyline on the Leaflet layer; the canvas bolus already uses its own `LINE_COLOURS.northern` in `bloodstream.js` (which has a separate fix in UX-005).  
**Acceptance criteria:**
- [ ] `LINE_PALETTE.northern` is `'#666666'` (or `'#4A4A4A'` at minimum) in `main.js`
- [ ] The Northern line polyline is visually distinguishable from the dark map tile on a `#0a0a0a` background at zoom 11–14 on a calibrated monitor
- [ ] Contrast ratio of new colour against `#0a0a0a` is ≥ 3.0:1 (non-text graphical element threshold per WCAG SC 1.4.11)
**Estimated effort:** XS

---

### UX-002: Fix District line polyline colour contrast on dark tiles
**Priority:** P1  
**Rule ref:** 3.1-B  
**File(s):** `frontend/main.js`  
**Current behaviour:** `LINE_PALETTE.district = '#007229'` (line 12). Contrast ratio against `#0a0a0a` is ~3.1:1, failing WCAG SC 1.4.11 (non-text contrast minimum 3:1 is borderline; rule requires 4.5:1 for this element).  
**Required behaviour:** Change `LINE_PALETTE.district` to `'#00A84F'`. Do not change bolus colour here — that is a separate variable in `bloodstream.js` (see UX-007).  
**Acceptance criteria:**
- [ ] `LINE_PALETTE.district` is `'#00A84F'` in `main.js`
- [ ] Contrast ratio of `#00A84F` against `#0a0a0a` is ≥ 4.5:1 (verify with a contrast checker)
- [ ] District line polyline is visually distinguishable from Northern line polyline on dark tiles
**Estimated effort:** XS

---

### UX-003: Hide station markers at zoom 10 and below
**Priority:** P1  
**Rule ref:** 1.1-A, 1.1-C  
**File(s):** `frontend/main.js`  
**Current behaviour:** `getRoundelCircleSize(zoom)` at line 106–112 returns `10` for `zoom <= 11`, meaning markers are rendered at zoom 10 (and below if reached). `makeRoundelIcon` creates and returns an icon for every zoom level. Markers are shown at zoom 10.  
**Required behaviour:** Add an explicit guard at the top of `makeRoundelIcon` (or in the `zoomend` handler at line 188) that hides/removes all station markers when `zoom <= 10`. The cleanest approach: in the `zoomend` listener, call `marker.setOpacity(0)` and `marker.options.interactive = false` when zoom ≤ 10, and restore when zoom ≥ 11. Alternatively return `null` from `makeRoundelIcon` and handle null in the caller.  
**Acceptance criteria:**
- [ ] No station marker SVGs are visible on screen at zoom 10
- [ ] No station marker SVGs are visible on screen at zoom 9 or below (if reachable)
- [ ] At zoom 11, all station markers re-appear correctly
- [ ] Line polylines remain visible at zoom 10 (only markers are hidden)
**Estimated effort:** S

---

### UX-004: Raise `#compare-toggle` touch target to 44px
**Priority:** P1  
**Rule ref:** 8.1-A  
**File(s):** `frontend/style.css`  
**Current behaviour:** `#compare-toggle` has `min-height: 36px` (line 559). This fails the 44×44px minimum touch target requirement (Apple HIG / WCAG 2.5.5).  
**Required behaviour:** Change `min-height` from `36px` to `44px` on `#compare-toggle`. Adjust `padding` if needed to preserve visual proportions (current `padding: 6px 10px` can increase to `10px 10px`).  
**Acceptance criteria:**
- [ ] `#compare-toggle` computed height is ≥ 44px at all viewport widths where it is visible
- [ ] Visual appearance of the button is not distorted (text remains centred)
**Estimated effort:** XS

---

### UX-005: Raise `#journey-btn` touch target to 44px
**Priority:** P1  
**Rule ref:** 8.1-A  
**File(s):** `frontend/style.css`  
**Current behaviour:** `#journey-btn` has `min-height: 32px` (line 923). This fails the 44px minimum touch target.  
**Required behaviour:** Change `min-height` from `32px` to `44px` on `#journey-btn`. Increase `padding` from `5px 8px` to `10px 8px` to fill the height gracefully.  
**Acceptance criteria:**
- [ ] `#journey-btn` computed height is ≥ 44px
- [ ] Button text remains vertically centred
**Estimated effort:** XS

---

### UX-006: Raise ghost flicker minimum opacity from 0.25 to 0.35
**Priority:** P1  
**Rule ref:** 4.3-A (listed P2 in rules doc but flagged as P1 critical issue in brief)  
**File(s):** `frontend/style.css`  
**Current behaviour:** The `@keyframes ghost-flicker` rule (lines 840–844) cycles: `0%, 100% { opacity: 0.6 }`, `50% { opacity: 0.25 }`, `70% { opacity: 0.55 }`. The `0.25` keyframe risks ghost station markers becoming nearly invisible, particularly on lower-contrast displays.  
**Required behaviour:** Change the `50%` keyframe value from `0.25` to `0.35`.  
**Acceptance criteria:**
- [ ] `@keyframes ghost-flicker` `50%` stop is `opacity: 0.35`
- [ ] Ghost station markers never drop below opacity 0.35 during their animation cycle
- [ ] Ghost markers remain visually distinct from live markers (live markers are at opacity 1.0)
**Estimated effort:** XS

---

### UX-007: Distinguish District line bolus colour from polyline colour in DARK mode
**Priority:** P1  
**Rule ref:** 3.2-A  
**File(s):** `frontend/bloodstream.js`  
**Current behaviour:** `LINE_COLOURS.district` in `bloodstream.js` (lines 124–128) uses `rgba(100,240,200,…)` as core and `rgba(14,184,130,…)` as mid — this is already a teal distinct from the `#007229` polyline. However the polyline colour `#007229` (UX-002 changes this to `#00A84F`) and the bolus colour must diverge by intent per the rule. Verify the bolus colour reads as `#0eb882`-equivalent teal in DARK mode. Additionally, the bolus `mid` colour `rgba(14,184,130,…)` corresponds to `#0eb882` which is the correct target.  
**Required behaviour:** Confirm/ensure `LINE_COLOURS.district.mid` is set to `rgba(14,184,130,` (hex `#0eb882`) and `core` is `rgba(100,240,200,` for DARK mode. If a mode-aware bolus colour system exists, ensure DARK mode uses these values. The bolus must not use the same green as the polyline (`#007229` / `#00A84F`).  
**Acceptance criteria:**
- [ ] District line bolus colour in DARK mode is visually teal/`#0eb882`-family, not dark green
- [ ] District bolus is distinguishable from the District polyline at zoom 13+ on a dark tile map
- [ ] District bolus is distinguishable from Victoria line amber bolus (hue separation > 30° on HSL wheel — teal ~165° vs amber ~36°: passes)
**Estimated effort:** S

---

### UX-008: Bolus colours must differ from their line polyline colours in DARK mode
**Priority:** P1  
**Rule ref:** 3.2-A  
**File(s):** `frontend/bloodstream.js`, `frontend/main.js`  
**Current behaviour:** Victoria polyline is `#009DDC` (blue). Victoria bolus `LINE_COLOURS.victoria.core` is `rgba(255,220,100,…)` (amber) — correct. Central polyline is `#E32017` (red). Central bolus `mid` is `rgba(227,32,23,…)` — this is the same red as the polyline, violating the rule. Jubilee polyline is `#A0A5A9` (grey). Jubilee bolus `mid` is `rgba(160,165,169,…)` — same grey as polyline, violating the rule. Northern polyline `#231F20` / post-fix `#666666`. Northern bolus `mid` is `rgba(100,100,100,…)` — similar grey, may be acceptable but should be lighter.  
**Required behaviour:** For DARK mode: Central bolus `core`/`mid` must be lightened to at minimum 30% luminosity increase vs the polyline. Recommended: `core: rgba(255,150,140,…)`, `mid: rgba(255,80,60,…)`. Jubilee bolus must be lightened: `core: rgba(240,240,248,…)`, `mid: rgba(200,205,210,…)`. Northern bolus should be lighter grey than the polyline.  
**Acceptance criteria:**
- [ ] Central bolus is lighter/brighter than the Central line polyline on dark tiles
- [ ] Jubilee bolus is lighter/whiter than the Jubilee line polyline on dark tiles
- [ ] For every line: bolus colour and polyline colour are distinguishable when a bolus traverses its own line
**Estimated effort:** S

---

### UX-009: No two bolus colours within 30° HSL hue simultaneously
**Priority:** P1  
**Rule ref:** 3.2-B  
**File(s):** `frontend/bloodstream.js`  
**Current behaviour:** Current DARK mode bolus colours (approximate hues): Victoria amber ~36°, District teal ~165°, Central red/pink ~5°, Jubilee white-grey ~neutral, Northern grey ~neutral. Central (~5°) and Victoria (~36°) are 31° apart — borderline. After lightening Central bolus (UX-008), verify hue separation remains > 30°.  
**Required behaviour:** After UX-008 changes, verify all five bolus mid/core hues are > 30° apart from every other active bolus hue. If Central post-lightening drifts toward orange and encroaches on Victoria amber, adjust Central toward a salmon/pink (hue ~350°, wrapping to > 30° from amber at 36°).  
⚠️ **Risk note:** Hue calculation must account for HSL wheel wrap-around (e.g. hue 5° and hue 355° are 10° apart, not 350° apart). Verify with an HSL colour wheel tool.  
**Acceptance criteria:**
- [ ] No two simultaneously-active bolus `mid` colours are within 30° on the HSL wheel
- [ ] All five bolus colours are distinguishable from each other in a side-by-side comparison on a dark background
**Estimated effort:** S

---

### UX-010: Add 44×44px touch target wrapper to all station markers on mobile
**Priority:** P1  
**Rule ref:** 1.1-B, 4.1-A  
**File(s):** `frontend/main.js`  
**Current behaviour:** `makeRoundelIcon` (lines 118–186) creates Leaflet `divIcon` with `iconSize: [totalW, cs]`. At zoom 11, `cs = 10`, so `iconSize = [10, 10]` — far below the 44px touch target minimum on mobile.  
**Required behaviour:** Wrap the SVG in a `<div>` that provides a minimum 44×44px touch area on mobile. The outer div should be `44px × 44px` with `display: flex; align-items: center; justify-content: center;`. The `iconSize` passed to `L.divIcon` should be `[Math.max(44, totalW), Math.max(44, cs)]` when on a touch device (detect via `L.Browser.touch`), with `iconAnchor` adjusted to the centre of the wrapper. The SVG inside remains its natural visual size.  
**Acceptance criteria:**
- [ ] On a mobile device (touch), tapping within a 44×44px area centred on any station marker opens the station panel
- [ ] At zoom 11 (10px dot), the tap area is still 44×44px on mobile
- [ ] The visual marker does not appear enlarged — only the hit area is enlarged
- [ ] On desktop (`L.Browser.touch === false`), original icon sizes apply (separate fix in UX-021 for 32px desktop minimum)
**Estimated effort:** M

---

### UX-011: Station name + arrivals board always visible above fold
**Priority:** P1  
**Rule ref:** 7.1-A  
**File(s):** `frontend/style.css`, `frontend/panel.js` (if it exists)  
**Current behaviour:** Unknown — requires viewport testing. The rule states if viewport is too small to show both station name and arrivals board without scrolling, reduce arrivals board `line-height` to `1.4` from the current `1.8`.  
**Required behaviour:** Ensure that on any device (minimum 320px wide, 568px tall), the station name header + borough subheader + arrivals board are all visible without scrolling when the panel is open. If they do not fit: set `.arrivals-row` (or equivalent arrivals board row selector) `line-height: 1.4` within `@media (max-height: 600px)` or when panel height is constrained.  
⚠️ **Risk note:** Requires testing on a real 320×568 device (iPhone SE first-gen equivalent). The current `72vh` panel with fixed header height may already satisfy this — verify before implementing.  
**Acceptance criteria:**
- [ ] On a 320×568px viewport, opening any station panel shows the station name and at least 3 arrivals rows without scrolling
- [ ] On a 375×667px viewport (iPhone 6/7/8 size), full arrivals board (up to 6 rows) is visible without scrolling
**Estimated effort:** S

---

### UX-012: Cap arrivals board at 6 rows maximum
**Priority:** P1  
**Rule ref:** 7.2-A  
**File(s):** `frontend/panel.js` (or wherever `renderArrivals` is implemented)  
**Current behaviour:** TfL API returns up to 20+ arrival predictions. The current `renderArrivals` function (imported in `main.js` line 2) behaviour with >6 items is unknown but the rule requires capping.  
**Required behaviour:** In `renderArrivals`, slice the arrivals array to a maximum of 6 items before rendering: `arrivals.slice(0, 6)`. Do not render a "show more" link or scroll affordance within the arrivals board.  
**Acceptance criteria:**
- [ ] When TfL API returns 10 arrivals, only the first 6 are displayed
- [ ] The arrivals board never exceeds 6 rows regardless of API response size
- [ ] The 6-row cap applies at all viewport sizes
**Estimated effort:** XS

---

### UX-013: Arrivals loading state must show blinking cursor, not blank or spinner
**Priority:** P1  
**Rule ref:** 7.3-A  
**File(s):** `frontend/panel.js`  
**Current behaviour:** Unknown — the loading state implementation in `renderArrivals` is not visible in the read files. The rule requires a specific textual loading state.  
**Required behaviour:** While arrivals data is being fetched, the arrivals board must display exactly one row with the content `> FETCHING...` in the existing arrivals board font style, with a blinking cursor character (CSS `animation: blink 1s step-end infinite`). No spinner, no blank state.  
**Acceptance criteria:**
- [ ] Opening a station panel while arrivals are loading shows `> FETCHING...` text in the arrivals board
- [ ] The text uses the same font, size, and colour as real arrivals rows
- [ ] No spinner or loading indicator of any kind appears in the arrivals board area
- [ ] The `> FETCHING...` state is replaced by real data when the fetch completes
**Estimated effort:** S

---

### UX-014: Panel dismissal via Escape key, × button, and outside-tap
**Priority:** P1  
**Rule ref:** 7.4-A  
**File(s):** `frontend/main.js`  
**Current behaviour:** Dismissal method implementations are not confirmed from the read code. The rule requires all three methods work on both platforms.  
**Required behaviour:** Ensure all three dismiss paths are implemented: (1) `#panel-close` button click/tap; (2) `document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); })` on desktop; (3) `map.on('click', closePanel)` when panel is open (but not if the click is on a station marker, which should switch panels).  
**Acceptance criteria:**
- [ ] Pressing Escape closes the station panel on desktop browsers
- [ ] Tapping × closes the station panel on mobile
- [ ] Tapping the map area outside the open panel closes it
- [ ] Tapping a different station marker while a panel is open switches to the new station (does not double-close)
**Estimated effort:** S

---

### UX-015: Canvas animation continues when station panel is open
**Priority:** P1  
**Rule ref:** 2.1-B  
**File(s):** `frontend/main.js`, `frontend/bloodstream.js`  
**Current behaviour:** Unknown — the animation loop in `bloodstream.js` may or may not check a pause flag when the panel opens.  
**Required behaviour:** The `requestAnimationFrame` loop in `bloodstream.js` must NEVER be paused, cancelled, or throttled when the station panel opens. The panel open/close events in `main.js` must not call any animation-halting function.  
**Acceptance criteria:**
- [ ] Opening the station panel does not interrupt bolus movement on any line
- [ ] Boluses continue moving at the same rate with the panel open as with it closed
- [ ] Closing the panel does not cause a visible animation stutter or restart
**Estimated effort:** XS (verify only; likely already correct — add a regression test note)

---

### UX-016: Canvas bolus layer (z-index 400) must not be occluded by non-chrome elements
**Priority:** P1  
**Rule ref:** 2.1-A  
**File(s):** `frontend/style.css`  
**Current behaviour:** `#art-layer` has `z-index: 400` (line 96 of `style.css`). The `#atmosphere-tint` has `z-index: 1` — correct. Borough fills would be added via Leaflet `L.geoJSON` which sits below the canvas by default, but must be verified when borough overlay is implemented.  
**Required behaviour:** Confirm and enforce via CSS comments: nothing with `z-index` between 2 and 399 may be a non-chrome visual element. Add a CSS comment block at the `#art-layer` rule documenting the z-index contract. If any future borough overlay element is found above z-index 399, move it below.  
**Acceptance criteria:**
- [ ] `#atmosphere-tint` z-index is < 400
- [ ] Borough boundary Leaflet layers render below the canvas (Leaflet pane z-index < 400)
- [ ] No CSS rule sets a non-panel/non-banner element above z-index 400
**Estimated effort:** XS

---

### UX-017: `--text-faint` must not be used for data values
**Priority:** P1  
**Rule ref:** 3.5-A  
**File(s):** `frontend/style.css`, `frontend/panel.js`  
**Current behaviour:** `--text-faint` is `#ff990066` (line 15 of `style.css`), which achieves approximately 2.9:1 contrast against `#0d0d0d` — failing WCAG AA (4.5:1 required). Currently used in `#compare-toggle` (line 551: `color: var(--text-faint)`) and `#journey-btn` (line 916: `color: var(--text-faint)`). May also be used for data values in panel sections.  
**Required behaviour:** Audit all uses of `var(--text-faint)` and `#ff990066`. Any use on data values, labels with meaningful content, or actionable UI elements must be changed to `var(--text-dim)` (`#ff9900aa`, ~4.8:1 contrast — passes AA). `--text-faint` is only permissible for decorative separators, ghost labels, and purely ornamental text.  
**Acceptance criteria:**
- [ ] No numeric data value, station name, borough name, or arrivals entry uses `--text-faint` colour
- [ ] `#compare-toggle` and `#journey-btn` default text colour is changed to `--text-dim` or a higher-contrast value
- [ ] All elements using `--text-faint` are verified to be decorative-only
**Estimated effort:** S

---

### UX-018: Mobile panel must not exceed 75vh
**Priority:** P1  
**Rule ref:** 8.3-A  
**File(s):** `frontend/style.css`  
**Current behaviour:** Station panel on mobile uses `height: 72vh` (per rule doc description — needs confirming in full CSS read). This is within the 75vh bound.  
**Required behaviour:** Confirm the panel is set to `72vh` (or another value ≤ 75vh) in the `@media (max-width: 600px)` block. Add a CSS comment documenting the 75vh maximum. Ensure no JS dynamically sets the height above 75vh.  
**Acceptance criteria:**
- [ ] On a 375px-wide mobile viewport, the station panel height is ≤ 75% of screen height
- [ ] At least 25% of the map is visible beneath the open panel
**Estimated effort:** XS (verify + document)

---

### UX-019: Prevent map pan when scrolling inside open panel
**Priority:** P1  
**Rule ref:** 8.4-A  
**File(s):** `frontend/style.css`, `frontend/main.js`  
**Current behaviour:** `#map-container` has `touch-action: none` (line 68 of `style.css`). This is correct for the map, but when a panel is open and the user scrolls within it, the `touch-action: none` on the map container may be causing scroll events to propagate.  
**Required behaviour:** When `#station-panel` or `#borough-panel` is in the open/visible state, set `touch-action: pan-y` explicitly on the panel elements. In JS, when the panel opens: `stationPanel.style.touchAction = 'pan-y'`. When closed: remove or reset. Do not set `pointer-events: none` on the map.  
**Acceptance criteria:**
- [ ] Scrolling within the open station panel on mobile does NOT pan the map
- [ ] The map is still pannable by touch in the map area visible behind the panel
- [ ] Pinch-to-zoom on the map area behind the panel still works
**Estimated effort:** S

---

### UX-020: Hidden mobile elements must use CSS `display: none`, not JS
**Priority:** P1  
**Rule ref:** 8.2-A  
**File(s):** `frontend/style.css`  
**Current behaviour:** The rule lists four elements that must be hidden on mobile via CSS: `#pressure-gauge`, `.station-label`, `#compare-toggle`, `#borough-story-btn`. Verify each has a `display: none` rule inside `@media (max-width: 600px)` in `style.css`.  
**Required behaviour:** Each of the four elements listed must have an explicit `display: none !important` rule inside `@media (max-width: 600px)` in `style.css`. Remove any JS-based visibility toggling for these elements that is tied to viewport width detection.  
**Acceptance criteria:**
- [ ] `#pressure-gauge` is hidden at 600px viewport width and below
- [ ] `.station-label` (Leaflet tooltip class) is hidden at 600px and below
- [ ] `#compare-toggle` is hidden at 600px and below
- [ ] `#borough-story-btn` is hidden at 600px and below
- [ ] Rotating the device (portrait → landscape) does not reveal these elements unexpectedly if viewport remains ≤ 600px wide
**Estimated effort:** S

---

### UX-021: Language Portrait fills must avoid TfL line colour hue families
**Priority:** P1  
**Rule ref:** 9.1-A  
**File(s):** wherever Language Portrait colour data is defined (likely `frontend/main.js` or a data file)  
**Current behaviour:** Language Portrait mode is referenced in `main.js` state (`languagePortraitActive`, line 33) and `languageData` (line 35). The actual colour palette for language fills is not visible in the read files — requires finding the colour assignment logic.  
**Required behaviour:** No Language Portrait fill colour may use: blue family (hues 200°–260°), green family (hues 90°–160°), or red family (hues 340°–20°). Remaining safe zones: yellow (20°–90°), purple (260°–340°). Use ColorBrewer Set3 or a custom 12-colour qualitative palette within these constraints.  
⚠️ **Risk note:** If Language Portrait data comes from an external source or user-uploaded dataset with pre-assigned colours, the colour remapping must happen client-side before rendering.  
**Acceptance criteria:**
- [ ] No Language Portrait borough fill colour has a hue between 200°–260° (blue zone)
- [ ] No fill colour has a hue between 90°–160° (green zone)
- [ ] No fill colour has a hue between 340°–20° (red zone)
- [ ] All Language Portrait colours are distinguishable from each other at HSL lightness 45–65%
**Estimated effort:** M

---

### UX-022: Language Portrait fill colours must meet categorical visibility targets
**Priority:** P1  
**Rule ref:** 9.1-B  
**File(s):** Language Portrait colour assignment code  
**Current behaviour:** Unknown — palette not visible in read files.  
**Required behaviour:** All Language Portrait fill colours must have HSL lightness 45–65% and saturation 50–80%. This ensures they are bright enough to be distinguishable against the dark map tile without occluding the polylines beneath.  
**Acceptance criteria:**
- [ ] Every Language Portrait fill colour has HSL lightness between 45% and 65%
- [ ] Every Language Portrait fill colour has HSL saturation between 50% and 80%
- [ ] Language fills remain visually separable at zoom 12 on CartoDB Dark Matter tiles
**Estimated effort:** S

---

### UX-023: Language Portrait + Gentrification modes mutually exclusive
**Priority:** P1  
**Rule ref:** 3.4-D  
**File(s):** `frontend/main.js`  
**Current behaviour:** `languagePortraitActive` (line 33) and `gentrificationActive` (line 34) are separate boolean flags with no mutual exclusion logic visible in the read lines.  
**Required behaviour:** When activating Language Portrait mode, if `gentrificationActive === true`, deactivate gentrification mode first (trigger its off-toggle). Vice versa. The UI toggle for the second mode must force-disable the first. Implement as a `setExclusiveMode(mode)` function that clears all overlay modes before activating the requested one.  
**Acceptance criteria:**
- [ ] Activating Language Portrait while Gentrification is active automatically deactivates Gentrification
- [ ] Activating Gentrification while Language Portrait is active automatically deactivates Language Portrait
- [ ] It is impossible for both `languagePortraitActive` and `gentrificationActive` to be `true` simultaneously
- [ ] The UI buttons reflect the correct active state after forced deactivation
**Estimated effort:** S

---

### UX-024: Borough fill opacity must never exceed 0.30 in any overlay mode
**Priority:** P1  
**Rule ref:** 3.4-C  
**File(s):** `frontend/main.js` (borough layer creation)  
**Current behaviour:** Borough boundary layer is created via `loadBoroughBoundaries()` (line 200). The fill opacity value is not visible in the read lines but must be verified and capped.  
**Required behaviour:** When creating or styling the `boroughLayer` with `L.geoJSON`, set `fillOpacity` to a maximum of `0.30`. In DARK mode, cap at `0.20`. Add a constant: `const MAX_BOROUGH_FILL_OPACITY = 0.30;` and reference it in the style function. Never set `fillOpacity` above this value, including in Language Portrait and Gentrification modes.  
**Acceptance criteria:**
- [ ] Borough fill opacity is ≤ 0.30 in all overlay modes on all colour themes
- [ ] Borough fill opacity is ≤ 0.20 in DARK mode
- [ ] Line polylines remain visible through the borough fill at zoom 13
**Estimated effort:** S

---

### UX-025: Language Portrait and Gentrification modes must not combine with Thermal mode
**Priority:** P1  
**Rule ref:** 9.3-B  
**File(s):** `frontend/main.js`  
**Current behaviour:** `setThermalMode` is imported from `bloodstream.js` (line 3). Its interaction with `languagePortraitActive` / `gentrificationActive` is not guarded in the visible code.  
**Required behaviour:** Thermal mode may combine with colour modes (DARK/GREEN/LIGHT) but must be mutually exclusive with Language Portrait and Gentrification modes. Use the same `setExclusiveMode` pattern from UX-023 to enforce this. When Thermal activates, deactivate LP and Gentrification.  
**Acceptance criteria:**
- [ ] Activating Thermal mode while Language Portrait is active deactivates Language Portrait
- [ ] Activating Thermal mode while Gentrification is active deactivates Gentrification
- [ ] `thermalActive`, `languagePortraitActive`, and `gentrificationActive` cannot all be true simultaneously
**Estimated effort:** S

---

### UX-026: Thermal overlay opacity must not exceed 0.55
**Priority:** P1  
**Rule ref:** 9.3-C  
**File(s):** wherever thermal overlay opacity is set  
**Current behaviour:** Thermal mode opacity implementation not visible in read files.  
**Required behaviour:** The thermal heatmap canvas or layer must have a maximum opacity of `0.55`. Add a constant `const MAX_THERMAL_OPACITY = 0.55` and enforce it when setting opacity. At central London zoom levels (13+), line polylines must remain visible through the thermal layer.  
**Acceptance criteria:**
- [ ] Thermal overlay opacity is ≤ 0.55 at all zoom levels
- [ ] Victoria and District line polylines are visible through the thermal overlay at zoom 13 in central London
**Estimated effort:** S

---

### UX-027: Thermal mode must use black-body radiation palette
**Priority:** P1  
**Rule ref:** 9.3-A  
**File(s):** wherever thermal heatmap colours are defined  
**Current behaviour:** Thermal colour palette not visible in read files.  
**Required behaviour:** The thermal overlay must use a black-body radiation colour ramp: `#000000` (no density) → `#3d0000` → `#8b0000` → `#cc3300` → `#ff6600` → `#ffaa00` → `#ffff00` → `#ffffff` (maximum density). Do NOT use a rainbow/spectrum palette. Implement as an array of colour stops passed to the heatmap renderer.  
**Acceptance criteria:**
- [ ] Thermal palette progresses from black/dark-red through orange to yellow/white
- [ ] No green, cyan, or blue appears in the thermal palette
- [ ] Low-density areas are dark (near-black), matching the dark map tile
**Estimated effort:** S

---

### UX-028: Status banner must not appear for "Good service" state
**Priority:** P1  
**Rule ref:** 10.1-A  
**File(s):** `frontend/main.js`  
**Current behaviour:** The status banner behaviour for good service is unknown from the read code. The `#status-banner` element exists (line 796 of CSS).  
**Required behaviour:** When all lines have good service (no disruptions), the `#status-banner` must be hidden (`display: none` or `visibility: hidden`). The banner must only become visible when at least one line has a severity level of amber or red.  
**Acceptance criteria:**
- [ ] When TfL API returns good service for all five lines, the status banner is not visible
- [ ] When any line has a disruption, the banner becomes visible
- [ ] The banner disappears when the disruption clears (on next poll)
**Estimated effort:** S

---

### UX-029: Status banner shows one item per disrupted line
**Priority:** P1  
**Rule ref:** 10.1-B  
**File(s):** `frontend/main.js`  
**Current behaviour:** Status banner rendering implementation not visible in read files.  
**Required behaviour:** The banner must render one row per disrupted line, not concatenate all disruptions into a single string. If Victoria and Northern are disrupted: show two separate rows, each with the line's dot indicator + line name + severity word.  
**Acceptance criteria:**
- [ ] When two lines are disrupted, the banner shows two distinct rows
- [ ] Each row is independently readable (line name + severity, e.g. `● NORTHERN  MINOR DELAYS`)
- [ ] Disruption text never concatenates multiple lines into one run-on string
**Estimated effort:** S

---

### UX-030: Status banner must not auto-dismiss
**Priority:** P1  
**Rule ref:** 10.2-A  
**File(s):** `frontend/main.js`, `frontend/style.css`  
**Current behaviour:** Auto-dismiss implementation not confirmed from read files.  
**Required behaviour:** Remove any `setTimeout` or CSS animation that dismisses the status banner automatically. The banner must persist until the disruption status resolves (i.e., until the 20-second polling cycle confirms good service).  
**Acceptance criteria:**
- [ ] The banner remains visible for at least 60 seconds without user interaction during an active disruption
- [ ] No CSS `animation` or JS timer removes the banner automatically
- [ ] The banner disappears only when TfL API confirms disruption has cleared
**Estimated effort:** XS

---

### UX-031: Red (`#ff2200`) reserved exclusively for severe disruption and roundel ring
**Priority:** P1  
**Rule ref:** 10.4-A  
**File(s):** `frontend/style.css`, `frontend/main.js`  
**Current behaviour:** The roundel ring colour `ROUNDEL_RED = '#E21836'` (line 103 of `main.js`) is the TfL authentic red — correct. The `status-red` CSS class (line 829) uses `background: #ff2200` — separate red for disruption. Verify no other UI element uses a red family colour.  
**Required behaviour:** Audit all CSS rules and JS colour values for any red-family colour (`#ff…`, `#cc…`, `rgba(r, g, b)` where r > 200 and g < 80 and b < 80) outside of: (1) `ROUNDEL_RED` / `#E21836`, (2) `.status-red` / `#ff2200`. Any other use of red must be changed.  
**Acceptance criteria:**
- [ ] No CSS colour in a non-roundel, non-disruption context uses a red hue (0°–20° on HSL wheel with saturation > 60%)
- [ ] A search for `#ff` in `style.css` returns only amber accent colours, the status-red class, and documented exceptions
**Estimated effort:** S

---

### UX-032: Share Tech Mono must be the only typeface
**Priority:** P1  
**Rule ref:** 5.1-A  
**File(s):** `frontend/style.css`  
**Current behaviour:** `body` uses `font-family: 'Share Tech Mono', monospace` (line 58). SVG text in `makeRoundelIcon` uses `font-family="'Share Tech Mono',monospace"` (line 173 of `main.js`). The Curtain Raise uses Share Tech Mono explicitly (lines 896, 902 of CSS). Appears correct.  
**Required behaviour:** Confirm via CSS audit that no element uses a different `font-family` value. `monospace` as a fallback is acceptable. Any use of `Arial`, `sans-serif`, `Helvetica`, or any named font other than `Share Tech Mono` must be removed.  
**Acceptance criteria:**
- [ ] `grep -r "font-family" frontend/` returns only `Share Tech Mono` and `monospace` generic fallback
- [ ] No external font other than Share Tech Mono is loaded (check `@import` and `<link>` tags)
**Estimated effort:** XS

---

### UX-033: Wealth-weight label range must stay 300–600
**Priority:** P1  
**Rule ref:** 5.5-A  
**File(s):** wherever wealth-based font weight is assigned  
**Current behaviour:** Wealth-signal font weight system implementation not visible in read files.  
**Required behaviour:** The font-weight range for wealth-signal labels must be clamped: `Math.min(600, Math.max(300, computedWeight))`. Weight 700 (bold) and 100 (thin) must not be used. Add a constant `const WEALTH_WEIGHT_MIN = 300; const WEALTH_WEIGHT_MAX = 600;`.  
**Acceptance criteria:**
- [ ] No station label or borough label receives `font-weight` > 600 or < 300 from the wealth mapping
- [ ] The wealth-weight computation function clamps output to [300, 600]
**Estimated effort:** XS

---

### UX-034: No text may be set below 7px
**Priority:** P1  
**Rule ref:** 5.2-A  
**File(s):** `frontend/style.css`  
**Current behaviour:** Current font sizes in CSS include `font-size: 8px` (e.g. `#compare-toggle` line 553, `#journey-btn` line 919). Section labels at `8px`. The gauge label is referenced at 7px in the rules as the current floor.  
**Required behaviour:** Audit all `font-size` values in `style.css`. Any value below `7px` must be raised to `7px`. Add a CSS comment at the top of `style.css` documenting the 7px floor.  
**Acceptance criteria:**
- [ ] `grep "font-size" frontend/style.css` returns no value below `7px`
- [ ] All text on screen is legible (physically ≥ 7px rendered pixels) at 1x pixel density
**Estimated effort:** XS

---

### UX-035: Gentrification mode must use diverging palette (blue → neutral → orange/red)
**Priority:** P1  
**Rule ref:** 9.2-A, 3.4-B  
**File(s):** wherever Gentrification colour scale is defined  
**Current behaviour:** Gentrification data exists as `gentrificationData` (line 37 of `main.js`) but colour implementation not visible.  
**Required behaviour:** Use the diverging scale: `#2166ac` (stable/declining income change) → `#f7f7f7` (midpoint, no change) → `#d73027` (high gentrification/income change). The midpoint must be a near-neutral matching the dark tile midtone. Implement as a continuous interpolation function across this 3-stop gradient.  
**Acceptance criteria:**
- [ ] Low-gentrification boroughs render in blue (`#2166ac` family)
- [ ] Neutral boroughs render in near-white/light-grey (`#f7f7f7` family)
- [ ] High-gentrification boroughs render in red-orange (`#d73027` family)
- [ ] No green appears anywhere in the gentrification scale (see UX-036)
**Estimated effort:** S

---

### UX-036: Gentrification palette must not use green for the low end
**Priority:** P1  
**Rule ref:** 9.2-B  
**File(s):** wherever Gentrification colour scale is defined  
**Current behaviour:** Unknown — see UX-035.  
**Required behaviour:** Green (hue 90°–160°) must not appear at any point in the gentrification colour scale. The low end must be blue (`#2166ac`) as per UX-035. Document this constraint in a code comment adjacent to the palette definition: `// No green: would imply District line boroughs are less gentrified`.  
**Acceptance criteria:**
- [ ] No gentrification fill colour has a hue between 90° and 160°
- [ ] The palette transitions from blue through neutral to red/orange with no green intermediate
**Estimated effort:** XS (part of UX-035, but kept separate as an independent constraint)

---

### UX-037: Active overlay mode button shows 3 simultaneous indicators
**Priority:** P1  
**Rule ref:** 9.4-A  
**File(s):** `frontend/style.css`, `frontend/main.js`  
**Current behaviour:** `#thermal-toggle.active` (line 531 of CSS) has some active styling. The Language Portrait and Gentrification toggle active states are not visible in the read files.  
**Required behaviour:** When any overlay mode button is active, it MUST simultaneously show: (1) changed text content (add ` ×` suffix to button label, e.g. `LANG ×`), (2) opacity raised from `0.6` to `1.0`, (3) text colour changed to the mode's accent colour. Implement for all three overlay mode buttons.  
**Acceptance criteria:**
- [ ] Active Language Portrait button shows text `LANG ×`, opacity 1.0, and a distinct accent colour
- [ ] Active Gentrification button shows text `GENT ×` (or equivalent), opacity 1.0, and a distinct accent colour
- [ ] Active Thermal button shows appended ` ×`, opacity 1.0, and a distinct accent colour
- [ ] Inactive state of each button shows original text (no ` ×`), opacity 0.6
**Estimated effort:** S

---

### UX-038: Language Portrait mode button shows text change when active
**Priority:** P1  
**Rule ref:** 9.1-D  
**File(s):** `frontend/main.js`, `frontend/style.css`  
**Current behaviour:** Language Portrait toggle button state implementation not visible in read files.  
**Required behaviour:** When Language Portrait mode is active, the toggle button label MUST change from `LANG` to `LANG ×`. This text change is in addition to visual indicators (UX-037). The text change must be implemented in JS (`button.textContent = 'LANG ×'`) not via CSS pseudo-elements, so that screen readers announce the state change.  
**Acceptance criteria:**
- [ ] Language Portrait active: button text reads `LANG ×`
- [ ] Language Portrait inactive: button text reads `LANG`
- [ ] Screen reader announces the text change when mode is toggled
**Estimated effort:** XS

---

### UX-039: Do not flash or blink line polylines during disruption
**Priority:** P1  
**Rule ref:** 10.3-C  
**File(s):** `frontend/main.js`, `frontend/style.css`  
**Current behaviour:** Disruption visual implementation not visible in read files.  
**Required behaviour:** When a line is disrupted, do NOT add a CSS `animation` or keyframe blink to the Leaflet polyline or its container. The only permitted visual changes during disruption are: bolus speed reduction (amber) or bolus drain (red). The polyline itself must remain static and solid.  
**Acceptance criteria:**
- [ ] During a simulated disruption state, the affected line's polyline does not flash, blink, or pulse
- [ ] No `animation` or `@keyframes` rule is applied to Leaflet `.leaflet-overlay-pane` paths during disruption
- [ ] Test with `prefers-reduced-motion: reduce` also passes (animation off entirely)
**Estimated effort:** XS (guard implementation)

---

### UX-040: Station panel open/close does not pause animation (explicit regression guard)
**Priority:** P1  
**Rule ref:** 2.1-B  
**File(s):** `frontend/main.js`  
**Current behaviour:** (Duplicate guard for UX-015 — kept as a separate audit ticket)  
**Required behaviour:** Add a comment in `main.js` at the panel open/close handler: `// Animation intentionally NOT paused — Rule 2.1-B`. If a `cancelAnimationFrame` call is found in any panel handler, remove it.  
**Acceptance criteria:**
- [ ] No `cancelAnimationFrame` call appears in panel open/close handlers
- [ ] Comment documents the animation-continuity invariant
**Estimated effort:** XS

---

## P2 Tickets

---

### UX-041: Hide station name labels below zoom 16 (persistent tooltips only at 16+)
**Priority:** P2  
**Rule ref:** 1.2-A, 5.4-A  
**File(s):** `frontend/main.js`  
**Current behaviour:** Leaflet tooltip permanence behaviour not confirmed from read lines. Labels may be showing persistently below zoom 16.  
**Required behaviour:** In the `zoomend` listener (line 188 of `main.js`), check current zoom. If zoom < 16: set all Leaflet tooltips to `permanent: false` (hover-only). If zoom ≥ 16: set tooltips to `permanent: true`. Use `marker.getTooltip().options.permanent = ...` or unbind/rebind tooltips.  
**Acceptance criteria:**
- [ ] At zoom 14, station name tooltips only appear on hover
- [ ] At zoom 15, station name tooltips only appear on hover
- [ ] At zoom 16, station name tooltips are always visible (permanent)
- [ ] Zoom transition between 15 and 16 switches tooltip permanence without page reload
**Estimated effort:** S

---

### UX-042: Station labels hidden on mobile at all zoom levels
**Priority:** P2  
**Rule ref:** 1.2-B  
**File(s):** `frontend/style.css`  
**Current behaviour:** Rule states `display: none !important` on `.station-label` in mobile CSS is already correct and must not be removed.  
**Required behaviour:** Verify the rule exists. Add a CSS comment: `/* Rule 1.2-B: labels hidden on mobile at all zoom levels — do not remove */`. Ensure it is inside `@media (max-width: 600px)`.  
**Acceptance criteria:**
- [ ] `.station-label` (Leaflet tooltip class for station names) has `display: none !important` at viewport ≤ 600px
- [ ] No JS code removes this CSS rule or overrides it
**Estimated effort:** XS

---

### UX-043: Borough boundaries hidden below zoom 11
**Priority:** P2  
**Rule ref:** 1.3-A  
**File(s):** `frontend/main.js`  
**Current behaviour:** Borough layer implementation starts at `loadBoroughBoundaries()` (line 200) but visibility-by-zoom logic is unknown.  
**Required behaviour:** In the `zoomend` handler, hide borough boundary layers when zoom ≤ 10. Show them when zoom ≥ 11. Use `boroughLayer.setStyle({ opacity: 0, fillOpacity: 0 })` at zoom ≤ 10 and restore at zoom ≥ 11.  
**Acceptance criteria:**
- [ ] Borough boundary lines are not visible at zoom 10
- [ ] Borough boundary lines appear at zoom 11
**Estimated effort:** S

---

### UX-044: Borough boundaries in overlay modes visible one zoom level earlier (zoom 11)
**Priority:** P2  
**Rule ref:** 1.3-B  
**File(s):** `frontend/main.js`  
**Current behaviour:** Borough fill behaviour in overlay modes not confirmed.  
**Required behaviour:** In Language Portrait and Gentrification modes, borough fills must be visible starting at zoom 11 (not 12 as in neutral mode). The existing `zoomend` visibility logic must be mode-aware.  
**Acceptance criteria:**
- [ ] At zoom 11 in Language Portrait mode, borough fills are visible
- [ ] At zoom 10 in Language Portrait mode, borough fills are NOT visible
- [ ] In neutral mode at zoom 11, borough fills are NOT visible (only boundary strokes)
**Estimated effort:** S

---

### UX-045: Borough boundaries not interactive below zoom 12
**Priority:** P2  
**Rule ref:** 1.3-C  
**File(s):** `frontend/main.js`  
**Current behaviour:** Borough layer interactivity not confirmed.  
**Required behaviour:** At zoom < 12, set `boroughLayer.setStyle({ interactive: false })`. At zoom ≥ 12, restore `interactive: true`. Handle in `zoomend` listener.  
**Acceptance criteria:**
- [ ] Clicking/tapping on a borough area at zoom 11 does not trigger the borough panel
- [ ] Clicking/tapping on a borough area at zoom 12 opens the borough panel
**Estimated effort:** S

---

### UX-046: Ghost stations hidden below zoom 13
**Priority:** P2  
**Rule ref:** 1.4-A  
**File(s):** `frontend/main.js`  
**Current behaviour:** Ghost station rendering implementation not visible in read files.  
**Required behaviour:** Ghost station markers must not be added to the map or must be hidden when `map.getZoom() < 13`. In the `zoomend` handler, iterate ghost station markers and set `marker.setOpacity(0)` / `marker.options.interactive = false` when zoom < 13.  
**Acceptance criteria:**
- [ ] No ghost station marker is visible at zoom 12 or below
- [ ] Ghost stations appear at zoom 13 at 50% opacity (no label)
- [ ] Ghost stations at zoom 14+ show full ghost rendering with label
**Estimated effort:** S

---

### UX-047: Line polyline weight scales with zoom (10 levels)
**Priority:** P2  
**Rule ref:** 1.5-A, 1.5-B  
**File(s):** `frontend/main.js`  
**Current behaviour:** Polyline creation does not appear to have zoom-responsive weight in the read code. Leaflet polylines use a fixed `weight` option by default.  
**Required behaviour:** Create a `getPolylineWeight(zoom)` function returning: `zoom<=10: 2, zoom==11: 2.5, zoom==12: 3, zoom==13: 4, zoom==14: 5, zoom==15: 6, zoom>=16: 7`. In `zoomend` listener, update every line's polyline: `linePolyline.setStyle({ weight: getPolylineWeight(zoom) })`.  
**Acceptance criteria:**
- [ ] At zoom 10, line polylines have 2px stroke weight
- [ ] At zoom 13, line polylines have 4px stroke weight
- [ ] At zoom 16, line polylines have 7px stroke weight
- [ ] Weight updates are applied on `zoomend` without requiring page reload
**Estimated effort:** S

---

### UX-048: Station panel only opens at zoom 12 and above
**Priority:** P2  
**Rule ref:** 1.6-A  
**File(s):** `frontend/main.js`  
**Current behaviour:** Station marker click handlers are registered for all zoom levels.  
**Required behaviour:** In the station marker click handler, add a guard: `if (map.getZoom() < 12) return;`. This prevents accidental panel opens at city-scale zoom.  
**Acceptance criteria:**
- [ ] Clicking/tapping a station marker at zoom 11 does NOT open the station panel
- [ ] Clicking/tapping a station marker at zoom 12 DOES open the station panel
**Estimated effort:** XS

---

### UX-049: Atmosphere tint must never exceed 0.18 opacity
**Priority:** P2  
**Rule ref:** 2.1-C  
**File(s):** `frontend/main.js`  
**Current behaviour:** `updateAtmosphere()` (lines 68–80) sets `rgba(40, 5, 0, 0.15)`, `rgba(0, 5, 20, 0.12)`, or `rgba(20, 10, 0, 0.13)` — all below 0.18. Currently correct.  
**Required behaviour:** Add a constant `const MAX_ATMOSPHERE_OPACITY = 0.18;` and validate all three tint values against it. Add a code comment documenting the limit. Ensure no future additions to `updateAtmosphere` exceed this cap.  
**Acceptance criteria:**
- [ ] All rgba alpha values in `updateAtmosphere()` are ≤ 0.18
- [ ] A named constant `MAX_ATMOSPHERE_OPACITY` is defined and referenced
**Estimated effort:** XS

---

### UX-050: Interchange station renders single roundel with concentric ring
**Priority:** P2  
**Rule ref:** 2.2-A, 4.2-A, 4.2-B  
**File(s):** `frontend/main.js`  
**Current behaviour:** `stationMarkers` (line 22) appears to be keyed by station ID. If Victoria and District share a station ID (e.g. Victoria station `940GZZLUVIC`), only one marker may render — but the logic is not confirmed.  
**Required behaviour:** For stations served by more than one active line: (1) render only ONE `L.marker` at the coordinates; (2) the primary roundel uses the highest-ridership line's colours; (3) add a concentric SVG ring at 1.5× the main roundel radius with a 2px stroke in the second line's colour. Identify interchange stations from `stationData` by checking if any two line sequences share the same station ID (e.g. Victoria `940GZZLUVIC` appears in both `VICTORIA_SEQUENCE_IDS` and `DISTRICT_BRANCHES.spine`).  
⚠️ **Risk note:** Requires building an interchange station lookup table from the sequence data. Medium complexity.  
**Acceptance criteria:**
- [ ] Victoria station shows one marker (not two stacked)
- [ ] The marker has a secondary concentric ring indicating the second line
- [ ] Westminster, Green Park, and other interchange stations also show single markers with rings
**Estimated effort:** L

---

### UX-051: Ghost station ring uses dashed stroke
**Priority:** P2  
**Rule ref:** 1.4-B, 4.3-A  
**File(s):** `frontend/main.js`, `frontend/style.css`  
**Current behaviour:** Ghost station rendering implementation not fully visible. `ghost-station-marker` CSS class exists (line 834) but SVG stroke style is unknown.  
**Required behaviour:** Ghost station SVG roundel ring must use `stroke-dasharray="4 3"` (4px dash, 3px gap). Colour must be `#666666` (not `#E21836`). Bar colour must be `#444444`. Overall opacity 0.45–0.60 (handled by `ghost-flicker` animation).  
**Acceptance criteria:**
- [ ] Ghost station ring stroke is dashed (4px dash, 3px gap) in the SVG
- [ ] Ghost station ring colour is `#666666`
- [ ] Ghost station bar colour is `#444444`
- [ ] A live station and ghost station at the same zoom are distinguishable by at least 3 visual properties simultaneously
**Estimated effort:** M

---

### UX-052: Ghost station markers must not have glow drop-shadow
**Priority:** P2  
**Rule ref:** 4.3-B  
**File(s):** `frontend/style.css`  
**Current behaviour:** `.ghost-station-marker` CSS (lines 834–838) does not appear to have a `filter: drop-shadow`. Verify there is no hover or pseudo-element adding a glow.  
**Required behaviour:** Ensure `.ghost-station-marker` and `.ghost-station-marker:hover` have explicitly `filter: none` or no filter property. Do not inherit glow from parent `.roundel-marker` hover rules.  
**Acceptance criteria:**
- [ ] Ghost station markers have no drop-shadow or glow in default state
- [ ] Ghost station markers have no drop-shadow or glow on hover
**Estimated effort:** XS

---

### UX-053: Hover state glow uses line colour (not generic accent) for all five lines
**Priority:** P2  
**Rule ref:** 4.4-A  
**File(s):** `frontend/style.css`  
**Current behaviour:** CSS hover rules for `victoria-station` use `drop-shadow(0 0 6px var(--accent))` and `district-station` uses `drop-shadow(0 0 6px #0eb882)` (from rule doc description). Central, Jubilee, Northern hover states not confirmed.  
**Required behaviour:** Add explicit hover rules for each line: `.central-station:hover { filter: drop-shadow(0 0 6px #E32017); }`, `.jubilee-station:hover { filter: drop-shadow(0 0 6px #A0A5A9); }`, `.northern-station:hover { filter: drop-shadow(0 0 6px #666666); }`. Update `.victoria-station:hover` to use `#009DDC` not the generic `--accent`. Update `.district-station:hover` to use `#0eb882`.  
**Acceptance criteria:**
- [ ] Hovering a Victoria station shows a blue glow (`#009DDC`)
- [ ] Hovering a District station shows a teal glow (`#0eb882`)
- [ ] Hovering a Central station shows a red glow (`#E32017`)
- [ ] Hovering a Jubilee station shows a silver glow (`#A0A5A9`)
- [ ] Hovering a Northern station shows a dark-grey glow (`#666666`)
**Estimated effort:** S

---

### UX-054: Data values must be at least 2px larger than their data labels
**Priority:** P2  
**Rule ref:** 5.2-B  
**File(s):** `frontend/style.css`, `frontend/panel.js`  
**Current behaviour:** Sizes from the spec table: data value = 11px desktop / 13px mobile; data label = 9px desktop / 13px mobile. On mobile, data value and data label are the same size (13px each) — this violates the "at least 2px larger" rule.  
**Required behaviour:** On mobile (`@media (max-width: 600px)`): data value must be at minimum `13px`, data label must be `11px` (reducing label from 13px to 11px, maintaining 2px separation). Or raise data value to 15px. Choose the option that preserves readability at 320px width.  
**Acceptance criteria:**
- [ ] On desktop: data value font-size is ≥ data label font-size + 2px
- [ ] On mobile: data value font-size is ≥ data label font-size + 2px
**Estimated effort:** XS

---

### UX-055: Letter spacing must not exceed 4px for any running text
**Priority:** P2  
**Rule ref:** 5.3-A  
**File(s):** `frontend/style.css`  
**Current behaviour:** `#curtain-line1` has `letter-spacing: 12px` (line 899 of CSS). This is a display title element, not running text. Station name in panel should be 4px. Need to verify panel section labels and other running text.  
**Required behaviour:** Audit all `letter-spacing` values in `style.css`. Any running text (station names, borough names, data labels, arrivals text, status banner, tooltips) must have `letter-spacing ≤ 4px`. The curtain-raise title at 12px is display text and may be exempt if it is purely decorative/not a running paragraph.  
⚠️ **Note:** The curtain-raise `12px` letter-spacing is borderline. If the curtain-raise text contains full words/phrases that must be read, reduce to 4px. If it is a stylistic reveal of known text (the installation title), document the exception.  
**Acceptance criteria:**
- [ ] No running text (arrivals, panel content, tooltips, status banner) has `letter-spacing > 4px`
- [ ] Curtain-raise exemption is documented if kept above 4px
**Estimated effort:** XS

---

### UX-056: Do not apply `text-transform: uppercase` to numeric data values
**Priority:** P2  
**Rule ref:** 5.3-B  
**File(s):** `frontend/style.css`, `frontend/panel.js`  
**Current behaviour:** Panel styles likely inherit `text-transform: uppercase` from section headers. Numeric values (population density, median age, etc.) must not be uppercased.  
**Required behaviour:** Add `text-transform: none` to data value elements in the People section. Station names and borough names may remain uppercase. Arrivals board text (mixed case, e.g. `Brixton`) should also not be forcibly uppercased.  
**Acceptance criteria:**
- [ ] Population numbers, ages, and other numeric values render in their natural case
- [ ] `text-transform: uppercase` is not applied to any numeric or mixed-case data value
**Estimated effort:** XS

---

### UX-057: Permanent labels at zoom 16+ must render at 0.80 opacity
**Priority:** P2  
**Rule ref:** 5.4-B  
**File(s):** `frontend/main.js`, `frontend/style.css`  
**Current behaviour:** Leaflet tooltip opacity for permanent labels not confirmed.  
**Required behaviour:** When tooltips are switched to `permanent: true` at zoom 16 (per UX-041), also set their opacity to `0.80`. Use Leaflet's `tooltip.setOpacity(0.80)` or apply a CSS rule: `.leaflet-tooltip { opacity: 0.80; }` scoped to a class added at high zoom.  
**Acceptance criteria:**
- [ ] At zoom 16+, station name tooltips are rendered at opacity 0.80
- [ ] Tooltips do not appear at full 1.0 opacity at zoom 16+
**Estimated effort:** XS

---

### UX-058: Maximum 40 boluses simultaneously across all lines
**Priority:** P2  
**Rule ref:** 6.1-A  
**File(s):** `frontend/bloodstream.js`, `frontend/main.js`  
**Current behaviour:** Bolus culling logic not visible in read lines of `bloodstream.js`.  
**Required behaviour:** In the train data processing, after receiving `trainState.trains`, sort by `fetched_at` recency and slice to 40: `trains.slice(0, 40)`. Add a constant `const MAX_BOLUSES = 40;`. If more than 40 active trains exist, cull the ones with oldest position updates.  
**Acceptance criteria:**
- [ ] With simulated 50 active trains, only 40 boluses appear on screen
- [ ] The 40 retained are the most recently updated
- [ ] `MAX_BOLUSES` constant is defined and used
**Estimated effort:** S

---

### UX-059: Minimum bolus traversal time is 6 seconds; maximum is 3 seconds minimum
**Priority:** P2  
**Rule ref:** 6.1-B, 6.1-C  
**File(s):** `frontend/bloodstream.js`  
**Current behaviour:** `AVG_TRAVEL_MS = 90000` (line 118). Animation speed calculation not visible in read lines.  
**Required behaviour:** In the bolus animation interpolation, clamp traversal time: minimum 6 seconds (`MIN_TRAVERSAL_MS = 6000`), maximum such that no gap is traversed in fewer than 3 seconds (`MIN_TRAVERSAL_MS_FLOOR = 3000` for the shortest gaps). For the shortest gap (Bank–Monument ~0.3km), calculate traversal time and ensure it is ≥ 3000ms. For longer gaps, ensure traversal is ≥ 6000ms.  
**Acceptance criteria:**
- [ ] Boluses never visually traverse a station gap in less than 3 seconds
- [ ] The Bank–Monument bolus traversal takes ≥ 3 seconds
- [ ] Long-distance boluses (e.g. Wimbledon–Wimbledon Park) take ≥ 6 seconds
**Estimated effort:** M

---

### UX-060: Bolus trail length between 30%–60% of inter-station distance
**Priority:** P2  
**Rule ref:** 6.1-D  
**File(s):** `frontend/bloodstream.js`  
**Current behaviour:** Trail rendering implementation not visible in read lines.  
**Required behaviour:** The fading tail behind each bolus dot must have length between 30% and 60% of the current inter-station segment distance. Add constants `TRAIL_MIN_RATIO = 0.30; TRAIL_MAX_RATIO = 0.60;` and clamp the trail length calculation.  
**Acceptance criteria:**
- [ ] Trail length is visibly longer than a dot but shorter than the full station gap
- [ ] Trail length does not visually merge with adjacent station markers
**Estimated effort:** M

---

### UX-061: Bolus glow radius must not exceed 12px at leading edge
**Priority:** P2  
**Rule ref:** 6.1-E  
**File(s):** `frontend/bloodstream.js`  
**Current behaviour:** Glow radius implementation not visible in read lines.  
**Required behaviour:** In the canvas glow rendering, cap the radial gradient outer radius at `12` pixels: `ctx.createRadialGradient(x, y, 0, x, y, Math.min(12, glowRadius))`. Add constant `MAX_GLOW_RADIUS = 12;`.  
**Acceptance criteria:**
- [ ] No bolus glow extends beyond 12px from the leading dot centre
- [ ] With all 5 lines active, bolus glows do not visually merge into a single light field in dense central London areas
**Estimated effort:** S

---

### UX-062: Station arrival flares complete in ≤ 1.2 seconds
**Priority:** P2  
**Rule ref:** 6.2-A  
**File(s):** `frontend/bloodstream.js` or wherever pulse rings are animated  
**Current behaviour:** `FLARE_WINDOW_MS = 60000` (line 119 of `bloodstream.js`) — this appears to be the window for detecting recent arrivals, not the flare animation duration itself.  
**Required behaviour:** The CSS or canvas animation for the station arrival pulse ring must complete its full expand-and-fade cycle in ≤ 1200ms. If using CSS: `animation-duration: 1.2s`. If using canvas: cap the flare lifespan to `1200` frames-equivalent.  
**Acceptance criteria:**
- [ ] A station arrival flare is gone from screen within 1.2 seconds of starting
- [ ] A second arrival at the same station within the 1.2s window shows a fresh flare (no compound lingering)
**Estimated effort:** S

---

### UX-063: Maximum 6 simultaneous pulse rings; 7th is suppressed
**Priority:** P2  
**Rule ref:** 6.2-B  
**File(s):** `frontend/bloodstream.js` or wherever pulse rings are managed  
**Current behaviour:** Pulse ring count limiting not confirmed.  
**Required behaviour:** Maintain a `activeFlares` array. When a new flare would trigger, check `activeFlares.length >= 6`. If true, suppress the new flare. When a flare completes, remove it from `activeFlares`. Add constant `MAX_SIMULTANEOUS_FLARES = 6;`.  
**Acceptance criteria:**
- [ ] Simulating 7 simultaneous arrivals shows no more than 6 pulse rings on screen
- [ ] The 7th flare is silently suppressed (no error, no queuing)
**Estimated effort:** S

---

### UX-064: Demographic halo uses CSS box-shadow, not repeating keyframe animation
**Priority:** P2  
**Rule ref:** 6.2-C  
**File(s):** `frontend/style.css`, `frontend/main.js`  
**Current behaviour:** Demographic halo (coloured glow around station encoding ward wealth) implementation not confirmed.  
**Required behaviour:** The demographic halo MUST be implemented as a static CSS `box-shadow` or SVG `filter: drop-shadow(…)` — not a `@keyframes` animation. Remove any `animation` property from demographic halo elements. The halo value may update when the station data changes, but must not animate continuously.  
**Acceptance criteria:**
- [ ] Demographic halos do not flicker, pulse, or animate in normal operation
- [ ] The halo is a static glow that updates when station data changes
- [ ] `prefers-reduced-motion: reduce` does not need to suppress halos (they're already static)
**Estimated effort:** S

---

### UX-065: UI transition durations within 150ms–600ms range
**Priority:** P2  
**Rule ref:** 6.3-A  
**File(s):** `frontend/style.css`  
**Current behaviour:** Station panel transition not confirmed from first 100 lines. `#compare-toggle` has `transition: all 150ms` (line 558) — correct. `#journey-btn` has `transition: all 150ms` (line 921) — correct. `#atmosphere-tint` has `transition: background-color 2s ease` (line 84) — **exceeds 600ms**. The atmosphere tint is specifically called out in the rules table as `2000ms ease (current — correct)` — so this is a documented exception.  
**Required behaviour:** Audit all CSS `transition` and `animation-duration` values. Any transition below 150ms (except hover micro-interactions on buttons) or above 600ms (except documented exceptions: atmosphere tint 2000ms, tile layer crossfade 600ms, curtain raise 1200ms) must be adjusted.  
**Acceptance criteria:**
- [ ] Station panel open/close transition is 300ms ease-out
- [ ] Borough panel open/close transition is 300ms ease-out
- [ ] Mode toggle transition is 400ms ease
- [ ] Documented exceptions (atmosphere tint, curtain raise) are preserved with code comments
**Estimated effort:** S

---

### UX-066: Reduced motion support — animation suppression
**Priority:** P2  
**Rule ref:** 6.4-A  
**File(s):** `frontend/style.css`, `frontend/bloodstream.js`, `frontend/main.js`  
**Current behaviour:** `@media (prefers-reduced-motion: reduce)` handling not visible in read files.  
**Required behaviour:** Add a `@media (prefers-reduced-motion: reduce)` block in `style.css` that: disables `ghost-flicker` animation (`animation: none`), disables all pulse ring animations. In `bloodstream.js`, check `window.matchMedia('(prefers-reduced-motion: reduce)').matches` — if true, render boluses as static position dots (no movement, no trail, no glow). Atmosphere tint transition must be set to `transition: none`.  
**Acceptance criteria:**
- [ ] With `prefers-reduced-motion: reduce` active, boluses appear as static dots at last-known positions
- [ ] With reduced motion, ghost stations do not flicker
- [ ] With reduced motion, no pulse rings appear
- [ ] With reduced motion, atmosphere tint changes instantly (no 2s transition)
- [ ] The map still shows all station markers and line polylines (installation becomes a static live-position map)
**Estimated effort:** M

---

### UX-067: Place section contains exactly 2–3 fact sentences
**Priority:** P2  
**Rule ref:** 7.2-B  
**File(s):** `frontend/panel.js`, data source for station facts  
**Current behaviour:** Unknown — `renderPanelSections` (imported in `main.js` line 2) handles this.  
**Required behaviour:** The Place section must display 2–3 curated sentences only. If the data source has 1 fact, show it but log a data-quality warning. If the data source has 4+ facts, display only the first 3. Add a `PLACE_FACTS_MAX = 3; PLACE_FACTS_MIN = 2;` constraint in the render logic.  
**Acceptance criteria:**
- [ ] Place section never shows more than 3 sentences
- [ ] Place section never shows 0 sentences (empty state is handled by UX-068)
**Estimated effort:** XS

---

### UX-068: Null People data rows must not render (no N/A placeholders)
**Priority:** P2  
**Rule ref:** 7.3-B  
**File(s):** `frontend/panel.js`  
**Current behaviour:** Unknown.  
**Required behaviour:** In the People section rendering, filter out any data items where the value is `null`, `undefined`, or an empty string before building the row HTML. Do not render a row with empty content or "N/A" text.  
**Acceptance criteria:**
- [ ] Opening a station with incomplete demographics data shows only the rows that have values
- [ ] No row displays "N/A", "—", or empty content
- [ ] Removing null rows does not create visible gaps in the panel layout
**Estimated effort:** XS

---

### UX-069: Right Now empty state shows `NO INCIDENTS REPORTED` at `--text-faint` opacity
**Priority:** P2  
**Rule ref:** 7.3-C  
**File(s):** `frontend/panel.js`  
**Current behaviour:** Unknown.  
**Required behaviour:** When Right Now data is unavailable (API failure, network error, or no incidents), render exactly: `<span class="right-now-empty">NO INCIDENTS REPORTED</span>` with CSS `color: var(--text-faint)`. No spinner, no error message, no blank space.  
**Acceptance criteria:**
- [ ] Simulating API failure shows `NO INCIDENTS REPORTED` in faint text
- [ ] When incidents exist, normal incident data replaces this message
**Estimated effort:** XS

---

### UX-070: Panel swipe-down to dismiss (mobile)
**Priority:** P2  
**Rule ref:** 7.4-B  
**File(s):** `frontend/main.js`  
**Current behaviour:** Swipe-to-dismiss not confirmed in read code.  
**Required behaviour:** Add touch event listeners to `#station-panel`: on `touchstart` record Y position; on `touchmove` calculate delta; on `touchend` if delta Y > 80px within 300ms, dismiss panel. Do not require a full panel-height swipe.  
**Acceptance criteria:**
- [ ] Swiping down 80px or more within 300ms on the station panel dismisses it
- [ ] Slow swipes (>300ms to reach 80px) do not dismiss the panel
- [ ] Swipe-to-dismiss does not interfere with scrolling within the panel content
**Estimated effort:** M

---

### UX-071: Desktop marker minimum click target 32×32px
**Priority:** P2  
**Rule ref:** 4.1-B  
**File(s):** `frontend/main.js`  
**Current behaviour:** At zoom 11, `iconSize = [10, 10]` on desktop — below the 32px minimum click target.  
**Required behaviour:** On non-touch (`!L.Browser.touch`) devices, set the minimum `iconSize` to `[32, 32]` with adjusted `iconAnchor` for the zoom-11 dot. The SVG visual remains 10px; the icon wrapper is 32px.  
**Acceptance criteria:**
- [ ] On desktop at zoom 11, clicking within a 32×32px area centred on a station dot opens the station panel
- [ ] Visual dot size remains 10px (not enlarged)
**Estimated effort:** S

---

### UX-072: Touch target clearance 10px between adjacent controls
**Priority:** P2  
**Rule ref:** 8.1-B  
**File(s):** `frontend/style.css`  
**Current behaviour:** `#title-controls` flex row has `gap: 8px` (per rule doc). This is borderline — must be raised to 10px.  
**Required behaviour:** Change `#title-controls` flex gap from `8px` to `10px`.  
**Acceptance criteria:**
- [ ] `gap` value on `#title-controls` (or equivalent control bar container) is ≥ 10px
- [ ] No two interactive controls overlap or have less than 10px clearance between their touch targets
**Estimated effort:** XS

---

### UX-073: Panel drag handle visible on mobile
**Priority:** P2  
**Rule ref:** 8.3-C  
**File(s):** `frontend/style.css`, `frontend/main.js` (or `index.html`)  
**Current behaviour:** Drag handle not confirmed in CSS.  
**Required behaviour:** Add a `<div id="panel-drag-handle"></div>` as the first child of `#station-panel`. CSS: `width: 32px; height: 4px; border-radius: 2px; background: #ff990044; margin: 8px auto 0; display: none;`. Inside `@media (max-width: 600px)`: `display: block`. This affords the swipe-to-dismiss gesture.  
**Acceptance criteria:**
- [ ] A 32×4px rounded bar is visible at the top of the panel on mobile
- [ ] The bar colour is `#ff990044` (semi-transparent amber)
- [ ] The bar is centred horizontally
- [ ] The bar is not visible on desktop
**Estimated effort:** XS

---

### UX-074: Pinch-to-zoom works on map when panel is open
**Priority:** P2  
**Rule ref:** 8.4-B  
**File(s):** `frontend/style.css`, `frontend/main.js`  
**Current behaviour:** `#map-container` has `touch-action: none`. This may prevent pinch gestures when the panel is open.  
**Required behaviour:** Do NOT set `pointer-events: none` on `#map-container` when the panel is open. `touch-action: none` on the map container is correct for Leaflet (Leaflet handles its own touch events). Ensure the panel's `touch-action: pan-y` (UX-019) does not propagate to the map container.  
**Acceptance criteria:**
- [ ] With station panel open, pinching on the visible map area changes zoom level
- [ ] Pinch gesture does not trigger unwanted panel interaction
**Estimated effort:** S

---

### UX-075: Borough panel on mobile must not exceed 70vh
**Priority:** P2  
**Rule ref:** 8.5-A  
**File(s):** `frontend/style.css`  
**Current behaviour:** Borough panel is `height: 65vh` per the rule doc. Currently within bounds.  
**Required behaviour:** Confirm the `@media (max-width: 600px)` rule for `#borough-panel` sets `height` to a value ≤ 70vh. Add a CSS comment documenting the 70vh cap.  
**Acceptance criteria:**
- [ ] `#borough-panel` height on mobile is ≤ 70vh
- [ ] At least 30% of the viewport shows map context behind the open borough panel
**Estimated effort:** XS

---

### UX-076: Language Portrait legend — bottom-left, max 8 entries visible
**Priority:** P2  
**Rule ref:** 9.1-C  
**File(s):** `frontend/main.js`, `frontend/style.css`  
**Current behaviour:** Language Portrait legend not confirmed in read files.  
**Required behaviour:** When Language Portrait mode activates, render a legend panel `#lang-legend` positioned `bottom-left` (above status banner if active): fixed position, `bottom: 60px; left: 12px`. Show language name + colour swatch pairs. Cap visible entries at 8 (scroll within legend if more). Use Share Tech Mono at 9px.  
**Acceptance criteria:**
- [ ] Language Portrait legend appears bottom-left when mode is active
- [ ] Legend disappears when mode is deactivated
- [ ] At most 8 entries are visible without scrolling
- [ ] Legend does not overlap the status banner
**Estimated effort:** M

---

### UX-077: Gentrification gradient legend bar bottom-left
**Priority:** P2  
**Rule ref:** 9.2-C  
**File(s):** `frontend/main.js`, `frontend/style.css`  
**Current behaviour:** Gentrification legend not confirmed.  
**Required behaviour:** When Gentrification mode activates, render a horizontal gradient legend bar `#gent-legend`: `bottom: 60px; left: 12px; width: 120px; height: 12px`. The bar should be a CSS `linear-gradient(to right, #2166ac, #f7f7f7, #d73027)`. Labels: `STABLE` on the left, `RAPID CHANGE` on the right, in Share Tech Mono 7px.  
**Acceptance criteria:**
- [ ] Gentrification legend appears when mode is active and disappears when deactivated
- [ ] Legend shows a continuous gradient bar (not categorical swatches)
- [ ] `STABLE` and `RAPID CHANGE` labels are at left and right poles
**Estimated effort:** M

---

### UX-078: Disruption banner expands to full reason text on tap/click
**Priority:** P2  
**Rule ref:** 10.2-B  
**File(s):** `frontend/main.js`  
**Current behaviour:** Status banner expand/collapse not confirmed.  
**Required behaviour:** Default banner state: dot + line name + severity word only. On click/tap: expand to show `statusSeverityDescription` string from TfL API below the summary line. Implement as a `#status-banner.expanded` class toggle, with `max-height: 0` → `max-height: 200px` transition.  
**Acceptance criteria:**
- [ ] Clicking the banner reveals the full disruption description
- [ ] Clicking again collapses it
- [ ] The expand/collapse animates (not instant)
**Estimated effort:** S

---

### UX-079: Disrupted line boluses drain and fade over 2 seconds during suspension
**Priority:** P2  
**Rule ref:** 10.3-B  
**File(s):** `frontend/bloodstream.js`, `frontend/main.js`  
**Current behaviour:** Bolus drain on line suspension not confirmed.  
**Required behaviour:** When a line's status changes to "Suspended" or "Part Suspended" (red severity), existing boluses for that line must fade out over 2 seconds and stop animating. Implement a `drainingLines` set; boluses for lines in `drainingLines` apply an opacity multiplier that decrements from 1.0 to 0 over 120 frames at 60fps (2000ms).  
**Acceptance criteria:**
- [ ] Simulating "Suspended" status for Victoria: Victoria boluses fade out over ~2 seconds
- [ ] After drain, no new Victoria boluses appear until suspension clears
- [ ] Victoria polyline remains visible during and after bolus drain
**Estimated effort:** M

---

### UX-080: Jubilee line polyline minimum 3px weight on dark tiles
**Priority:** P2  
**Rule ref:** 3.1-C  
**File(s):** `frontend/main.js`  
**Current behaviour:** Polyline weight is currently fixed (no zoom-responsive weight until UX-047 is implemented). Default Leaflet weight is 3px, so this may already be met.  
**Required behaviour:** After implementing UX-047, add a special case for Jubilee: `jubileePolyline.setStyle({ weight: Math.max(3, getPolylineWeight(zoom)) })` — ensuring it never drops below 3px even at zoom 10 where the general table gives 2px.  
**Acceptance criteria:**
- [ ] Jubilee line polyline is never thinner than 3px at any zoom level
- [ ] At zoom 10, Jubilee renders at 3px while other lines render at 2px
**Estimated effort:** XS (addendum to UX-047)

---

### UX-081: Panel header fits within 35vh of panel height on mobile
**Priority:** P2  
**Rule ref:** 8.3-B  
**File(s):** `frontend/style.css`  
**Current behaviour:** Panel header height not confirmed.  
**Required behaviour:** The combined height of station name + borough name + arrivals board within `#station-panel` must be ≤ 35vh. If the arrivals board at 6 rows exceeds this, reduce row height to 1.4 line-height within this constraint.  
**Acceptance criteria:**
- [ ] On a 568px-tall mobile screen, station name + borough + arrivals board fit within the first 35% of panel height (≤ 199px)
- [ ] The People section header is visible without scrolling on a 375×812px screen
**Estimated effort:** S

---

### UX-082: Minor disruption amber dot uses `#ffbb00` (distinct from UI chrome amber)
**Priority:** P2  
**Rule ref:** 10.4-B  
**File(s):** `frontend/style.css`  
**Current behaviour:** `status-amber` class uses `background: #ffaa00` (line 830). The UI chrome uses `--accent: #ff9900`. These are similar amber tones.  
**Required behaviour:** Change `.status-amber` background colour from `#ffaa00` to `#ffbb00` (more yellow, less orange) to create visual separation from the UI chrome `#ff9900`.  
**Acceptance criteria:**
- [ ] `.status-amber` dot renders in `#ffbb00`
- [ ] `#ffbb00` is visually distinguishable from `#ff9900` (UI chrome) on both dark and light backgrounds
**Estimated effort:** XS

---

### UX-083: Add `status-green` CSS class for good service indicator
**Priority:** P2  
**Rule ref:** 10.1 (table), Section 10 setup  
**File(s):** `frontend/style.css`  
**Current behaviour:** Only `.status-red` and `.status-amber` dot classes exist (line 829–830). No `.status-green`.  
**Required behaviour:** Add `.status-green { background: #00cc66; }` to `style.css`. This class is for use by the banner system when/if it shows a non-banner indicator, and for any programmatic status checking. (The banner itself does not show for good service per UX-028, but the class should exist for completeness and future use.)  
**Acceptance criteria:**
- [ ] `.status-green` CSS class exists with `background: #00cc66`
- [ ] Class does not cause visual regressions when applied to the existing dot span structure
**Estimated effort:** XS

---

### UX-084: Label density must not exceed 8 visible station names per viewport
**Priority:** P2  
**Rule ref:** 1.2-C  
**File(s):** `frontend/main.js`  
**Current behaviour:** Label density capping not implemented.  
**Required behaviour:** On `moveend` and `zoomend`, count visible station tooltips within `map.getBounds()`. If count > 8, hide tooltips for single-line (non-interchange) stations preferentially. Restore hidden tooltips when count drops below 8. Implement as a `cullLabels()` function called on map move and zoom.  
⚠️ **Risk note:** This is algorithmically complex. The interchange station lookup (UX-050) must be complete first, as it determines which stations have priority.  
**Acceptance criteria:**
- [ ] At no point are more than 8 station name labels simultaneously visible
- [ ] Interchange stations retain their labels longer than single-line stations when culling
**Estimated effort:** L

---

## P3 Tickets

---

### UX-085: Low device memory reduces max boluses to 20
**Priority:** P3  
**Rule ref:** 6.4-B  
**File(s):** `frontend/main.js`, `frontend/bloodstream.js`  
**Current behaviour:** No device memory gate.  
**Required behaviour:** At initialisation, check `navigator.deviceMemory`. If `navigator.deviceMemory < 2` (or undefined, as older browsers don't support this), set `MAX_BOLUSES = 20` instead of 40. This is a progressive enhancement; if the API is unsupported, fall back to 40.  
**Acceptance criteria:**
- [ ] On a device reporting `deviceMemory < 2`, no more than 20 boluses are animated
- [ ] On a device without `deviceMemory` API, 40 boluses are used (default behaviour unchanged)
**Estimated effort:** XS

---

### UX-086: Mode activation shows 1-second confirmation overlay
**Priority:** P3  
**Rule ref:** 9.4-B  
**File(s):** `frontend/main.js`, `frontend/style.css`  
**Current behaviour:** No mode confirmation overlay.  
**Required behaviour:** When entering an overlay mode, display a centred, fading text overlay for 1 second (e.g. `LANGUAGE PORTRAIT MODE`). Implement as a `#mode-confirm` div: `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 11px; letter-spacing: 3px; opacity: 0; animation: modeConfirm 1s ease forwards`. The animation fades in quickly (0→0.8) then fades out. Must be suppressed under `prefers-reduced-motion`.  
**Acceptance criteria:**
- [ ] Activating Language Portrait shows "LANGUAGE PORTRAIT MODE" text for ~1 second then disappears
- [ ] The overlay does not block map interaction during its display
- [ ] The overlay does not appear on deactivation (only on activation)
- [ ] Suppressed when `prefers-reduced-motion: reduce` is active
**Estimated effort:** S

---

### UX-087: Boluses stutter (pause 1s every 3s) during "Severe Delays" amber status
**Priority:** P3  
**Rule ref:** 10.3-A  
**File(s):** `frontend/bloodstream.js`  
**Current behaviour:** No stutter behaviour during delay status.  
**Required behaviour:** When a line has amber ("Severe delays") status, its boluses should pause forward movement for 1 second out of every 3 seconds. Implement as a time-based toggle in the animation loop: `(Date.now() % 3000) < 1000 ? pauseMovement() : continueMovement()` for affected lines. Boluses remain visible but stationary during the pause phase.  
⚠️ **Risk note:** This visual effect is a "data as physics" metaphor (Rule 10.3-A reference). Verify with stakeholder that the stuttering reads as "congestion" and not as a rendering bug before shipping.  
**Acceptance criteria:**
- [ ] During simulated amber status for Victoria: Victoria boluses visibly stutter
- [ ] Non-affected lines continue smooth animation
- [ ] Stutter is suppressed under `prefers-reduced-motion: reduce`
**Estimated effort:** M

---

*End of UX Backlog*
