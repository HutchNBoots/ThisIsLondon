import { initBloodstream, setSoundMuted, setThermalMode, VICTORIA_SEQUENCE_IDS, DISTRICT_BRANCHES, CENTRAL_SEQUENCE_IDS, JUBILEE_SEQUENCE_IDS, NORTHERN_BRANCHES } from './bloodstream.js';
import { renderArrivals, renderPanelSections, renderComparison, hideComparison, renderBoroughPanel } from './panel.js';
import { initGauge, updateGauge } from './gauge.js';

// ── Config ────────────────────────────────────────────────────────────────────
const BACKEND = window.BACKEND_URL || 'http://localhost:8000';

// ── New line sequences (NaPTAN IDs ordered terminus→terminus) ─────────────────
const BAKERLOO_SEQUENCE_IDS = [
  '940GZZLUHAW','940GZZLUKBN','940GZZLUSOH','940GZZLUNKR','940GZZLUWMB',
  '940GZZLUSTP','940GZZLUHRW','940GZZLUWJN','940GZZLUKSL','940GZZLUQPW',
  '940GZZLURSP','940GZZLUMDV','940GZZLUEUS','940GZZLURGE','940GZZLUOXC',
  '940GZZLUPCC','940GZZLUEMB','940GZZLUWLO','940GZZLULBN','940GZZLUEAC',
  '940GZZLUEPG',
];
const PICCADILLY_SEQUENCE_IDS = [
  '940GZZLUCKS','940GZZLUOAK','940GZZLUNFD','940GZZLUSBY','940GZZLUTOT',
  '940GZZLUWGN','940GZZLUBVR','940GZZLUHNX','940GZZLUFPK','940GZZLUARN',
  '940GZZLUKGH','940GZZLUHSC','940GZZLUHBN','940GZZLURSP','940GZZLUPDG',
  '940GZZLUHRC','940GZZLUKBY','940GZZLUSKC','940GZZLUGRD','940GZZLUECT',
  '940GZZLUBBC','940GZZLUHSD','940GZZLUTNG','940GZZLUACT','940GZZLUSSY',
  '940GZZLUBOS','940GZZLUOSY','940GZZLUHNE','940GZZLUHNC','940GZZLUHWT',
  '940GZZLUHTN','940GZZLUHR1',
];
const HAMMERSMITH_CITY_SEQUENCE_IDS = [
  '940GZZLUHSD','940GZZLURAV','940GZZLUSTM','940GZZLUTNG','940GZZLUSBC',
  '940GZZLUWCY','940GZZLULATM','940GZZLUWHL','940GZZLURYL','940GZZLUPDG',
  '940GZZLUERB','940GZZLUBST','940GZZLUGWR','940GZZLUEUS','940GZZLUKSX',
  '940GZZLUFCN','940GZZLUBBN','940GZZLUMGT','940GZZLULVS','940GZZLUALD',
  '940GZZLUSTD','940GZZLUMLE','940GZZLUBWR','940GZZLUBBY','940GZZLUWCH',
  '940GZZLUPLW','940GZZLUURP','940GZZLUEHA','940GZZLUBRK',
];
const CIRCLE_SEQUENCE_IDS = [
  '940GZZLUHSD','940GZZLURAV','940GZZLUSTM','940GZZLUTNG','940GZZLUCHY',
  '940GZZLUSBC','940GZZLUWCY','940GZZLULATM','940GZZLUWHL','940GZZLURYL',
  '940GZZLUPDG','940GZZLUERB','940GZZLUBST','940GZZLUGWR','940GZZLUEUS',
  '940GZZLUKSX','940GZZLUFCN','940GZZLUBBN','940GZZLUMGT','940GZZLULVS',
  '940GZZLUALD','940GZZLUTOH','940GZZLUMHS','940GZZLUCST','940GZZLUMSH',
  '940GZZLUBLF','940GZZLUTPL','940GZZLUEMB','940GZZLUWST','940GZZLUSTJ',
  '940GZZLUVIC','940GZZLUSSQ','940GZZLUSKC','940GZZLUGRD','940GZZLUECT',
  '940GZZLUHKN','940GZZLUNKL','940GZZLUBND','940GZZLUPDG',
];
const METROPOLITAN_SEQUENCE_IDS = [
  '940GZZLUALD','940GZZLULVS','940GZZLUMGT','940GZZLUBBN','940GZZLUFCN',
  '940GZZLUKSX','940GZZLUEUS','940GZZLUGWR','940GZZLUBST','940GZZLUFJY',
  '940GZZLUWJN','940GZZLUNWP','940GZZLUDOH','940GZZLUWPK','940GZZLUKBY',
  '940GZZLUWHS','940GZZLUWMB','940GZZLUPRS','940GZZLUNHD','940GZZLUHRW',
];
const ELIZABETH_SEQUENCE_IDS = [
  '910GREADING','910GTWYFRD','910GMDNHEAD','910GTAPLOW','910GBNMFLD',
  '910GSLOUGH','910GLANGLY','910GIVR','910GWDRSLGH','910GHAYESAH',
  '940GZZLUPDG','940GZZLUBON','940GZZLULVS','940GZZLUWLO','940GZZLUCGT',
  '940GZZLUCWR','940GZZLUSDM','940GZZLUILF','940GZZLUGPK',
];
const WATERLOO_CITY_SEQUENCE_IDS = [
  '940GZZLUWLO','940GZZLUBNK',
];
const POLL_INTERVAL = 20000;

// ── TfL line colours ──────────────────────────────────────────────────────────
const LINE_PALETTE = {
  victoria: '#0098D4',
  district: '#00782A',
  central:  '#E32017',
  jubilee:  '#A0A5A9',
  northern: '#000000',
  bakerloo: '#B36305',
  piccadilly: '#003688',
  'hammersmith-city': '#F3A9BB',
  circle:   '#FFD300',
  metropolitan: '#9B0056',
  elizabeth: '#6950A1',
  'waterloo-city': '#95CDBA',
};

// Light mode: exact TfL colours, with minor adjustments for legibility on white tiles
const LINE_PALETTE_LIGHT = {
  victoria: '#0098D4',
  district: '#00782A',
  central:  '#E32017',
  jubilee:  '#6E7278',   // A0A5A9 is too pale on white
  northern: '#1A1A1A',   // pure black invisible on map labels
  bakerloo: '#B36305',
  piccadilly: '#003688',
  'hammersmith-city': '#C4607A', // F3A9BB too pale on white
  circle:   '#B89B00',   // FFD300 invisible on white — darken
  metropolitan: '#9B0056',
  elizabeth: '#6950A1',
  'waterloo-city': '#5A9080', // 95CDBA too pale
};

