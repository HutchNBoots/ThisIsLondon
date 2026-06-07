/**
 * bloodstream.js — M5a: The Bloodstream
 *
 * The Victoria Line as a circulatory system.
 * Trains are amber boluses of light pushing through a vein.
 * Stations flare with demographic colour as trains approach.
 */

// Victoria Line stations south-to-north (sequence order)
const VICTORIA_LINE_SEQUENCE = [
  'brixton',
  'stockwell',
  'vauxhall',
  'pimlico',
  'victoria',
  'sloane_square',       // not on Victoria Line — placeholder removed below
  'st_james_park',       // not on Victoria Line — see note
  'green_park',
  'oxford_circus',
  'warren_street',
  'euston',
  'kings_cross_st_pancras',
  'highbury_islington',
  'finsbury_park',
  'seven_sisters',
  'tottenham_hale',
  'blackhorse_road',
  'walthamstow_central',
];

// Actual Victoria Line stations in order (southbound: index 0 = Walthamstow, northbound: reversed)
// We store them south→north so index 0 = Brixton
const VICTORIA_SEQUENCE_IDS = [
  '940GZZLUBXN', // Brixton
  '940GZZLUSTK', // Stockwell
  '940GZZLUVXL', // Vauxhall
  '940GZZLUPCO', // Pimlico
  '940GZZLUVIC', // Victoria
  '940GZZLUGPK', // Green Park
  '940GZZLUOXC', // Oxford Circus
  '940GZZLUWRR', // Warren Street
  '940GZZLUEUS', // Euston
  '940GZZLUKSX', // King's Cross St. Pancras
  '940GZZLUHBU', // Highbury & Islington
  '940GZZLUFPK', // Finsbury Park
  '940GZZLUSEV', // Seven Sisters
  '940GZZLUTOT', // Tottenham Hale
  '940GZZLUBLR', // Blackhorse Road
  '940GZZLUWTM', // Walthamstow Central
];

// Average inter-station travel time in ms (90 seconds)
const AVG_TRAVEL_MS = 90000;
// Flare activation window (ms before arrival)
const FLARE_WINDOW_MS = 60000;

