import { initBloodstream } from './bloodstream.js';
import { renderArrivals, startFactsScroll } from './panel.js';
import { initGauge, updateGauge } from './gauge.js';

// ── Config ────────────────────────────────────────────────────────────────────
const BACKEND = window.BACKEND_URL || 'http://localhost:8000';
const POLL_INTERVAL = 20000;

// ── State ─────────────────────────────────────────────────────────────────────
let trainState = { fetched_at: null, trains: [] };
let stationData = {};      // keyed by station_id
let pressureState = {};
const stationMarkers = {};  // keyed by station_id

// ── Map init ──────────────────────────────────────────────────────────────────
const map = L.map('map', { zoomControl: false }).setView([51.52, -0.09], 12);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
    '&copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 20,
}).addTo(map);

// Move zoom control to bottom-right, away from the gauge and title
L.control.zoom({ position: 'bottomright' }).addTo(map);

// ── Atmosphere tint ───────────────────────────────────────────────────────────
const atmosphereTint = document.getElementById('atmosphere-tint');

function updateAtmosphere() {
  const centre = map.getCenter();
  const lat = centre.lat;
  let tint;
  if (lat < 51.49) {
    // Brixton area — warm red-black
    tint = 'rgba(40, 5, 0, 0.15)';
  } else if (lat <= 51.52) {
    // Victoria / Green Park — cool blue-black
    tint = 'rgba(0, 5, 20, 0.12)';
  } else {
    // North — amber-brown
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

    const lineCoords = [];

    stations.forEach((station) => {
      const { station_id, name, lat, lng, halo_hex } = station;
      stationData[station_id] = station;

      const color = halo_hex || '#ff9900';

      const marker = L.circleMarker([lat, lng], {
        radius: 6,
        color: color,
        fillColor: color,
        fillOpacity: 0.7,
        weight: 1.5,
        className: 'victoria-station',
      }).addTo(map);

      marker.on('click', () => openPanel(station_id));
      const fontWeight = station.font_weight || 400;
      marker.bindTooltip(name, {
        permanent: true,
        direction: 'right',
        className: `station-label weight-${fontWeight}`,
      });

      stationMarkers[station_id] = marker;
      lineCoords.push([lat, lng]);
    });

    // Draw the faint "vein wall" polyline connecting stations in sequence
    if (lineCoords.length > 1) {
      L.polyline(lineCoords, {
        color: '#ff990033',
        weight: 2,
        opacity: 0.3,
      }).addTo(map);
    }

    // Kick off the bloodstream art layer now that stations are loaded
    const bloodstream = initBloodstream(map, canvas, () => trainState, () => stationData);
    bloodstream.start();
    window.__bloodstream = bloodstream; // expose for poll refresh
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
  const arrivalsEl = document.getElementById('panel-arrivals');
  const factsEl = document.getElementById('panel-facts');

  // Remove hidden (Tailwind utility) so transitions work
  panel.classList.remove('hidden');
  // Force a reflow before adding open so the CSS transition fires
  panel.getBoundingClientRect();
  panel.classList.add('open');

  const cached = stationData[stationId];
  nameEl.textContent = cached ? cached.name.toUpperCase() : stationId;
  arrivalsEl.textContent = 'FETCHING...';
  factsEl.innerHTML = '';

  try {
    const res = await fetch(`${BACKEND}/api/station/${stationId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Update stationData cache
    stationData[stationId] = { ...stationData[stationId], ...data };

    // Arrivals board
    const arrivals = data.arrivals || [];
    const stationName = data.name || (cached ? cached.name : stationId);
    renderArrivals(arrivals, stationName);

    // Facts — base sentences
    const sentences = [
      data.fact_sentence,
      data.history_sentence,
      data.amenity_sentence,
    ].filter(Boolean);

    // Wikipedia "On This Day" fetch — look for London/Underground mentions
    try {
      const now = new Date();
      const MM = String(now.getMonth() + 1).padStart(2, '0');
      const DD = String(now.getDate()).padStart(2, '0');
      const wikiRes = await fetch(
        `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${MM}/${DD}`
      );
      if (wikiRes.ok) {
        const wikiData = await wikiRes.json();
        const events = wikiData.events || [];
        const londonKeywords = /london|underground|railway|tube|overground|metro/i;
        const match = events.find(
          (e) => e.text && londonKeywords.test(e.text)
        );
        if (match) {
          const year = match.year ? `${match.year}: ` : '';
          sentences.push(`ON THIS DAY — ${year}${match.text}`);
        }
      }
    } catch (_wikiErr) {
      // Non-critical — silently ignore Wikipedia fetch failures
    }

    if (sentences.length > 0) {
      startFactsScroll(sentences);
    }
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

// ── Boot ──────────────────────────────────────────────────────────────────────
initGauge(document.getElementById('pressure-gauge'));
loadStations();
startPolling();