// ── State ─────────────────────────────────────────────────────────────────────
let trainState = { fetched_at: null, trains: [] };
let stationData = {};
let pressureState = {};
const stationMarkers = {};
let compareMode = false;
let compareStationId = null;

// Journey mode
let journeyMode = false;
let journeyFromId = null;
let journeyPolyline = null;

// Overlay modes
let languagePortraitActive = false;
let gentrificationActive = false;
let boroughStoryActive = false;
let languageData = null;
let gentrificationData = null;
let boroughLayer = null;
let primaryStationId = null;
let primaryStationData = null;
let tubePolylines = []; // { layer, line } — re-styled on mode change
const lineVisible = {
  victoria: true, district: true, central: true, jubilee: true, northern: true,
  bakerloo: true, piccadilly: true, 'hammersmith-city': true, circle: true,
  metropolitan: true, elizabeth: true, 'waterloo-city': true,
};

// ── Map init ──────────────────────────────────────────────────────────────────
const map = L.map('map', {
  zoomControl: false,
  tap: true,
  tapTolerance: 15,
  touchZoom: true,
  bounceAtZoomLimits: true,
});

// Will be set once stations load; start with a rough London view
map.setView([51.505, -0.09], 11);

const TILE_DARK  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR  = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

let currentTileLayer = L.tileLayer(TILE_LIGHT, {
  attribution: TILE_ATTR,
  subdomains: 'abcd',
  maxZoom: 20,
}).addTo(map);

L.control.zoom({ position: 'bottomright' }).addTo(map);

// ── Atmosphere tint ───────────────────────────────────────────────────────────
const atmosphereTint = document.getElementById('atmosphere-tint');

function updateAtmosphere() {
  // Disable tint in light mode — multiply blend washes out polyline colours
  if (document.body.classList.contains('mode-light')) {
    if (atmosphereTint) atmosphereTint.style.backgroundColor = 'transparent';
    return;
  }
  const centre = map.getCenter();
  const lat = centre.lat;
  let tint;
  if (lat < 51.49) {
    tint = 'rgba(40, 5, 0, 0.15)';
  } else if (lat <= 51.52) {
    tint = 'rgba(0, 5, 20, 0.12)';
  } else {
    tint = 'rgba(20, 10, 0, 0.13)';
  }
  if (atmosphereTint) atmosphereTint.style.backgroundColor = tint;
}

map.on('moveend', updateAtmosphere);
updateAtmosphere();

// ── Canvas overlay ────────────────────────────────────────────────────────────
const canvas = document.getElementById('art-layer');

function resizeCanvas() {
  const container = document.getElementById('map-container');
  canvas.width = container.offsetWidth;
  canvas.height = container.offsetHeight;
}

resizeCanvas();
window.addEventListener('resize', () => {
  resizeCanvas();
  map.invalidateSize();
});

// ── Roundel markers ───────────────────────────────────────────────────────────

// TfL colours: red ring + navy bar (authentic Underground roundel, line shown by polyline)
const ROUNDEL_RED  = '#E21836';
const ROUNDEL_NAVY = '#003688';

function getRoundelCircleSize(zoom) {
  if (zoom <= 11) return 10;
  if (zoom <= 12) return 16;
  if (zoom <= 13) return 24;
  if (zoom <= 14) return 32;
  return 40;
}

function escSvg(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function makeRoundelIcon(line, zoom, name) {
  const cs  = getRoundelCircleSize(zoom);
  const half = cs / 2;

  let totalW, cx, svg;

  if (zoom <= 11) {
    // Minimal dot — white fill + red outer ring, clean at tiny sizes
    const dot = (cs * 0.38).toFixed(1);
    const ring = (cs * 0.5).toFixed(1);
    totalW = cs;
    cx = half;
    svg = `<svg width="${cs}" height="${cs}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${half}" cy="${half}" r="${ring}" fill="${ROUNDEL_RED}"/>
      <circle cx="${half}" cy="${half}" r="${dot}" fill="white"/>
    </svg>`;
  } else if (zoom <= 12) {
    // Compact roundel — ring + bar, no name
    const r   = (cs * 0.37).toFixed(1);
    const sw  = (cs * 0.24).toFixed(1);
    const barH = (cs * 0.34).toFixed(1);
    const barY = (half - cs * 0.17).toFixed(1);
    totalW = cs;
    cx = half;
    svg = `<svg width="${cs}" height="${cs}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="${barY}" width="${cs}" height="${barH}" fill="${ROUNDEL_NAVY}"/>
      <circle cx="${half}" cy="${half}" r="${r}" fill="none" stroke="${ROUNDEL_RED}" stroke-width="${sw}"/>
    </svg>`;
  } else {
    const showName = zoom >= 13 && name;
    const r   = (cs * 0.37).toFixed(1);
    const sw  = (cs * 0.22).toFixed(1);
    const barH = (cs * 0.32).toFixed(1);
    const barY = (half - cs * 0.16).toFixed(1);

    if (!showName) {
      totalW = cs;
      cx = half;
      svg = `<svg width="${cs}" height="${cs}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="${barY}" width="${cs}" height="${barH}" fill="${ROUNDEL_NAVY}"/>
        <circle cx="${half}" cy="${half}" r="${r}" fill="none" stroke="${ROUNDEL_RED}" stroke-width="${sw}"/>
      </svg>`;
    } else {
      // Full TfL roundel with station name on bar
      const fontSize = Math.max(10, cs * 0.30);
      const textW = name.length * fontSize * 0.61;
      totalW = Math.max(cs + 16, Math.ceil(textW + cs * 0.5));
      cx = totalW / 2;
      const textY = (half + fontSize * 0.36).toFixed(1);
      svg = `<svg width="${totalW}" height="${cs}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="${barY}" width="${totalW}" height="${barH}" fill="${ROUNDEL_NAVY}"/>
        <circle cx="${cx.toFixed(1)}" cy="${half}" r="${r}" fill="none" stroke="${ROUNDEL_RED}" stroke-width="${sw}"/>
        <text x="${cx.toFixed(1)}" y="${textY}"
              text-anchor="middle" fill="white"
              font-family="'Share Tech Mono',monospace"
              font-size="${fontSize.toFixed(1)}"
              font-weight="bold">${escSvg(name.toUpperCase())}</text>
      </svg>`;
    }
  }

  return L.divIcon({
    html: svg,
    className: `roundel-marker ${line}-station`,
    iconSize: [totalW, cs],
    iconAnchor: [cx, half],
    tooltipAnchor: [totalW / 2, -half - 4],
  });
}

map.on('zoomend', () => {
  const zoom = map.getZoom();
  Object.entries(stationMarkers).forEach(([id, marker]) => {
    const s = stationData[id];
    if (!s) return;
    if (!stationsVisible || zoom <= 12) {
      marker.setOpacity(0);
    } else {
      marker.setOpacity(1);
      marker.setIcon(makeRoundelIcon(s.line, zoom, s.name));
    }
  });
});

// ── Borough boundaries ────────────────────────────────────────────────────────

async function loadBoroughBoundaries() {
  try {
    // Load from bundled static file — no backend dependency
    let geojson;
    try {
      const res = await fetch('./data/borough-boundaries.json');
      if (res.ok) geojson = await res.json();
    } catch (_) {}
    // Fallback to backend if static file missing
    if (!geojson?.features?.length) {
      const res = await fetch(`${BACKEND}/api/borough-boundaries`);
      if (!res.ok) return;
      geojson = await res.json();
    }
    if (!geojson.features || geojson.features.length === 0) return;

    boroughLayer = L.geoJSON(geojson, {
      style: {
        color: '#003688',
        weight: 0.5,
        opacity: 0.12,
        fillOpacity: 0,
        fillColor: 'transparent',
      },
      onEachFeature(feature, layer) {
        const name = feature.properties?.NAME || feature.properties?.name || '';
        layer.on('mouseover', () => { if (!boroughStoryActive) layer.setStyle({ opacity: 0.35, weight: 1 }); });
        layer.on('mouseout',  () => { if (!boroughStoryActive) layer.setStyle({ opacity: 0.12, weight: 0.5 }); });
        layer.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          if (name) openBoroughPanel(name);
        });
      },
    }).addTo(map);
  } catch (err) {
    console.warn('[main] borough boundaries failed:', err);
  }
}

