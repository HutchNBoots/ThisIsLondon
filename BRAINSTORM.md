# BRAINSTORM.md — "This is London"

> Generated at M1 (brainstorm stage). This is the creative brief that informs PLAN.md. Do not edit after plan approval.

---

## 1. What's Wrong With the Baseline

The three baseline features are **a TfL app with a dark theme**. Here's the honest critique:

**Live Transit Map:** A pulsing dot at a station is a loading spinner, not art. It communicates "train approaching" but says nothing about what it means to be *on* that train — who else is on it, what neighbourhood it's threading through. The Victoria Line rendered on a dark Leaflet map gives you something that looks like every other transport visualisation project on Observable HQ. The map is too literal. It shows geography when it should show *texture*.

**Retro Platform Display Board:** The dot-matrix panel is the piece's strongest baseline idea and also its most undercooked. Right now it's a widget — pops up, shows three trains, closes. It has no relationship to anything else on screen. The aesthetic is purely decorative (the dot matrix) rather than load-bearing (the dot matrix *communicates something the data is actually saying*). The panel could be the voice of the city. Instead it's a tooltip.

**Demographic & Vibe Overlay:** "Toggle a layer" is the most dashboard-brained thing you can do with data. Layers are how GIS analysts think. Nobody walks through Stockwell thinking "I am now entering a ward with 34% higher deprivation index." They *feel* it — in the architecture, the shopfronts, the faces, the noise. A toggle is a cop-out. The data needs to bleed into the visual environment rather than sit on top of it as a translucent polygon.

**Common thread:** all three features treat data as information to be *displayed* rather than sensation to be *felt*.

---

## 2. The "Art Moment" — 3 Candidates

### Candidate A: The Bloodstream ✅ RECOMMENDED

**What does the user see/feel?**

The Victoria Line is not rendered as a line. It is rendered as a circulatory system — a vertical artery down the screen, pulsing with a slow biological rhythm. Train positions are not dots. They are *boluses of light*, thick amber pulses that push through the artery at the speed of real transit. As a bolus approaches a station, the station node flares — not with a circle, but with a radiating halo that bleeds colour into the surrounding map according to that station's demographic data. Brixton flares differently to Victoria. You feel the difference.

**Data fusion:**
- TfL arrival predictions → bolus speed and position along the artery path
- ONS deprivation index per ward → halo colour (warm amber-red for high deprivation, cooler blue-amber for wealthy wards)
- Time of day → overall pulse rate (faster during rush hour, slower at 2am)
- Police incident count → subtle arrhythmia in the pulse timing when a station has elevated incident rates. Not an overlay. A skip in the heartbeat.

**Technical approach:** Canvas 2D / p5.js. The artery is a bezier path. Boluses are radial gradient objects animated along it with `requestAnimationFrame`. Halo flares use layered circles with decreasing opacity — no WebGL needed. Canvas element sits beneath a Leaflet map at ~40% opacity so geography remains present.

**Buildable in 7 days?** Yes. The artery path is static (16 known station coordinates). Bolus animation is parametric path traversal. Halo colour is a one-time lookup from static JSON.

**Phase 2:** Multiple lines create a full circulatory system. Real-time passenger counts change bolus *diameter* — you see the morning crush.

---

### Candidate B: The Newspaper Front Page

**What does the user see/feel?**

The entire interface is a living broadsheet newspaper. The map is typeset like a 1960s Tube diagram reproduced in newsprint — Johnston font, tight column grids, heavy rules. The newspaper is *today's newspaper*, and its text is generated from the data. The headline rewrites itself: "VICTORIA LINE CARRIES 12,000 SOULS THIS HOUR." Station panels look like classified ad columns. When a train is delayed, the headline grows, goes red like a late edition splash.

**Data fusion:** TfL live arrivals → headlines; ONS demographics → station copy; Police API → tone of language; time of day → newspaper edition (morning / afternoon / late night).

**Technical approach:** Pure HTML/CSS grid + CSS animations. Lowest-tech candidate.

