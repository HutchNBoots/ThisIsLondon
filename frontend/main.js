import { initBloodstream, setSoundMuted, setThermalMode, VICTORIA_SEQUENCE_IDS, DISTRICT_BRANCHES } from './bloodstream.js';
import { renderArrivals, renderPanelSections, renderComparison, hideComparison } from './panel.js';
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
      const roundelColour = line === 'district' ? '#007229' : '#009DDC';
      const roundelSvg = `<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="8" fill="none" stroke="${roundelColour}" stroke-width="3"/>
        <rect x="1.5" y="7.5" width="17" height="5" fill="${roundelColour}" rx="0.5"/>
      </svg>`;
      const icon = L.divIcon({
        html: roundelSvg,
        className: `roundel-marker ${cssClass}`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        tooltipAnchor: [12, 0],
      });

      const marker = L.marker([lat, lng], { icon }).addTo(map);

      marker.on('click', () => openPanel(station_id));
      const fontWeight = station.font_weight || 400;
      marker.bindTooltip(name, {
        permanent: true,
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
    L.polyline(vCoords, { color: '#009DDC', weight: 3, opacity: 0.35 }).addTo(map);
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
        weight: branch === 'spine' ? 3 : 2,
        opacity: branch === 'spine' ? 0.35 : 0.2,
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
startPolling();