function hexToRgb(hex) {
  if (!hex) return { r: 255, g: 153, b: 0 };
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function lerp(a, b, t) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function lerpPoint(p1, p2, t) {
  return {
    x: lerp(p1.x, p2.x, t),
    y: lerp(p1.y, p2.y, t),
  };
}

export function initBloodstream(map, canvas, getTrainState, getStationData) {
  const ctx = canvas.getContext('2d');
  let stations = [];      // ordered array, index 0 = Brixton (south)
  let boluses = [];
  let animFrame = null;
  let lastFetchedAt = null;

  // Arrhythmia jitter per station (stable across frames)
  const jitterPhase = {};

  // ── Position computation ────────────────────────────────────────────────────

  function computePositions() {
    const stationData = getStationData();
    const entries = Object.values(stationData);
    if (entries.length === 0) return;

    // Build ordered list matching VICTORIA_SEQUENCE_IDS
    const ordered = [];
    for (const id of VICTORIA_SEQUENCE_IDS) {
      const s = entries.find(e => e.station_id === id || e.id === id);
      if (s) {
        const pt = map.latLngToContainerPoint([s.lat, s.lng]);
        const rgb = hexToRgb(s.halo_hex);
        if (!jitterPhase[id]) {
          jitterPhase[id] = (Math.random() - 0.5) * 400; // ±200ms
        }
        ordered.push({
          id: s.station_id || s.id,
          name: s.name,
          x: pt.x,
          y: pt.y,
          halo_hex: s.halo_hex || '#ffa028',
          halo_rgb: rgb,
          wealth_score: s.wealth_score || 0.5,
          sequence: ordered.length,
          incident_jitter: s.incident_jitter || false,
          lat: s.lat,
        });
      }
    }

    // Fallback: if sequence IDs don't match, sort by lat descending (north at end)
    if (ordered.length < 3) {
      const sorted = entries
        .filter(e => e.lat)
        .sort((a, b) => a.lat - b.lat); // south first (lower lat)
      stations = sorted.map((s, i) => {
        const pt = map.latLngToContainerPoint([s.lat, s.lng]);
        const rgb = hexToRgb(s.halo_hex);
        return {
          id: s.station_id || s.id,
          name: s.name,
          x: pt.x,
          y: pt.y,
          halo_hex: s.halo_hex || '#ffa028',
          halo_rgb: rgb,
          wealth_score: s.wealth_score || 0.5,
          sequence: i,
          incident_jitter: s.incident_jitter || false,
          lat: s.lat,
        };
      });
    } else {
      stations = ordered;
    }
  }

  // ── Bolus state management ──────────────────────────────────────────────────

  function rebuildBoluses() {
    const ts = getTrainState();
    if (!ts || !ts.trains) return;

    boluses = ts.trains
      .filter(t => t.time_to_station != null)
      .map(t => {
        // Find target station index in our ordered array
        const targetIdx = stations.findIndex(
          s => s.id === t.station_id || s.name === t.station_name
        );
        if (targetIdx < 0) return null;

        const direction = t.direction || 'northbound';

        return {
          vehicle_id: t.vehicle_id,
          target_station_idx: targetIdx,
          time_to_station_ms: (t.time_to_station || 0) * 1000,
          last_updated: Date.now(),
          direction,
        };
      })
      .filter(Boolean);
  }

  // Get current parametric position [0,1] of a bolus along its segment
  function getBolusT(bolus) {
    const elapsed = Date.now() - bolus.last_updated;
    const remaining = Math.max(0, bolus.time_to_station_ms - elapsed);
    // t=0: just left previous station; t=1: at target
    return Math.max(0, Math.min(1, 1 - remaining / AVG_TRAVEL_MS));
  }

  function getBolusScreenPos(bolus, tOverride) {
    const t = tOverride !== undefined ? tOverride : getBolusT(bolus);
    const targetIdx = bolus.target_station_idx;

    // Determine previous station based on direction
    let prevIdx;
    if (bolus.direction === 'northbound') {
      prevIdx = targetIdx - 1;
    } else {
      prevIdx = targetIdx + 1;
    }

    if (prevIdx < 0 || prevIdx >= stations.length) {
      // At terminal — just sit at target
      return { x: stations[targetIdx].x, y: stations[targetIdx].y };
    }

    const prev = stations[prevIdx];
    const target = stations[targetIdx];
    return lerpPoint(prev, target, t);
  }

  function getBolusTimeToStation(bolus) {
    const elapsed = Date.now() - bolus.last_updated;
    return Math.max(0, bolus.time_to_station_ms - elapsed);
  }

  // ── Drawing ─────────────────────────────────────────────────────────────────

  function drawArtery() {
    if (stations.length < 2) return;

    // Outer vein wall — barely visible
    ctx.beginPath();
    ctx.moveTo(stations[0].x, stations[0].y);
    for (let i = 1; i < stations.length; i++) {
      const prev = stations[i - 1];
      const curr = stations[i];
      const mx = (prev.x + curr.x) / 2;
      const my = (prev.y + curr.y) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
    }
    ctx.lineTo(stations[stations.length - 1].x, stations[stations.length - 1].y);
    ctx.strokeStyle = 'rgba(255, 160, 40, 0.12)';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Inner brighter centre line
    ctx.beginPath();
    ctx.moveTo(stations[0].x, stations[0].y);
    for (let i = 1; i < stations.length; i++) {
      const prev = stations[i - 1];
      const curr = stations[i];
      const mx = (prev.x + curr.x) / 2;
      const my = (prev.y + curr.y) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
    }
    ctx.lineTo(stations[stations.length - 1].x, stations[stations.length - 1].y);
    ctx.strokeStyle = 'rgba(255, 160, 40, 0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawBolus(pos, opacityMultiplier = 1) {
    const { x, y } = pos;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, 18);
    grad.addColorStop(0,   `rgba(255, 220, 100, ${0.95 * opacityMultiplier})`);
    grad.addColorStop(0.44, `rgba(255, 160, 40,  ${0.6  * opacityMultiplier})`);
    grad.addColorStop(1,   `rgba(255, 100, 20,  0)`);

    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  function drawBoluses() {
    for (const bolus of boluses) {
      if (bolus.target_station_idx < 0 || bolus.target_station_idx >= stations.length) continue;
      const t = getBolusT(bolus);
      const pos = getBolusScreenPos(bolus, t);

      // Motion trail — ghost copies behind the bolus
      const trailOffsets = [0.06, 0.04, 0.02];
      const trailOpacities = [0.1, 0.2, 0.3];
      for (let i = 0; i < 3; i++) {
        const trailT = Math.max(0, t - trailOffsets[i]);
        const trailPos = getBolusScreenPos(bolus, trailT);
        drawBolus(trailPos, trailOpacities[i]);
      }

      // Main bolus
      drawBolus(pos, 1);
    }
  }

  function drawFlares() {
    const now = Date.now();

    for (let si = 0; si < stations.length; si++) {
      const station = stations[si];
      const { r, g, b } = station.halo_rgb;

      // Always draw a faint ambient pulse
      const ambientPhase = (now / 3000 + si * 0.7) % 1;
      const ambientR = lerp(3, 6, Math.abs(Math.sin(ambientPhase * Math.PI)));
      const ambientOpacity = 0.18 + 0.08 * Math.sin(ambientPhase * Math.PI * 2);
      ctx.beginPath();
      ctx.arc(station.x, station.y, ambientR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${ambientOpacity})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Check if any bolus is within FLARE_WINDOW_MS of this station
      let closestProximity = -1;
      for (const bolus of boluses) {
        if (bolus.target_station_idx !== si) continue;
        const tta = getBolusTimeToStation(bolus);
        if (tta <= FLARE_WINDOW_MS) {
          const proximity = 1 - tta / FLARE_WINDOW_MS; // 0=60s away, 1=arrived
          if (proximity > closestProximity) closestProximity = proximity;
        }
      }

      if (closestProximity < 0) continue;

      // Arrhythmia jitter
      let jitter = 0;
      if (station.incident_jitter) {
        jitter = jitterPhase[station.id] || 0;
        const jitterT = ((now + jitter) / 1000) % 1;
        closestProximity = Math.max(0, Math.min(1, closestProximity + 0.05 * Math.sin(jitterT * Math.PI * 4)));
      }

      const p = closestProximity;

      // Ring 1
      const r1 = lerp(6, 40, p);
      const o1 = lerp(0.8, 0, p);
      ctx.beginPath();
      ctx.arc(station.x, station.y, r1, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${o1})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Ring 2
      const r2 = lerp(6, 60, p) * 0.7;
      const o2 = o1 * 0.5;
      ctx.beginPath();
      ctx.arc(station.x, station.y, r2, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${o2})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Ring 3
      const r3 = lerp(6, 80, p) * 0.4;
      const o3 = o1 * 0.25;
      ctx.beginPath();
      ctx.arc(station.x, station.y, r3, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${o3})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // ── Main draw loop ──────────────────────────────────────────────────────────

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (stations.length > 1) {
      drawArtery();
      drawFlares();
      drawBoluses();
    }

    // Check for new train data
    const ts = getTrainState();
    if (ts && ts.fetched_at !== lastFetchedAt) {
      lastFetchedAt = ts.fetched_at;
      rebuildBoluses();
    }

    animFrame = requestAnimationFrame(draw);
  }

  // ── Map event wiring ────────────────────────────────────────────────────────

  map.on('moveend zoomend', () => {
    computePositions();
  });

  window.addEventListener('resize', () => {
    computePositions();
  });

  // ── Public API ──────────────────────────────────────────────────────────────

  return {
    start() {
      computePositions();
      draw();
    },
    stop() {
      if (animFrame) cancelAnimationFrame(animFrame);
      animFrame = null;
    },
    refresh() {
      computePositions();
      rebuildBoluses();
    },
  };
}