**Buildable in 7 days?** Yes — but the hard part is writing good copy templates. Machine-generated newspaper copy filling a broadsheet grid will feel uncanny in a bad way. Ruled out as the primary art moment.

---

### Candidate C: The Thermal Portrait

**What does the user see/feel?**

The map is replaced by a thermal image of the line corridor — heat-sensitive film from above. Station clusters glow white-hot where population density and income converge (Green Park, Victoria), fading to deep amber-red in residential stretches, cooling to dark burnt sienna at the outer reaches. Live trains are thermal plumes moving through a cold city. Nothing is labelled. The user reads it like a photograph.

**Data fusion:** ONS income + deprivation → base thermal colour; police density → hot spots; time of day → image cools at night; TfL train positions → mobile heat plumes.

**Technical approach:** WebGL fragment shader, or Canvas 2D with layered radial gradients and `globalCompositeOperation: 'screen'`.

**Buildable in 7 days?** Tight. The WebGL path requires shader knowledge. Canvas 2D approximation is feasible but produces ~75% of the visual impact. Recommended as **Phase 2** — render it perfectly or don't render it.

---

## 3. Recommended Art Moment: The Bloodstream

The bloodstream metaphor earns its place because it is *true*. The Underground is London's circulatory system. This is not a decorative metaphor imposed on the data — it is the data finding its correct form. Every design decision flows naturally from it: the pulsing rhythm is real (timetabled frequency), the bolus size can encode real load, the arrhythmia is caused by real incident data.

The newspaper (B) will produce awkward machine-generated copy. The thermal portrait (C) requires interpretive work before anything is legible — it is a Phase 2 idea. The Bloodstream works immediately at two levels: someone who knows nothing about data visualisation understands within three seconds that light is moving through a vein. Someone who does see the halo colours and starts decoding the demographic layer.

It also earns the retro TfL aesthetic. The amber glow of a bolus against a dark map is exactly the colour of those old roundel signs. The piece feels like looking at the Underground from inside — which is the right emotional register for "This is London."

---

## 4. Supporting Features — Beyond the Baseline

### i. The Station Heartbeat Panel
Clicking a station opens a full-height sidebar that animates in like a platform door sliding open. Top section: dot-matrix arrival board (retained from baseline). Below it: a slowly scrolling feed in the same dot-matrix font showing micro-facts in complete sentences — not statistics. "One in three residents here was born outside the UK." "This station opened in 1969, three weeks before the moon landing." Closing animation: platform door slides shut.

### ii. The Line Pressure Gauge
A single vertical analogue gauge on the left edge of the screen — rendered as a vintage pressure dial — showing the aggregate ratio of trains running vs. scheduled. Sits in the green/amber/red range ambient information. No number shown. Only the visual. Peripheral, always visible.

### iii. Arrival Sound Layer
When a bolus reaches a station, a very short, very quiet audio cue: the percussive knock of a tube door, or a sine-wave tone tuned to that station's position on the line (lower station = lower pitch). Optional/mutable. In a gallery context the accumulating rhythmic texture of arrivals becomes part of the atmosphere. Web Audio API, single AudioContext, one pre-loaded buffer played at varying pitches.

### iv. The Borough Portrait Strip
At the very bottom of the screen — outside the map frame — a narrow horizontal filmstrip of algorithmically-generated silhouette cityscapes based on OS Open Data building heights. Each station's section looks subtly different: denser towers near Vauxhall, lower rooflines near Stockwell. As boluses travel the line, they cast a travelling amber reflection across this strip.

---

## 5. The Atmosphere Layer — Riding the Line

The Victoria Line compresses one of Europe's most extreme social journeys into 21 minutes: Brixton's gentrification tension → Stockwell's Latin American and Portuguese communities → Vauxhall's glassy offices → the dead centre of institutional London → Zone 2-3 north. The piece should feel that.