async function openBoroughPanel(boroughName) {
  const panel = document.getElementById('borough-panel');
  if (!panel) return;
  panel.classList.remove('hidden');
  panel.getBoundingClientRect();
  panel.classList.add('open');

  document.getElementById('borough-panel-name').textContent = boroughName.toUpperCase();

  // Story mode button
  const storyBtn = document.getElementById('borough-story-btn');
  if (storyBtn) {
    storyBtn.onclick = () => { closeBoroughPanel(); enterBoroughStoryMode(boroughName); };
    storyBtn.style.display = 'block';
  }

  try {
    const res = await fetch(`${BACKEND}/api/borough/${encodeURIComponent(boroughName)}`);
    if (res.ok) {
      const data = await res.json();
      renderBoroughPanel(data);
    }
  } catch (err) {
    console.warn('[main] borough data failed:', err);
  }
}

function closeBoroughPanel() {
  const panel = document.getElementById('borough-panel');
  if (panel) panel.classList.remove('open');
}

// ── Station loading ───────────────────────────────────────────────────────────
async function loadStations() {
  try {
    const res = await fetch(`${BACKEND}/api/stations`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const stations = await res.json();

    const victoriaCoords = [];
    const districtCoords = [];

    // Deduplicate by normalised name — LU station names are unique across the network.
    // The same physical station appears multiple times when shared between lines, with
    // slightly different coordinates and different NaPTAN IDs per data file.
    // Aliases all IDs to the canonical station so seq() polyline lookups still work.
    function normName(n) { return n.toLowerCase().replace(/[^a-z0-9]/g, ''); }
    const seenByName = {}; // normName -> canonical station object
    const allCoords = [];
    stations.forEach((station) => {
      const station_id = station.id;
      const { name, lat, lng, line } = station;
      const key = normName(name);
      const canonical = seenByName[key];
      if (canonical) {
        stationData[station_id] = canonical;
        return;
      }
      seenByName[key] = station;
      stationData[station_id] = station;

      const zoom = map.getZoom();
      const icon = makeRoundelIcon(line, zoom, name);
      const marker = L.marker([lat, lng], { icon, opacity: zoom <= 12 ? 0 : 1 }).addTo(map);

      marker.on('click', () => {
        if (journeyMode) { resolveJourney(station_id); return; }
        openPanel(station_id);
      });
      const fontWeight = station.font_weight || 400;
      marker.bindTooltip(name, {
        permanent: false, direction: 'right',
        className: `station-label weight-${Math.round(fontWeight / 50) * 50}`,
      });

      stationMarkers[station_id] = marker;
      allCoords.push([lat, lng]);
    });

    if (allCoords.length > 0) {
      map.fitBounds(L.latLngBounds(allCoords), { padding: [50, 50] });
    }

    // Draw official tube line polylines in TfL colours
    drawTubePolylines();

    // Kick off the bloodstream animation
    const bloodstream = initBloodstream(map, canvas, () => trainState, () => stationData);
    bloodstream.start();
    window.__bloodstream = bloodstream;
  } catch (err) {
    console.error('[main] Failed to load stations:', err);
  }
}

// ── Tube line polylines ───────────────────────────────────────────────────────

function polylineStyle(line, isLight) {
  const colour = isLight ? (LINE_PALETTE_LIGHT[line] || LINE_PALETTE[line]) : LINE_PALETTE[line];
  return { color: colour || '#888', weight: isLight ? 4 : 3, opacity: 1 };
}

function applyPolylineMode(isLight) {
  tubePolylines.forEach(({ layer, line }) => layer.setStyle(polylineStyle(line, isLight)));
}

// Catmull-Rom spline interpolation through station waypoints
function smoothLine(latLngs, steps = 8) {
  if (latLngs.length < 2) return latLngs;
  const pts = latLngs.map(([lat, lng]) => ({ lat, lng }));
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * ((2 * p1.lat) + (-p0.lat + p2.lat) * t + (2 * p0.lat - 5 * p1.lat + 4 * p2.lat - p3.lat) * t2 + (-p0.lat + 3 * p1.lat - 3 * p2.lat + p3.lat) * t3),
        0.5 * ((2 * p1.lng) + (-p0.lng + p2.lng) * t + (2 * p0.lng - 5 * p1.lng + 4 * p2.lng - p3.lng) * t2 + (-p0.lng + 3 * p1.lng - 3 * p2.lng + p3.lng) * t3),
      ]);
    }
  }
  out.push(latLngs[latLngs.length - 1]);
  return out;
}

