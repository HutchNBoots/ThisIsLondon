import { initBloodstream, setSoundMuted, setThermalMode, VICTORIA_SEQUENCE_IDS, DISTRICT_BRANCHES, CENTRAL_SEQUENCE_IDS, JUBILEE_SEQUENCE_IDS, NORTHERN_BRANCHES } from './bloodstream.js';
import { renderArrivals, renderPanelSections, renderComparison, hideComparison, renderBoroughPanel } from './panel.js';
import { initGauge, updateGauge } from './gauge.js';

// ── Config ────────────────────────────────────────────────────────────────────
const BACKEND = window.BACKEND_URL || 'http://localhost:8000';
const POLL_INTERVAL = 20000;

// ── TfL line colours ──────────────────────────────────────────────────────────
const LINE_PALETTE = {
  victoria: '#009DDC',
  district: '#007229',
  central:  '#E32017',
  jubilee:  '#868F98',
  northern: '#1C1C1C',
};

// Light-tile palette: higher contrast against beige CartoDB background
const LINE_PALETTE_LIGHT = {
  victoria: '#0071A4',
  district: '#005C1F',
  central:  '#C0120C',
  jubilee:  '#4A5056',
  northern: '#000000',
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
    const res = await fetch(`${BACKEND}/api/borough-boundaries`);
    if (!res.ok) return;
    const geojson = await res.json();
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

    const allCoords = [];
    stations.forEach((station) => {
      const station_id = station.id;
      const { name, lat, lng, line } = station;
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
  const colour = isLight ? LINE_PALETTE_LIGHT[line] : LINE_PALETTE[line];
  return { color: colour, weight: isLight ? 5 : 4, opacity: isLight ? 1 : 0.85 };
}

function applyPolylineMode(isLight) {
  tubePolylines.forEach(({ layer, line }) => layer.setStyle(polylineStyle(line, isLight)));
}

function drawTubePolylines() {
  function seq(ids) {
    return ids.map(id => stationData[id]).filter(Boolean).map(s => [s.lat, s.lng]);
  }
  const isLight = document.body.classList.contains('mode-light');

  function addLine(coords, line) {
    if (coords.length < 2) return;
    const layer = L.polyline(coords, polylineStyle(line, isLight)).addTo(map);
    tubePolylines.push({ layer, line });
  }

  addLine(seq(VICTORIA_SEQUENCE_IDS), 'victoria');

  for (const [branch, ids] of Object.entries(DISTRICT_BRANCHES)) {
    const c = seq(ids);
    if (c.length > 1) {
      const layer = L.polyline(c, {
        ...polylineStyle('district', isLight),
        weight: branch === 'spine' ? (isLight ? 5 : 4) : (isLight ? 3 : 2.5),
        opacity: branch === 'spine' ? (isLight ? 1 : 0.85) : (isLight ? 0.8 : 0.6),
      }).addTo(map);
      tubePolylines.push({ layer, line: 'district' });
    }
  }

  addLine(seq(CENTRAL_SEQUENCE_IDS), 'central');
  addLine(seq(JUBILEE_SEQUENCE_IDS), 'jubilee');

  for (const [branch, ids] of Object.entries(NORTHERN_BRANCHES)) {
    const c = seq(ids);
    if (c.length > 1) {
      const layer = L.polyline(c, {
        ...polylineStyle('northern', isLight),
        weight: branch === 'morden_bank' ? (isLight ? 5 : 4) : (isLight ? 3 : 2.5),
      }).addTo(map);
      tubePolylines.push({ layer, line: 'northern' });
    }
  }
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

// ── B5 — First-time curtain raise ─────────────────────────────────────────────
function showCurtainRaise() {
  const el = document.getElementById('curtain-raise');
  if (!el) return;
  el.classList.add('visible');
  requestAnimationFrame(() => { el.style.opacity = '1'; });
  setTimeout(() => { el.style.opacity = '0'; }, 3000);
  setTimeout(() => { el.classList.remove('visible'); }, 4400);
}

// ── Boot ──────────────────────────────────────────────────────────────────────
const buildEl = document.getElementById('build-id');
if (buildEl && window.BUILD_ID) buildEl.textContent = window.BUILD_ID;

initGauge(document.getElementById('pressure-gauge'));
loadStations();
loadBoroughBoundaries();
loadGhostStations();
startPolling();
showCurtainRaise();
