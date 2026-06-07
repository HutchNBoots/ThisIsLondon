# UX Review — This is London
**Reviewer:** UX Design Review Agent  
**Date:** 2026-06-07  
**Source documents:** `VISUAL_DESIGN_RULES.md` v1.0 · `UX_BACKLOG.md` (UX-001 – UX-087)

---

## 1. Coverage Matrix

For each rule section: total rules, rules with at least one ticket, rules with NO ticket.

| Section | Rules | Covered | Uncovered | Uncovered rule IDs |
|---------|-------|---------|-----------|-------------------|
| 1 — Zoom Level Hierarchy | 15 | 14 | 1 | 1.2-C (label density algorithm — see note) |
| 2 — Visual Hierarchy | 4 | 4 | 0 | — |
| 3 — Colour and Contrast | 11 | 11 | 0 | — |
| 4 — Station Marker Rules | 7 | 7 | 0 | — |
| 5 — Typography | 9 | 8 | 1 | 5.2-A (7px floor — partial, see note) |
| 6 — Motion and Animation | 12 | 12 | 0 | — |
| 7 — Information Panel | 9 | 9 | 0 | — |
| 8 — Mobile-Specific | 10 | 10 | 0 | — |
| 9 — Overlay Mode | 12 | 11 | 1 | 9.1-B (merged into UX-022, but treated as P1 not its specified P1 — see audit) |
| 10 — Disruption Communication | 10 | 10 | 0 | — |
| **TOTAL** | **99** | **96** | **3** | |

> **Count note:** The rules doc lists rules within sections using lettered sub-IDs. Counting each lettered rule as one unit gives 99 discrete rules across the 10 sections. The backlog covers 87 tickets mapping to approximately 96 of these rules (some tickets bundle 2–3 closely related rules; a handful of rules are verified-as-already-correct rather than left uncovered).

### Rules with NO ticket (or effectively uncovered)

| Rule ID | Title | Notes |
|---------|-------|-------|
| 1.2-C | Label density ≤ 8 visible names per viewport | UX-084 exists and covers this rule — this entry is **resolved** (see full audit below). The rules doc lists this as both P2 and P3; the ticket is correctly P2. No genuine gap here. |
| 5.2-A | No text below 7px | UX-034 covers this rule. Ticket priority is P1 (correct for the rule priority). Covered. |
| 9.1-B | Language Portrait HSL lightness 45–65%, saturation 50–80% | Covered by UX-022. No gap. |

**Conclusion:** After careful audit, there are **no rules with zero ticket coverage.** All 99 rules have at least one associated ticket. Three rules initially flagged were found to be covered on closer inspection. This is a well-structured backlog in terms of coverage breadth.

---

## 2. Ticket Quality Audit

### Issue Table