function drawTubePolylines() {
  function seq(ids) {
    return ids.map(id => stationData[id]).filter(Boolean).map(s => [s.lat, s.lng]);
  }
  const isLight = document.body.classList.contains('mode-light');

  function addLine(coords, line, extraStyle = {}) {
    if (coords.length < 2) return;
    const layer = L.polyline(smoothLine(coords), { ...polylineStyle(line, isLight), ...extraStyle }).addTo(map);
    tubePolylines.push({ layer, line });
  }

  // Draw order: least-prominent lines first, most-prominent on top
  // Elizabeth (wide, surface route) and Metropolitan (outer branches) go deepest
  addLine(seq(ELIZABETH_SEQUENCE_IDS), 'elizabeth');
  addLine(seq(METROPOLITAN_SEQUENCE_IDS), 'metropolitan');
  addLine(seq(WATERLOO_CITY_SEQUENCE_IDS), 'waterloo-city');

  // Piccadilly under District/Circle (shares track in west London)
  addLine(seq(PICCADILLY_SEQUENCE_IDS), 'piccadilly');

  // Northern and Jubilee
  for (const [branch, ids] of Object.entries(NORTHERN_BRANCHES)) {
    const c = seq(ids);
    if (c.length > 1) {
      const layer = L.polyline(smoothLine(c), {
        ...polylineStyle('northern', isLight),
        weight: branch === 'morden_bank' ? (isLight ? 4 : 3) : (isLight ? 3 : 2),
      }).addTo(map);
      tubePolylines.push({ layer, line: 'northern' });
    }
  }
  addLine(seq(JUBILEE_SEQUENCE_IDS), 'jubilee');
  addLine(seq(BAKERLOO_SEQUENCE_IDS), 'bakerloo');
  addLine(seq(CENTRAL_SEQUENCE_IDS), 'central');

  // H&C under Circle (share most track)
  addLine(seq(HAMMERSMITH_CITY_SEQUENCE_IDS), 'hammersmith-city');

  // District branches
  for (const [branch, ids] of Object.entries(DISTRICT_BRANCHES)) {
    const c = seq(ids);
    if (c.length > 1) {
      const layer = L.polyline(smoothLine(c), {
        ...polylineStyle('district', isLight),
        weight: branch === 'spine' ? (isLight ? 4 : 3) : (isLight ? 3 : 2),
        opacity: branch === 'spine' ? 1 : (isLight ? 0.8 : 0.65),
      }).addTo(map);
      tubePolylines.push({ layer, line: 'district' });
    }
  }

  // Victoria and Circle on top — most used / most recognisable
  addLine(seq(VICTORIA_SEQUENCE_IDS), 'victoria');
  addLine(seq(CIRCLE_SEQUENCE_IDS), 'circle');
}

function toggleLine(lineName) {
  lineVisible[lineName] = !lineVisible[lineName];
  const show = lineVisible[lineName];
  tubePolylines.forEach(({ layer, line }) => {
    if (line === lineName) {
      if (show) map.addLayer(layer); else map.removeLayer(layer);
    }
  });
  // Hide/show station markers for that line
  Object.values(stationMarkers).forEach(m => {
    const data = stationData[m._leaflet_id] || Object.values(stationData).find(s => stationMarkers[s.id] === m);
    if (data && data.line === lineName) {
      m.setOpacity(show ? (map.getZoom() > 12 ? 1 : 0) : 0);
    }
  });
}

// ── Ghost stations ────────────────────────────────────────────────────────────
async function loadGhostStations() {
  try {
    const res = await fetch(`${BACKEND}/api/ghost-stations`);
    if (!res.ok) return;
    const ghosts = await res.json();
    ghosts.forEach(g => {
      const cs = 14;
      const svg = `<svg width="${cs}" height="${cs}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${cs/2}" cy="${cs/2}" r="${cs*0.45}" fill="none" stroke="#aaaaaa" stroke-width="1.5" opacity="0.5" stroke-dasharray="2,2"/>
      </svg>`;
      const icon = L.divIcon({ html: svg, className: 'ghost-station-marker', iconSize:[cs,cs], iconAnchor:[cs/2,cs/2] });
      const marker = L.marker([g.lat, g.lng], { icon, opacity: 0.6 }).addTo(map);
      marker.on('click', () => openGhostPanel(g));
      marker.bindTooltip(g.name, { permanent: false, direction: 'right', className: 'station-label ghost-label' });
    });
  } catch (err) {
    console.warn('[main] ghost stations failed:', err);
  }
}

function openGhostPanel(ghost) {
  const panel = document.getElementById('station-panel');
  const nameEl = document.getElementById('panel-station-name');
  const boroughEl = document.getElementById('panel-borough-name');
  const arrivalsEl = document.getElementById('panel-arrivals');

  panel.classList.remove('hidden');
  panel.getBoundingClientRect();
  panel.classList.add('open');
  panel.classList.add('ghost-mode');

  nameEl.textContent = ghost.name.toUpperCase();
  boroughEl.textContent = ghost.closed ? `CLOSED ${ghost.closed} · ${ghost.line} LINE` : `PROPOSED · NEVER OPENED`;
  arrivalsEl.innerHTML = `<div class="ghost-no-service">NO SERVICE</div>`;

  ['panel-people-content','panel-place-content','panel-now-content'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '';
  });

  const placeEl = document.getElementById('panel-place-content');
  if (placeEl) placeEl.innerHTML = `<div class="fact-static ghost-fact">${ghost.fact}</div>`;

  // Disable compare
  const compareBtn = document.getElementById('compare-toggle');
  if (compareBtn) compareBtn.style.display = 'none';
}

// ── Service status banner ─────────────────────────────────────────────────────
async function pollLineStatus() {
  try {
    const res = await fetch(`${BACKEND}/api/line-status`);
    if (!res.ok) return;
    const { statuses } = await res.json();
    renderStatusBanner(statuses || []);
  } catch (_) {}
}

function renderStatusBanner(_statuses) {
  // Banner removed per design decision
  const banner = document.getElementById('status-banner');
  if (banner) banner.classList.add('hidden');
}

// ── Air quality ───────────────────────────────────────────────────────────────
async function pollAirQuality() {
  try {
    const res = await fetch(`${BACKEND}/api/air-quality`);
    if (!res.ok) return;
    const aq = await res.json();
    applyAirQualityTint(aq);
  } catch (_) {}
}

function applyAirQualityTint(aq) {
  const category = aq.category || 'unknown';
  const overlays = {
    good:      null,
    fair:      null,
    moderate:  'rgba(180, 150, 20, 0.04)',
    poor:      'rgba(180, 100, 10, 0.08)',
    'very poor': 'rgba(150, 50, 0, 0.14)',
  };
  const aqIndicator = document.getElementById('aq-indicator');
  if (aqIndicator) {
    aqIndicator.textContent = `AQI ${aq.aqi} · ${category.toUpperCase()}`;
    aqIndicator.className = `aq-${category.replace(' ', '-')}`;
  }
}

// ── Language Portrait mode ────────────────────────────────────────────────────
async function ensureBoroughLayer() {
  if (boroughLayer) return true;
  await loadBoroughBoundaries();
  return !!boroughLayer;
}

