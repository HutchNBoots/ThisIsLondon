import { initBloodstream, setSoundMuted, setThermalMode, VICTORIA_SEQUENCE_IDS, DISTRICT_BRANCHES } from './bloodstream.js';
import { renderArrivals, renderPanelSections, renderComparison, hideComparison, renderBoroughPanel } from './panel.js';
import { initGauge, updateGauge } from './gauge.js';

// ── Config ────────────────────────────────────────────────────────────────────
const BACKEND = window.BACKEND_URL || 'http://localhost:8000';
const POLL_INTERVAL = 20000;

// ── State ─────────────────────────────────────────────────────────────────────
let trainState = { fetched_at: null, trains: [] };
let stationData = {};      // keyed by station_id, all lines
let pressureState = {};
const stationMarkers = {};  // keyed by station_id
let compareMode = false;
let compareStationId = null;
let primaryStationId = null;
let primaryStationData = null;

// ── Map init ──────────────────────────────────────────────────────────────────
const map = L.map('map', { zoomControl: false });

// Will be set once stations load; start with a rough London view
map.setView([51.505, -0.09], 11);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
    '&copy; <a href="https://carto.com/attributions">CARTO</a>',
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
  if (zoom <= 11) return 12;
  if (zoom <= 12) return 16;
  if (zoom <= 13) return 22;
  if (zoom <= 14) return 30;
  return 38;
}

function escSvg(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function makeRoundelIcon(line, zoom, name) {
  const cs  = getRoundelCircleSize(zoom);   // circle diameter
  const half = cs / 2;
  const r   = (cs * 0.37).toFixed(1);
  const sw  = (cs * 0.22).toFixed(1);
  const barH = (cs * 0.32).toFixed(1);
  const barY = (half - cs * 0.16).toFixed(1);

  const showName = zoom >= 13 && name;

  let totalW, cx, svg;

  if (!showName) {
    // Compact bullseye — bar width = circle diameter
    totalW = cs;
    cx = half;
    svg = `<svg width="${cs}" height="${cs}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="${barY}" width="${cs}" height="${barH}" fill="${ROUNDEL_NAVY}"/>
      <circle cx="${half}" cy="${half}" r="${r}" fill="none" stroke="${ROUNDEL_RED}" stroke-width="${sw}"/>
    </svg>`;
  } else {
    // Full TfL roundel: name on bar, bar extends both sides of ring
    const fontSize = Math.max(10, cs * 0.32);
    // Monospace char width ≈ 0.61× font-size
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
    if (s) marker.setIcon(makeRoundelIcon(s.line, zoom, s.name));
  });
});

// ── Borough boundaries ────────────────────────────────────────────────────────

let boroughLayer = null;

async function loadBoroughBoundaries() {
  try {
    const res = await fetch(`${BACKEND}/api/borough-boundaries`);
    if (!res.ok) return;
    const geojson = await res.json();
    if (!geojson.features || geojson.features.length === 0) return;

    boroughLayer = L.geoJSON(geojson, {
      style: {
        color: '#ff9900',
        weight: 0.8,
        opacity: 0.25,
        fillOpacity: 0,
      },
      onEachFeature(feature, layer) {
        const name = feature.properties?.NAME || feature.properties?.name || '';
        layer.on('mouseover', () => layer.setStyle({ opacity: 0.6, weight: 1.2 }));
        layer.on('mouseout',  () => layer.setStyle({ opacity: 0.25, weight: 0.8 }));
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

  const nameEl = document.getElementById('borough-panel-name');
  if (nameEl) nameEl.textContent = boroughName.toUpperCase();

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

    stations.forEach((station) => {
      const station_id = station.id;
      const { name, lat, lng, halo_hex, line } = station;
      stationData[station_id] = station;

      const cssClass = line === 'district' ? 'district-station' : 'victoria-station';
      const icon = makeRoundelIcon(line, map.getZoom(), name);

      const marker = L.marker([lat, lng], { icon }).addTo(map);

      marker.on('click', () => openPanel(station_id));
      const fontWeight = station.font_weight || 400;
      marker.bindTooltip(name, {
        permanent: false,
        direction: 'right',
        className: `station-label weight-${Math.round(fontWeight / 50) * 50}`,
      });

      stationMarkers[station_id] = marker;

      if (line === 'victoria') {
        victoriaCoords.push([lat, lng]);
      } else {
        districtCoords.push([lat, lng]);
      }
    });

    // Auto-fit map bounds to all stations from both lines (M3d / fixes Brixton+Walthamstow cutoff)
    const allCoords = [...victoriaCoords, ...districtCoords];
    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords);
      map.fitBounds(bounds, { padding: [50, 50] });
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
function drawTubePolylines() {
  // Victoria line — official TfL blue #009DDC
  const vCoords = VICTORIA_SEQUENCE_IDS
    .map(id => stationData[id])
    .filter(Boolean)
    .map(s => [s.lat, s.lng]);
  if (vCoords.length > 1) {
    L.polyline(vCoords, { color: '#009DDC', weight: 4, opacity: 0.65 }).addTo(map);
  }

  // District line branches — official TfL green #007229
  for (const [branch, ids] of Object.entries(DISTRICT_BRANCHES)) {
    const coords = ids
      .map(id => stationData[id])
      .filter(Boolean)
      .map(s => [s.lat, s.lng]);
    if (coords.length > 1) {
      L.polyline(coords, {
        color: '#007229',
        weight: branch === 'spine' ? 4 : 3,
        opacity: branch === 'spine' ? 0.65 : 0.4,
      }).addTo(map);
    }
  }
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
  setInterval(pollTrains, POLL_INTERVAL);
  setInterval(pollPressure, POLL_INTERVAL);
  setInterval(pollWeather, 30 * 60 * 1000);
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
const MODES = ['amber', 'green', 'blue', 'mono'];
let currentModeIdx = 0;
const modeBtn = document.getElementById('mode-toggle');
if (modeBtn) {
  modeBtn.addEventListener('click', () => {
    document.body.classList.remove(`mode-${MODES[currentModeIdx]}`);
    currentModeIdx = (currentModeIdx + 1) % MODES.length;
    document.body.classList.add(`mode-${MODES[currentModeIdx]}`);
    modeBtn.textContent = MODES[currentModeIdx].toUpperCase();
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

// ── Boot ──────────────────────────────────────────────────────────────────────
initGauge(document.getElementById('pressure-gauge'));
loadStations();
loadBoroughBoundaries();
startPolling();
