# POSTER_BACKLOG.md — Art Direction: Alan Rogers "Speed Underground" (1930)

**Reference**: Alan Rogers 1930 London Underground poster — cream paper ground,
deep charcoal geometry, TfL red (#C8102E) and powder blue (#4F9ED4) accents,
Bauhaus/Johnston letterforms, flat bold shapes, no gradients, geometric precision.

---

## ✅ SHIPPED (this session)

| Item | Notes |
|---|---|
| POSTER-001 | Poster colour palette CSS vars (cream, charcoal, red, blue) |
| POSTER-002 | Light mode → "poster mode": cream bg, charcoal text, red accent |
| POSTER-003 | Dark mode → "underground mode": deep charcoal (not black) with cream text |
| POSTER-004 | `Bebas Neue` display font for all headings, titles, labels |
| POSTER-005 | Title overlay redesigned as poster banner (thick border, bold banner type) |
| POSTER-006 | Panel redesign: flat, opaque, geometric borders — no backdrop blur |
| POSTER-007 | Line toggle pills: rectangular labels, poster-coloured |
| POSTER-008 | Mobile bottom bar: flat horizontal strip, poster style |
| POSTER-009 | Map warm filter: sepia+contrast on light mode for paper feel |
| POSTER-010 | Curtain raise: poster reveal style, Bebas Neue type |
| POSTER-011 | Roundel marker: crisper, more like actual LU roundel |
| POSTER-012 | Polylines: bolder weight with poster-palette colours |
| POSTER-013 | Panel section headers: bold uppercase banner strips |
| POSTER-014 | Arrivals board: dot-matrix → vintage departure-board letterpress |

---

## 🔲 FUTURE BACKLOG

### Phase B — Visual polish

| ID | Description | Effort |
|---|---|---|
| POSTER-015 | Custom map style: reduce CartoDB to just roads + buildings outline, no fill colours — let tube lines dominate visually | L |
| POSTER-016 | "No map" poster mode: hide tiles entirely, show only tube network on cream background like the actual tube map | L |
| POSTER-017 | Pressure gauge face redesign: Art Deco clock/barometer face, tick marks, geometric needle | M |
| POSTER-018 | Station panel header: thick coloured band at top in line colour (like poster banner) | S |
| POSTER-019 | Borough panel header: banner treatment matching station panel | S |
| POSTER-020 | Paper grain texture: SVG feTurbulence noise overlay at 3% opacity for aged-paper tactility | S |
| POSTER-021 | Art Deco border motif: repeating geometric dash pattern on panel edges (double-rule, like 1930s print) | M |
| POSTER-022 | Roundel animation: station markers draw-on with a stroke animation when first revealed at zoom | M |
| POSTER-023 | Line polylines: offset parallel lines for shared track (District + Circle side by side, 4px gap) rather than overlap | L |

### Phase C — Typography

| ID | Description | Effort |
|---|---|---|
| POSTER-024 | Station name labels: all-caps, generous letter-spacing, no lower case | S |
| POSTER-025 | "Section" headers in panels (PEOPLE / PLACE / RIGHT NOW): bold banner strips with bg colour | S |
| POSTER-026 | Curtain raise line 2: animate letter-by-letter reveal in poster style | M |
| POSTER-027 | Borough names on map: large, ghosted, uppercase — like old ordnance survey | M |

### Phase D — Interaction

| ID | Description | Effort |
|---|---|---|
| POSTER-028 | Mode toggle cycles: LIGHT → POSTER → DARK (poster = no map tiles, cream only) | M |
| POSTER-029 | Poster export: "Save as poster" button generates a static SVG/canvas snapshot in poster style | L |
| POSTER-030 | Print stylesheet: `@media print` renders the map as a poster-format print | M |

### Phase E — Animation

| ID | Description | Effort |
|---|---|---|
| POSTER-031 | First-load line reveal: each tube line polyline animates on with stroke-dasharray, staggered 300ms per line | M |
| POSTER-032 | Bolus colour update: adjust bolus palettes to match poster restricted palette (amber → red, teal → blue) | S |
| POSTER-033 | Panel slide animation: panels animate in with a "printing press" wipe from top rather than slide from side | M |

---

## Design Principles Extracted from Reference

1. **Palette discipline**: Max 4 colours in any composition — cream, charcoal, red, blue
2. **No gradients**: Every colour is flat and opaque
3. **Geometry first**: Circles, rectangles, horizontals — no organic curves in UI chrome
4. **Typography as architecture**: Letters as structural elements, not decoration
5. **Negative space**: Generous empty space is part of the design
6. **Thick rules**: Border lines are structural, minimum 2px, often 4px
7. **Uppercase always**: No lowercase in headers or labels
8. **Contrast**: Every element must read at a glance — nothing subtle or ambiguous