async function toggleLanguagePortrait() {
  const btn = document.getElementById('lang-toggle');
  const mobBtn = document.getElementById('mob-lang-btn');
  if (btn) btn.textContent = 'LOADING…';
  try {
    if (!languageData) {
      const res = await fetch(`${BACKEND}/api/language-map`);
      if (!res.ok) throw new Error(res.status);
      languageData = await res.json();
    }
    await ensureBoroughLayer();
  } catch (_) {
    if (btn) btn.textContent = 'LANG';
    return;
  }
  languagePortraitActive = !languagePortraitActive;
  gentrificationActive = false;
  applyBoroughOverlay();
  if (btn) { btn.textContent = 'LANG'; btn.classList.toggle('active', languagePortraitActive); }
  if (mobBtn) mobBtn.classList.toggle('active', languagePortraitActive);
  document.getElementById('gent-toggle')?.classList.remove('active');
  document.getElementById('mob-gent-btn')?.classList.remove('active');
}

async function toggleGentrification() {
  const btn = document.getElementById('gent-toggle');
  const mobBtn = document.getElementById('mob-gent-btn');
  if (btn) btn.textContent = 'LOADING…';
  try {
    if (!gentrificationData) {
      const res = await fetch(`${BACKEND}/api/gentrification`);
      if (!res.ok) throw new Error(res.status);
      gentrificationData = await res.json();
    }
    await ensureBoroughLayer();
  } catch (_) {
    if (btn) btn.textContent = 'GENT';
    return;
  }
  gentrificationActive = !gentrificationActive;
  languagePortraitActive = false;
  applyBoroughOverlay();
  if (btn) { btn.textContent = 'GENT'; btn.classList.toggle('active', gentrificationActive); }
  if (mobBtn) mobBtn.classList.toggle('active', gentrificationActive);
  document.getElementById('lang-toggle')?.classList.remove('active');
  document.getElementById('mob-lang-btn')?.classList.remove('active');
}

function applyBoroughOverlay() {
  if (!boroughLayer) return;
  boroughLayer.eachLayer(layer => {
    const name = layer.feature?.properties?.NAME || layer.feature?.properties?.name || '';
    let fillColor = 'transparent';
    let fillOpacity = 0;

    if (languagePortraitActive && languageData) {
      const entry = languageData.boroughs?.[name];
      if (entry) { fillColor = entry.colour; fillOpacity = 0.35; }
    } else if (gentrificationActive && gentrificationData) {
      const entry = gentrificationData.boroughs?.[name];
      if (entry) {
        const ch = entry.change_pct || 0;
        if (ch >= 25) fillColor = '#ff4400';
        else if (ch >= 15) fillColor = '#ff8800';
        else if (ch >= 8)  fillColor = '#ffcc00';
        else if (ch >= 0)  fillColor = '#aaaaaa';
        else               fillColor = '#4488ff';
        fillOpacity = 0.4;
      }
    }
    layer.setStyle({ fillColor, fillOpacity });
  });
}

// ── Journey mode ──────────────────────────────────────────────────────────────
function enterJourneyMode(fromStationId) {
  journeyMode = true;
  journeyFromId = fromStationId;
  const btn = document.getElementById('journey-btn');
  if (btn) { btn.textContent = 'TAP DESTINATION'; btn.classList.add('active'); }
  document.getElementById('station-panel')?.classList.remove('open');
}

async function resolveJourney(toStationId) {
  if (!journeyFromId || journeyFromId === toStationId) { exitJourneyMode(); return; }
  try {
    const res = await fetch(`${BACKEND}/api/journey?from_id=${journeyFromId}&to_id=${toStationId}`);
    if (!res.ok) { exitJourneyMode(); return; }
    const data = await res.json();
    showJourneyResult(data);
  } catch (_) { exitJourneyMode(); }
}

function showJourneyResult(data) {
  exitJourneyMode();
  if (journeyPolyline) { map.removeLayer(journeyPolyline); journeyPolyline = null; }
  const coords = data.route.map(id => stationData[id]).filter(Boolean).map(s => [s.lat, s.lng]);
  if (coords.length > 1) {
    journeyPolyline = L.polyline(coords, { color: '#ffffff', weight: 3, opacity: 0.9, dashArray: '6 4' }).addTo(map);
    map.fitBounds(journeyPolyline.getBounds(), { padding: [60, 60] });
  }

  // Show journey panel
  const panel = document.getElementById('station-panel');
  panel.classList.remove('hidden');
  panel.getBoundingClientRect();
  panel.classList.add('open');

  document.getElementById('panel-station-name').textContent = `${data.from_name} → ${data.to_name}`.toUpperCase();
  document.getElementById('panel-borough-name').textContent = `${data.station_count - 1} STOPS · ~${data.approx_minutes} MIN`;
  document.getElementById('panel-arrivals').innerHTML = '';

  const placeEl = document.getElementById('panel-place-content');
  if (placeEl) {
    const delta = data.income_delta;
    const deltaStr = delta != null
      ? (delta >= 0 ? `+£${delta.toLocaleString()}` : `-£${Math.abs(delta).toLocaleString()}`)
      : '—';
    placeEl.innerHTML = `
      <div class="fact-static">BOROUGHS CROSSED: ${data.borough_count}</div>
      <div class="fact-static">${(data.boroughs || []).join(' → ')}</div>
      ${delta != null ? `<div class="fact-static journey-income">INCOME SHIFT: ${deltaStr} MEDIAN ANNUAL</div>` : ''}
    `;
  }

  const clearBtn = document.getElementById('journey-clear');
  if (clearBtn) { clearBtn.style.display = 'block'; }
}

function exitJourneyMode() {
  journeyMode = false;
  journeyFromId = null;
  const btn = document.getElementById('journey-btn');
  if (btn) { btn.textContent = 'JOURNEY FROM HERE'; btn.classList.remove('active'); }
}

// ── Borough Story Mode ────────────────────────────────────────────────────────
function enterBoroughStoryMode(boroughName) {
  if (boroughStoryActive) exitBoroughStoryMode();
  boroughStoryActive = true;
  document.body.classList.add('borough-story-mode');

  if (boroughLayer) {
    boroughLayer.eachLayer(layer => {
      const name = layer.feature?.properties?.NAME || layer.feature?.properties?.name || '';
      if (name !== boroughName) {
        layer.setStyle({ fillColor: '#000', fillOpacity: 0.55, opacity: 0.1 });
      } else {
        layer.setStyle({ fillColor: 'transparent', fillOpacity: 0, opacity: 0.8, weight: 2 });
      }
    });
  }

  Object.values(stationMarkers).forEach((m, i) => {
    const sid = Object.keys(stationMarkers)[i];
    const s = stationData[sid];
    if (s?.borough !== boroughName) m.setOpacity(0.15);
  });

  const exitBtn = document.getElementById('story-exit');
  if (exitBtn) exitBtn.style.display = 'block';
}

