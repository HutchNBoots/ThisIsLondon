import { initBloodstream, setSoundMuted } from './bloodstream.js';
import { renderArrivals, renderPanelSections } from './panel.js';
import { initGauge, updateGauge } from './gauge.js';

// ── Config ────────────────────────────────────────────────────────────────────
const BACKEND = window.BACKEND_URL || 'http://localhost:8000';
const POLL_INTERVAL = 20000;

// ── State ─────────────────────────────────────────────────────────────────────
let trainState = { fetched_at: null, trains: [] };
let stationData = {};      // keyed by station_id, all lines
let pressureState = {};
const stationMarkers = {};  // keyed by station_id

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

      const color = halo_hex || (line === 'district' ? '#0eb882' : '#ff9900');
      const cssClass = line === 'district' ? 'district-station' : 'victoria-station';

      const marker = L.circleMarker([lat, lng], {
        radius: 5,
        color: color,
        fillColor: color,
        fillOpacity: 0.7,
        weight: 1.5,
        className: cssClass,
      }).addTo(map);

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

    // Kick off the bloodstream animation
    const bloodstream = initBloodstream(map, canvas, () => trainState, () => stationData);
    bloodstream.start();
    window.__bloodstream = bloodstream;
  } catch (err) {
    console.error('[main] Failed to load stations:', err);
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

function startPolling() {
  pollTrains();
  pollPressure();
  setInterval(pollTrains, POLL_INTERVAL);
  setInterval(pollPressure, POLL_INTERVAL);
}

// ── Station panel ─────────────────────────────────────────────────────────────
async function openPanel(stationId) {
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

  } catch (err) {
    console.error('[main] openPanel fetch failed:', err);
    arrivalsEl.textContent = 'DATA UNAVAILABLE';
  }
}

function closePanel() {
  const panel = document.getElementById('station-panel');
  panel.classList.remove('open');
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

// ── Boot ──────────────────────────────────────────────────────────────────────
initGauge(document.getElementById('pressure-gauge'));
loadStations();
startPolling();