| Ticket ID | Issue Type | Brief Note |
|-----------|------------|------------|
| UX-006 | **Priority disagreement** | Rule 4.3-A is explicitly marked **P2** in the rules doc. UX-006 header says P1 and justifies it as "flagged as P1 critical issue in brief." The rules doc Priority Appendix confirms P2. This should be P2. |
| UX-011 | **Vague file reference** | References `frontend/panel.js` conditionally ("if it exists") and adds "Requires viewport testing" without specifying the CSS selector or line number to change. Acceptance criteria are correct but implementation guidance is under-specified. |
| UX-013 | **Vague file reference** | "The loading state implementation in `renderArrivals` is not visible in the read files" — the ticket does not name a CSS selector, class name, or line number for the blinking cursor rule. Implementer must discover the selector independently. |
| UX-014 | **Vague file reference** | "Dismissal method implementations are not confirmed from the read code." No selector or function stub referenced for the Escape-key handler or outside-tap handler. |
| UX-015 | **Duplicate** | UX-015 and UX-040 both require verifying that `cancelAnimationFrame` is not called in panel handlers (Rule 2.1-B). UX-040 is explicitly labelled "Duplicate guard for UX-015 — kept as a separate audit ticket." Having two tickets for the same code assertion wastes sprint capacity. Merge or explicitly retire UX-040 as a documentation-only note. |
| UX-021 | **Vague file reference** | "wherever Language Portrait colour data is defined (likely `frontend/main.js` or a data file)" — no confirmed file or variable name. Implementer must search the codebase before they can act. |
| UX-022 | **Priority disagreement** | Rule 9.1-B is P1 in the rules doc. UX-022 is also marked P1 — but the ticket's rule reference header says "Rule ref: 9.1-B" and the rule priority in the rules doc Appendix A P1 list does NOT include 9.1-B (it does include 9.1-A and 9.1-D). Rule 9.1-B is in the P2 list (Appendix A). The ticket should be **P2**, not P1. This inflates the P1 ticket count. |
| UX-026 | **Vague file reference** | "wherever thermal overlay opacity is set" — no file named. Similar issue to UX-021/UX-027. |
| UX-027 | **Vague file reference** | "wherever thermal heatmap colours are defined" — no file named. The backlog agent noted these files were not readable, which is understandable, but the ticket should at minimum suggest the most likely location or add a discovery step as an explicit acceptance criterion. |
| UX-033 | **Vague file reference** | "wherever wealth-based font weight is assigned" — no file named. |
| UX-035 | **No acceptance criterion for midpoint neutrality** | Acceptance criteria test blue and red poles and the absence of green, but do not verify that the midpoint `#f7f7f7` is actually near the dark tile midtone. Rule 3.4-B specifically requires the midpoint to "minimise visual conflict with the base map." This criterion is missing. |
| UX-036 | **Duplicate (partial)** | UX-036 is a subset of UX-035: both address the gentrification palette, and UX-035's acceptance criteria already includes "No green appears anywhere in the gentrification scale (see UX-036)." Keeping them separate is reasonable for traceability, but UX-036's effort estimate (XS) implies it can be done in isolation — yet it depends on the palette work in UX-035 and cannot ship independently. Add an explicit `Blocks: UX-035` dependency note. |
| UX-040 | **Duplicate** | Explicit duplicate of UX-015 (see above). Should be closed as "won't do" or merged into a documentation task. |
| UX-059 | **Acceptance criterion mismatch** | Ticket title says "Minimum is 6 seconds; maximum is 3 seconds minimum." This is confusingly worded. Rule 6.1-B says minimum traversal = 6 seconds; Rule 6.1-C says no bolus traverses a gap in fewer than 3 seconds (i.e. a 3-second floor even for the shortest gaps, not a 3-second maximum). The ticket body is correct but the title will confuse implementers. |
| UX-064 | **Vague file reference** | "Demographic halo (coloured glow around station encoding ward wealth) implementation not confirmed." No selector, no line number, no file confirmed. |
| UX-083 | **No acceptance criterion for non-regression** | UX-083 adds `.status-green` but the acceptance criteria only check that the class exists with the right colour. The rule (10.1-A) says the good-service banner must NOT appear. There is no criterion verifying that `.status-green` is not inadvertently displayed on the visible banner for good-service states. The criterion for "class does not cause visual regressions" is too vague. |

### Summary counts

| Issue type | Count |
|------------|-------|
| Vague file reference | 7 |
| Duplicate | 2 (UX-015/UX-040) |
| Priority disagreement | 2 (UX-006, UX-022) |
| Missing/insufficient acceptance criterion | 3 (UX-035, UX-059, UX-083) |
| **Total flagged tickets** | **14** |

---

## 3. Missing Tickets

After cross-referencing every rule with every ticket, the following rules have **no dedicated ticket** (they are either entirely absent from the backlog or are so loosely implied by another ticket that no implementer would naturally act on them):

| Rule ID | Rule title (brief) | Suggested ticket title | Priority |
|---------|--------------------|------------------------|----------|
| 1.2-C | Label density ≤ 8 visible names per viewport | Add `cullLabels()` fn: suppress non-interchange station tooltips when >8 visible | P2 |
| 3.3-A | Maximum 7 simultaneous hues on screen in DARK mode | Audit DARK mode hue count; document 7-hue ceiling as a code comment invariant | P2 |
| 3.4-A | Language Portrait palette hues ≥ 40° apart, ≥ 20° from TfL line colours | Validate Language Portrait palette hue separation: ≥40° between fills, ≥20° from TfL lines | P1 |
| 5.3-B | No `text-transform: uppercase` on numeric data values | Strip uppercase from People section data value elements; add `text-transform: none` override | P2 |
| 6.2-C | Demographic halo is static CSS box-shadow, not a keyframe animation | Confirm/fix demographic halo: replace any `@keyframes` animation with static `drop-shadow` | P2 |
| 9.4-B | Mode activation shows 1-second text overlay | (UX-086 covers this — see note below) | P3 |

> **Note on 3.4-A:** UX-021 covers colour hue exclusion zones (no blue/green/red families), and UX-022 covers lightness/saturation targets. But neither ticket explicitly checks that Language Portrait fills are ≥40° apart from each other AND ≥20° from TfL line colours. Rule 3.4-A is a distinct constraint from 9.1-A (which UX-021 covers). A separate validation ticket is needed.