**Background colour temperature** shifts as a function of line position. The near-black base carries a barely perceptible tint:
- **Brixton / Stockwell:** black with a warm, almost-red undertone
- **Victoria / Green Park:** cools to a neutral blue-black — the cold black of money and marble
- **Seven Sisters / Tottenham:** back to warm, amber-brown rather than red
- **Walthamstow:** a slightly greenish warmth — a neighbourhood that has retained something pre-gentrification

These shifts are subliminal, not labelled. A user who stares at the Brixton end and moves to Green Park should *feel* that something has changed without naming it.

**Typography weight as wealth signal:** Station labels near wealthy stations (Green Park, Victoria) are rendered at a slightly heavier weight. Labels in less wealthy areas use a lighter weight — not smaller, not secondary, just somehow more tentative. A 2-pixel difference. Almost nobody consciously notices. It still works.

**Station halo palette:**
| Station | Halo Colour |
|---|---|
| Brixton, Stockwell | Deep amber bleeding into terracotta |
| Vauxhall, Pimlico | Amber shading toward gold |
| Victoria, Green Park, Oxford Circus | Pure cool white-gold |
| Euston, King's Cross | Industrial orange — transport hubs, not destinations |
| Seven Sisters, Tottenham Hale, Blackhorse Road | Warm amber-red, slightly murkier |
| Walthamstow Central | Single clean amber pulse — end of the line, slightly melancholy |

---

## 6. Data Sources Worth Using

| Source | URL | What it provides | Fusion point |
|---|---|---|---|
| **Wikipedia "On This Day"** | `en.wikipedia.org/api/rest_v1/feed/onthisday/events/{MM}/{DD}` | Historical events filtered for London/Underground mentions | Station panel scrolling text |
| **Met Office DataPoint** | `metoffice.gov.uk/services/data/datapoint` | Current temperature, cloud cover, precipitation (free registration) | Modulates thermal palette and bolus glow intensity |
| **ONS NOMIS API** | `nomisweb.co.uk/api/v01/` | Ward-level unemployment, occupation, industry (no auth) | Distinguishes *type* of wealth per station — finance workers vs. service workers |
| **OpenStreetMap Overpass API** | `overpass-api.de/api/interpreter` | Pubs, cafes, places of worship, bookmakers per 400m radius | Station panel copy ("Eight pubs within five minutes' walk"), grid density |
| **Flickr API** | `flickr.com/services/api/` | Geotagged public photos near each station (free API key) | Extract average colour → tint that station's halo dynamically |
| **TheyWorkForYou API** | `theyworkforyou.com/api/` | Westminster constituency data, MP, voting record | Station panel for Westminster — "This is where it is decided" |

---

## 7. Red Flags — Things to Avoid

**Particle systems for their own sake.** Every second data viz on Codepen uses particles. If you can't name what each particle encodes, delete them.

**"Pulse" becoming your entire design vocabulary.** If everything pulses — the map, the stations, the text, the panel — nothing pulses. The boluses earn their pulse because they *are* the data. Everything else must be still.

**Twitter/X social media integration.** Expensive API, dates immediately, always produces a wall of semi-coherent text. Social layers have been done to death and make everything feel cheap.

**3D borough extrusions.** Every borough data viz since 2015 has extruded buildings. It looks impressive in screenshots and is meaningless in practice because occlusion hides the data.

**Dark mode + neon = cyberpunk.** The TfL retro aesthetic and cyberpunk are adjacent enough that a few wrong moves (too much cyan, anything that looks like Tron grid lines) will produce a generic tech-noir piece set in any fictional megacity. This piece is about *this specific city*. Amber, not cyan. Johnston, not condensed sans-serif. Worn edges, not pristine geometry.

**Overloading the station panel.** Arrival times + demographics + historical facts + incidents + weather + Wikipedia = a data dump nobody reads. Maximum three things per panel. Edit ruthlessly.

**Expanding beyond one line in Phase 1.** The Victoria Line's 16 stations is a constraint and a gift. It lets you give each station individual character. The moment you expand to 11 lines and 272 stations, every station becomes a data point again.

---

*The piece lives or dies on the Bloodstream moment done with complete commitment. If the boluses are beautiful, everything else can be simpler than described here. Start there.*