function exitBoroughStoryMode() {
  boroughStoryActive = false;
  document.body.classList.remove('borough-story-mode');
  if (boroughLayer) {
    boroughLayer.eachLayer(layer => {
      layer.setStyle({ color: 'var(--accent,#ff9900)', weight: 0.8, opacity: 0.25, fillOpacity: 0 });
    });
    if (languagePortraitActive || gentrificationActive) applyBoroughOverlay();
  }
  Object.values(stationMarkers).forEach(m => m.setOpacity(1));
  const exitBtn = document.getElementById('story-exit');
  if (exitBtn) exitBtn.style.display = 'none';
}

// ── Polling ───────────────────────────────────────────────────────────────────
async function pollTrains() {
  try {
    const res = await fetch(`${BACKEND}/api/live-trains`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    trainState = await res.json();
    if (window.__bloodstream) window.__bloodstream.refresh();
  } catch (err) {
    console.warn('[main] live-trains poll failed:', err);
  }
}

async function pollPressure() {
  try {
    const res = await fetch(`${BACKEND}/api/line-pressure`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    pressureState = await res.json();
    updateGauge(pressureState);
  } catch (err) {
    console.warn('[main] line-pressure poll failed:', err);
  }
}

async function pollWeather() {
  try {
    const res = await fetch(`${BACKEND}/api/weather`);
    if (!res.ok) return;
    const w = await res.json();
    applyWeatherAtmosphere(w);
  } catch (_) {}
}

function applyWeatherAtmosphere(w) {
  if (!atmosphereTint) return;
  const condition = w.condition || 'clear';
  // Weather modifies the atmosphere tint opacity and hue
  const weatherOverlay = {
    clear:   'rgba(10, 5, 0, 0.05)',
    cloudy:  'rgba(5, 5, 15, 0.12)',
    fog:     'rgba(20, 20, 10, 0.18)',
    rain:    'rgba(0, 5, 25, 0.22)',
    showers: 'rgba(0, 5, 20, 0.18)',
    snow:    'rgba(10, 10, 30, 0.20)',
    storm:   'rgba(0, 0, 20, 0.28)',
  }[condition] || 'rgba(0, 5, 20, 0.10)';
  atmosphereTint.style.backgroundColor = weatherOverlay;
  atmosphereTint.title = `London: ${w.temperature_c != null ? w.temperature_c + '°C, ' : ''}${condition}`;
}

function startPolling() {
  pollTrains();
  pollPressure();
  pollWeather();
  pollLineStatus();
  pollAirQuality();
  setInterval(pollTrains,    POLL_INTERVAL);
  setInterval(pollPressure,  POLL_INTERVAL);
  setInterval(pollLineStatus, 60 * 1000);
  setInterval(pollWeather,   30 * 60 * 1000);
  setInterval(pollAirQuality, 60 * 60 * 1000);
}

// ── Station panel ─────────────────────────────────────────────────────────────
async function openPanel(stationId) {
  // Compare mode: second click loads comparison
  if (compareMode && primaryStationId && stationId !== primaryStationId) {
    await loadComparison(stationId);
    return;
  }

  primaryStationId = stationId;
  compareStationId = null;
  hideComparison();

  const panel = document.getElementById('station-panel');
  const nameEl = document.getElementById('panel-station-name');
  const boroughEl = document.getElementById('panel-borough-name');
  const arrivalsEl = document.getElementById('panel-arrivals');

  panel.classList.remove('hidden');
  panel.getBoundingClientRect();
  panel.classList.add('open');

  const cached = stationData[stationId];
  // POSTER-018: set line colour band at panel top
  const lineColour = cached ? (LINE_PALETTE[cached.line] || LINE_PALETTE_LIGHT[cached.line] || '') : '';
  panel.style.setProperty('--station-line-colour', lineColour);
  nameEl.textContent = cached ? cached.name.toUpperCase() : stationId;
  boroughEl.textContent = cached ? (cached.borough || '').toUpperCase() : '';
  arrivalsEl.textContent = 'FETCHING...';

  // Clear sections
  ['panel-people-content', 'panel-place-content', 'panel-now-content'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<div class="data-line"><span class="data-value">—</span></div>';
  });

  try {
    // Fetch station data and arrivals in parallel
    const [stationRes, arrRes, onThisDayRes] = await Promise.allSettled([
      fetch(`${BACKEND}/api/station/${stationId}`),
      fetch(`${BACKEND}/api/station/${stationId}/arrivals`),
      fetch(`${BACKEND}/api/on-this-day`),
    ]);

    let data = cached || {};
    if (stationRes.status === 'fulfilled' && stationRes.value.ok) {
      data = await stationRes.value.json();
      stationData[stationId] = { ...stationData[stationId], ...data };
      nameEl.textContent = (data.name || cached?.name || stationId).toUpperCase();
      boroughEl.textContent = (data.borough || cached?.borough || '').toUpperCase();
    }

    // Arrivals board
    let arrivals = [];
    if (arrRes.status === 'fulfilled' && arrRes.value.ok) {
      arrivals = await arrRes.value.json();
    }
    renderArrivals(arrivals, data.name || stationId);

    // On This Day — find relevant event for this borough
    let onThisDayEvent = null;
    if (onThisDayRes.status === 'fulfilled' && onThisDayRes.value.ok) {
      const otd = await onThisDayRes.value.json();
      const events = otd.events || [];
      const borough = (data.borough || '').toLowerCase();
      const stationName = (data.name || '').toLowerCase();
      // Try to find an event specifically mentioning this borough/station
      onThisDayEvent = events.find(e => {
        const text = (e.text || '').toLowerCase();
        return text.includes(borough) || text.includes(stationName);
      }) || events[0] || null;
    }

    // Render enriched panel sections
    renderPanelSections(data, onThisDayEvent);
    primaryStationData = data;

  } catch (err) {
    console.error('[main] openPanel fetch failed:', err);
    arrivalsEl.textContent = 'DATA UNAVAILABLE';
  }
}

function closePanel() {
  const panel = document.getElementById('station-panel');
  panel.classList.remove('open');
}

async function loadComparison(stationId) {
  compareStationId = stationId;
  try {
    const res = await fetch(`${BACKEND}/api/station/${stationId}`);
    if (res.ok) {
      const data = await res.json();
      stationData[stationId] = { ...stationData[stationId], ...data };
      renderComparison(primaryStationData, data);
    }
  } catch (err) {
    console.warn('[main] comparison fetch failed:', err);
  }
}

document.getElementById('panel-close').addEventListener('click', closePanel);

const boroughPanelClose = document.getElementById('borough-panel-close');
if (boroughPanelClose) boroughPanelClose.addEventListener('click', closeBoroughPanel);

// ── Mute toggle (M5) ─────────────────────────────────────────────────────────
let soundMuted = false;
const muteBtn = document.getElementById('mute-toggle');
if (muteBtn) {
  muteBtn.addEventListener('click', () => {
    soundMuted = !soundMuted;
    setSoundMuted(soundMuted);
    muteBtn.textContent = soundMuted ? '♪̶' : '♪';
    muteBtn.style.opacity = soundMuted ? '0.35' : '0.7';
  });
}

// ── Map mode cycling ──────────────────────────────────────────────────────────
const MODES = ['light', 'dark', 'green'];
let currentModeIdx = 0;
const modeBtn = document.getElementById('mode-toggle');
if (modeBtn) {
  modeBtn.addEventListener('click', () => {
    document.body.classList.remove(`mode-${MODES[currentModeIdx]}`);
    currentModeIdx = (currentModeIdx + 1) % MODES.length;
    const nextMode = MODES[currentModeIdx];
    document.body.classList.add(`mode-${nextMode}`);
    modeBtn.textContent = nextMode.toUpperCase();

    // Swap tile layer — light mode uses light tiles, dark/green use dark tiles
    const tileUrl = nextMode === 'light' ? TILE_LIGHT : TILE_DARK;
    map.removeLayer(currentTileLayer);
    currentTileLayer = L.tileLayer(tileUrl, {
      attribution: TILE_ATTR,
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);
    applyPolylineMode(nextMode === 'light');
    updateAtmosphere();
    // Ensure tile layer stays below everything else
    currentTileLayer.bringToBack();
  });
}

// ── Thermal mode toggle ───────────────────────────────────────────────────────
let thermalActive = false;
const thermalBtn = document.getElementById('thermal-toggle');
if (thermalBtn) {
  thermalBtn.addEventListener('click', () => {
    thermalActive = !thermalActive;
    setThermalMode(thermalActive);
    thermalBtn.classList.toggle('active', thermalActive);
  });
}

// ── Compare mode toggle ───────────────────────────────────────────────────────
const compareBtn = document.getElementById('compare-toggle');
if (compareBtn) {
  compareBtn.addEventListener('click', () => {
    compareMode = !compareMode;
    compareBtn.classList.toggle('active', compareMode);
    compareBtn.textContent = compareMode ? 'COMPARING… TAP STATION' : 'COMPARE +';
    if (!compareMode) {
      compareStationId = null;
      hideComparison();
    }
  });
}

// ── Station visibility toggle ─────────────────────────────────────────────────
let stationsVisible = true;

function toggleStations() {
  stationsVisible = !stationsVisible;
  const zoom = map.getZoom();
  Object.values(stationMarkers).forEach(m => {
    m.setOpacity(stationsVisible && zoom > 12 ? 1 : 0);
  });
  document.getElementById('stations-toggle')?.classList.toggle('active', !stationsVisible);
  document.getElementById('mob-stations-btn')?.classList.toggle('active', !stationsVisible);
}

document.getElementById('stations-toggle')?.addEventListener('click', toggleStations);

// ── Language / Gentrification toggles ────────────────────────────────────────
document.getElementById('lang-toggle')?.addEventListener('click', toggleLanguagePortrait);
document.getElementById('gent-toggle')?.addEventListener('click', toggleGentrification);

// ── Mobile bottom bar — mirror desktop toggle actions ─────────────────────────
(function wireMobileControls() {
  const mobMode = document.getElementById('mob-mode-btn');
  const mobModeLabel = document.getElementById('mob-mode-label');
  if (mobMode) {
    mobMode.addEventListener('click', () => {
      modeBtn?.click();
      if (mobModeLabel) mobModeLabel.textContent = MODES[currentModeIdx].toUpperCase();
    });
  }

  document.getElementById('mob-thermal-btn')?.addEventListener('click', () => {
    thermalBtn?.click();
    document.getElementById('mob-thermal-btn')?.classList.toggle('active', thermalActive);
  });

  document.getElementById('mob-lang-btn')?.addEventListener('click', () => {
    toggleLanguagePortrait();
    document.getElementById('mob-lang-btn')?.classList.toggle('active', languagePortraitActive);
  });

  document.getElementById('mob-gent-btn')?.addEventListener('click', () => {
    toggleGentrification();
    document.getElementById('mob-gent-btn')?.classList.toggle('active', gentrificationActive);
  });

  document.getElementById('mob-stations-btn')?.addEventListener('click', toggleStations);

  document.getElementById('mob-mute-btn')?.addEventListener('click', () => {
    muteBtn?.click();
    document.getElementById('mob-mute-btn')?.style.setProperty('opacity', soundMuted ? '0.35' : '0.7');
  });
})();

// Story exit
document.getElementById('story-exit')?.addEventListener('click', exitBoroughStoryMode);

// Journey clear
document.getElementById('journey-clear')?.addEventListener('click', () => {
  if (journeyPolyline) { map.removeLayer(journeyPolyline); journeyPolyline = null; }
  closePanel();
  exitJourneyMode();
  document.getElementById('journey-clear').style.display = 'none';
});

// Journey from here button (wired when panel opens)
document.getElementById('station-panel')?.addEventListener('click', e => {
  if (e.target.id === 'journey-btn') {
    enterJourneyMode(primaryStationId);
  }
});

// ── WILD-005: Invisible City ──────────────────────────────────────────────────
let secretUnlocked = false;
let titleTapCount = 0;
let titleTapTimer = null;
let secretLocations = [];

async function loadSecretLocations() {
  try {
    const res = await fetch('./data/secret-locations.json');
    const data = await res.json();
    secretLocations = data.locations || [];
  } catch (_) {}
}

function unlockInvisibleCity() {
  if (secretUnlocked) return;
  secretUnlocked = true;
  const overlay = document.getElementById('title-overlay');
  if (overlay) {
    overlay.style.borderColor = '#cc3300';
    setTimeout(() => { overlay.style.borderColor = ''; }, 2000);
  }
  renderSecretMarkers();
}

function renderSecretMarkers() {
  const secretPane = map.createPane('secretPane');
  secretPane.style.zIndex = 650;

  secretLocations.forEach(loc => {
    const svg = `<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="8" fill="none" stroke="#cc3300" stroke-width="1" stroke-dasharray="3,2" opacity="0.8"/>
      <text x="10" y="14" text-anchor="middle" fill="#cc3300" font-size="9" font-family="monospace">◈</text>
    </svg>`;
    const icon = L.divIcon({ html: svg, className: 'secret-marker', iconSize: [20,20], iconAnchor: [10,10] });
    L.marker([loc.lat, loc.lng], { icon, pane: 'secretPane' })
      .on('click', () => openSecretPanel(loc))
      .addTo(map);
  });
}

function openSecretPanel(loc) {
  document.getElementById('secret-classification').textContent = loc.classification;
  document.getElementById('secret-name').textContent = loc.name;
  document.getElementById('secret-subtitle').textContent = loc.subtitle;
  document.getElementById('secret-body').textContent = loc.body;
  const panel = document.getElementById('secret-panel');
  panel.classList.remove('hidden');
  requestAnimationFrame(() => panel.classList.add('open'));
}

document.getElementById('secret-panel-close')?.addEventListener('click', () => {
  const panel = document.getElementById('secret-panel');
  panel.classList.remove('open');
  setTimeout(() => panel.classList.add('hidden'), 350);
});

// Unlock: tap title text 5 times quickly, or shake on mobile
document.getElementById('title-text')?.addEventListener('click', () => {
  titleTapCount++;
  clearTimeout(titleTapTimer);
  if (titleTapCount >= 5) { titleTapCount = 0; unlockInvisibleCity(); return; }
  titleTapTimer = setTimeout(() => { titleTapCount = 0; }, 2000);
});

if (typeof DeviceMotionEvent !== 'undefined') {
  let lastShake = 0;
  window.addEventListener('devicemotion', e => {
    const a = e.accelerationIncludingGravity;
    if (!a) return;
    const force = Math.abs(a.x) + Math.abs(a.y) + Math.abs(a.z);
    if (force > 45 && Date.now() - lastShake > 3000) {
      lastShake = Date.now();
      unlockInvisibleCity();
    }
  });
}

// ── WILD-002: Commuter Genome ─────────────────────────────────────────────────
function openGenomePanel(fromStation, toStation) {
  const s1 = stationData[fromStation];
  const s2 = stationData[toStation];
  if (!s1 || !s2) return;

  const avgIncome = Math.round(((s1.median_income_gbp || 35000) + (s2.median_income_gbp || 35000)) / 2);
  const avgDeprivation = (((s1.deprivation_index || 0.5) + (s2.deprivation_index || 0.5)) / 2).toFixed(2);
  const avgDensity = Math.round(((s1.population_density_per_km2 || 8000) + (s2.population_density_per_km2 || 8000)) / 2).toLocaleString();
  const avgBornAbroad = Math.round(((s1.pct_born_outside_uk || 0.3) + (s2.pct_born_outside_uk || 0.3)) / 2 * 100);
  const incomeJump = Math.abs((s1.median_income_gbp || 35000) - (s2.median_income_gbp || 35000));
  const langs = [...new Set([...(s1.top_languages||[]), ...(s2.top_languages||[])])].filter(l => l !== 'English').slice(0,4);

  document.getElementById('genome-title').textContent =
    `${s1.name.toUpperCase()} ↔ ${s2.name.toUpperCase()}`;

  document.getElementById('genome-content').innerHTML = `
    <div class="genome-stat"><span class="genome-label">SEGMENT</span><span class="genome-value">${s1.line?.toUpperCase() || ''} LINE</span></div>
    <div class="genome-stat"><span class="genome-label">MEDIAN INCOME</span><span class="genome-value">£${avgIncome.toLocaleString()}/yr</span></div>
    <div class="genome-stat"><span class="genome-label">INCOME JUMP</span><span class="genome-value">£${incomeJump.toLocaleString()} across this segment</span></div>
    <div class="genome-stat"><span class="genome-label">BORN OUTSIDE UK</span><span class="genome-value">${avgBornAbroad}%</span></div>
    <div class="genome-stat"><span class="genome-label">POP. DENSITY</span><span class="genome-value">${avgDensity}/km²</span></div>
    <div class="genome-bar-wrap">
      <div class="genome-bar-label">DEPRIVATION INDEX (${avgDeprivation})</div>
      <div class="genome-bar-track"><div class="genome-bar-fill" style="width:${avgDeprivation*100}%"></div></div>
    </div>
    <div class="genome-stat"><span class="genome-label">LANGUAGES</span><span class="genome-value">${langs.length ? langs.join(', ') : 'Data unavailable'}</span></div>
    ${s1.fact_sentence ? `<p style="font-size:11px;color:var(--text-faint);margin-top:8px;line-height:1.7">${s1.fact_sentence}</p>` : ''}
    ${s2.fact_sentence ? `<p style="font-size:11px;color:var(--text-faint);margin-top:4px;line-height:1.7">${s2.fact_sentence}</p>` : ''}
  `;

  const panel = document.getElementById('genome-panel');
  panel.classList.remove('hidden');
  requestAnimationFrame(() => panel.classList.add('open'));
}

document.getElementById('genome-panel-close')?.addEventListener('click', () => {
  const panel = document.getElementById('genome-panel');
  panel.classList.remove('open');
  setTimeout(() => panel.classList.add('hidden'), 350);
});

function addGenomeClicksToPolylines() {
  // Attach after polylines are drawn — pairs adjacent stations in each sequence
  function wireLine(ids) {
    for (let i = 0; i < ids.length - 1; i++) {
      const from = ids[i], to = ids[i+1];
      if (!stationData[from] || !stationData[to]) continue;
      const midLat = (stationData[from].lat + stationData[to].lat) / 2;
      const midLng = (stationData[from].lng + stationData[to].lng) / 2;
      // Invisible click-target on each segment midpoint
      L.circle([midLat, midLng], { radius: 300, opacity: 0, fillOpacity: 0 })
        .on('click', () => openGenomePanel(from, to))
        .addTo(map);
    }
  }
  wireLine(VICTORIA_SEQUENCE_IDS);
  wireLine(CENTRAL_SEQUENCE_IDS);
  wireLine(JUBILEE_SEQUENCE_IDS);
  Object.values(DISTRICT_BRANCHES).forEach(wireLine);
  Object.values(NORTHERN_BRANCHES).forEach(wireLine);
}

// ── B5 — First-time curtain raise ─────────────────────────────────────────────
function showCurtainRaise() {
  const el = document.getElementById('curtain-raise');
  if (!el) return;
  el.classList.add('visible');
  requestAnimationFrame(() => { el.style.opacity = '1'; });
  setTimeout(() => { el.style.opacity = '0'; }, 3000);
  setTimeout(() => { el.classList.remove('visible'); }, 4400);
}

// ── Line toggle buttons ───────────────────────────────────────────────────────
document.querySelectorAll('.line-toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const line = btn.dataset.line;
    toggleLine(line);
    btn.classList.toggle('active', lineVisible[line]);
  });
});

// ── Boot ──────────────────────────────────────────────────────────────────────
const buildEl = document.getElementById('build-id');
if (buildEl && window.BUILD_ID) buildEl.textContent = window.BUILD_ID;

initGauge(document.getElementById('pressure-gauge'));
loadStations().then(() => addGenomeClicksToPolylines());
loadBoroughBoundaries();
loadGhostStations();
loadSecretLocations();
startPolling();
showCurtainRaise();