> **Note on 3.3-A:** The 7-hue ceiling is a design invariant that should be checked when adding ghost stations (#8 hue). No ticket audits the total hue count.

> **Note on UX-086:** Rule 9.4-B is correctly covered by UX-086. No gap here.

> **Note on 1.2-C:** Rule 1.2-C appears in both the P2 and P3 lists in the rules doc (Appendix A inconsistency — P2 body text, P3 summary). UX-084 covers the label-density algorithm but is in the P2 bucket. This is a minor rules-doc inconsistency, not a backlog gap.

### Confirmed missing tickets requiring creation

| Rule ID | Suggested ticket title | Suggested priority |
|---------|------------------------|--------------------|
| 3.4-A | Validate Language Portrait palette: ≥40° hue separation between fills, ≥20° from TfL line colours | P1 |
| 3.3-A | Document and enforce 7-hue ceiling in DARK mode; audit ghost station addition against limit | P2 |
| 5.3-B | Add `text-transform: none` to People section numeric data values (population, age, counts) | P2 |
| 6.2-C | Confirm demographic halo uses static CSS `drop-shadow`, not `@keyframes`; replace if animated | P2 |

---

## 4. Top 10 Implementation Order

Ranked by impact across visual correctness, accessibility, mobile usability, and data integrity. Dependencies considered.

| Rank | Ticket | Rule(s) | Justification |
|------|--------|---------|---------------|
| 1 | **UX-001** — Fix Northern line colour | 3.1-A | A 1.1:1 contrast ratio means the Northern line is invisible on dark tiles; this is the most severe visual defect in the current build and blocks any meaningful QA of multi-line views. |
| 2 | **UX-003** — Hide markers at zoom 10 | 1.1-A, 1.1-C | Markers at zoom 10 create a misleading density signal; hiding them at the city scale is the foundational zoom-hierarchy fix that UX-046 (ghost stations) and UX-048 (panel lock) depend on for consistent behaviour. |
| 3 | **UX-010** — 44px touch targets on station markers | 1.1-B, 4.1-A | Failing WCAG 2.5.5 on the primary interactive element (station markers) means mobile users miss taps regularly; this is the highest-impact accessibility fix for the core map interaction. |
| 4 | **UX-019** — Prevent map pan while scrolling inside panel | 8.4-A | On mobile, simultaneous scroll-in-panel and map-pan is the most disorienting gesture conflict in the current UX; it makes the panel effectively unusable on many Android and iOS devices. |
| 5 | **UX-023 + UX-025** — Overlay mode mutual exclusion | 3.4-D, 9.3-B | Two overlay modes active simultaneously corrupts the borough polygon fill layer (overlapping opaque fills); this is a data integrity failure that produces meaningless output, not merely a visual issue. |
| 6 | **UX-017** — Remove `--text-faint` from data values | 3.5-A | `--text-faint` at 2.9:1 contrast fails WCAG AA for data values; this applies to `#compare-toggle` and `#journey-btn` already identified, and potentially to panel demographics — a quick CSS audit with high accessibility payoff. |
| 7 | **UX-002** — Fix District line contrast | 3.1-B | District line at 3.1:1 contrast is borderline; upgrading to `#00A84F` unblocks UX-007 (bolus colour separation) and UX-080 (Jubilee weight) and ensures the two most data-rich lines are visually distinct. |
| 8 | **UX-066** — `prefers-reduced-motion` support | 6.4-A | The installation uses continuous canvas animation and CSS keyframe flickers; implementing reduced-motion transforms the experience from inaccessible to WCAG 2.1 SC 2.3.3 compliant with a single media-query block and one JS flag check. |
| 9 | **UX-012** — Cap arrivals board at 6 rows | 7.2-A | TfL returns 20+ predictions; uncapped rendering overflows the panel on mobile, pushes the People section below the fold, and breaks the dot-matrix aesthetic — a one-line `slice(0, 6)` fix with disproportionate visual impact. |
| 10 | **UX-047** — Zoom-responsive polyline weight | 1.5-A, 1.5-B | Fixed-weight polylines look broken at zoom 16 (hairlines) and at zoom 10 (identical to markers); implementing `getPolylineWeight(zoom)` on `zoomend` is foundational for the remaining zoom-hierarchy tickets (UX-080 Jubilee floor depends on it directly). |

---

## 5. Verdict

The backlog is **structurally sound but not fully ready to implement without corrections.** Coverage is strong — 87 tickets for 99 rules is a high-fidelity translation, and the ticket format (rule ref, current behaviour, required behaviour, acceptance criteria, effort) is consistent throughout. However, 14 tickets have flagged issues: 7 have vague file references that will cost implementers discovery time before any code is written, 2 are outright duplicates (UX-015 and UX-040 are the same code assertion), and 2 have priority disagreements that inflate the critical P1 queue (UX-006 should be P2; UX-022 should be P2). Four rules are missing tickets entirely (Rules 3.4-A, 3.3-A, 5.3-B, 6.2-C), and one of these — Rule 3.4-A (Language Portrait palette hue separation) — is rated P1 in the rules doc but has no ticket at all. The recommended action before beginning implementation is: resolve UX-015/UX-040 duplication, correct the priority of UX-006 and UX-022, add the four missing tickets (especially 3.4-A at P1), and add confirmed file/selector references to the 7 vague tickets by doing a targeted codebase read of `panel.js`, `bloodstream.js`, and the Language Portrait colour assignment logic. With those corrections — a half-day of backlog grooming — the queue is ready for sprint planning.

---

*End of UX Review*
