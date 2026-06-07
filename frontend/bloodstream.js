/**
 * bloodstream.js — Two circulatory systems.
 *
 * Victoria Line: amber boluses of light through a north-south aorta.
 * District Line: teal boluses branching through the city's peripheral capillaries.
 */

// Victoria Line — south-to-north (corrected NaPTAN IDs matching victoria_line.json)
const VICTORIA_SEQUENCE_IDS = [
  '940GZZLUBXN', // Brixton
  '940GZZLUSTK', // Stockwell
  '940GZZLUUXB', // Vauxhall
  '940GZZLUPCO', // Pimlico
  '940GZZLUVIC', // Victoria
  '940GZZLUGPK', // Green Park
  '940GZZLUOXC', // Oxford Circus
  '940GZZLUWRR', // Warren Street
  '940GZZLUEAC', // Euston
  '940GZZLUKSX', // King's Cross St. Pancras
  '940GZZLUHBT', // Highbury & Islington
  '940GZZLUFPK', // Finsbury Park
  '940GZZLUSES', // Seven Sisters
  '940GZZLUTOT', // Tottenham Hale
  '940GZZLUBLR', // Blackhorse Road
  '940GZZLUWWL', // Walthamstow Central
];

// District Line branch sequences
// Each array is an ordered list of station IDs for that branch segment
const DISTRICT_BRANCHES = {
  // Main spine: Wimbledon → Barking (visual backbone of the District line)
  spine: [
    '940GZZLUWIM', // Wimbledon
    '940GZZLUWIP', // Wimbledon Park
    '940GZZLUSWF', // Southfields
    '940GZZLUEPY', // East Putney
    '940GZZLUPYB', // Putney Bridge
    '940GZZLUPSG', // Parsons Green
    '940GZZLUFBY', // Fulham Broadway
    '940GZZLUWBP', // West Brompton
    '940GZZLUERC', // Earl's Court
    '940GZZLUGTR', // Gloucester Road
    '940GZZLUSKN', // South Kensington
    '940GZZLUSSQ', // Sloane Square
    '940GZZLUVIC', // Victoria
    '940GZZLUSJP', // St James's Park
    '940GZZLUWSM', // Westminster
    '940GZZLUEMB', // Embankment
    '940GZZLUTEM', // Temple
    '940GZZLUBLF', // Blackfriars
    '940GZZLUMSH', // Mansion House
    '940GZZLUCST', // Cannon Street
    '940GZZLUMMT', // Monument
    '940GZZLUTOH', // Tower Hill
    '940GZZLUADE', // Aldgate East
    '940GZZLUWCH', // Whitechapel
    '940GZZLUSTG', // Stepney Green
    '940GZZLUMLE', // Mile End
    '940GZZLUBWR', // Bow Road
    '940GZZLUBBB', // Bromley-by-Bow
    '940GZZLUWEH', // West Ham
    '940GZZLUPLA', // Plaistow
    '940GZZLUUPK', // Upton Park
    '940GZZLUEHA', // East Ham
    '940GZZLUBKG', // Barking
  ],
  // Upminster spur: Barking → Upminster
  upminster: [
    '940GZZLUBKG', // Barking
    '940GZZLUUPN', // Upney
    '940GZZLUBEC', // Becontree
    '940GZZLUDGN', // Dagenham Heathway
    '940GZZLUDGE', // Dagenham East
    '940GZZLUELP', // Elm Park
    '940GZZLUHCH', // Hornchurch
    '940GZZLUUMB', // Upminster Bridge
    '940GZZLUUPM', // Upminster
  ],
  // Richmond spur: Richmond → Earl's Court (via Hammersmith)
  richmond: [
    '940GZZLURIC', // Richmond
    '940GZZLUKWG', // Kew Gardens
    '940GZZLUGNY', // Gunnersbury
    '940GZZLUTNG', // Turnham Green
    '940GZZLUSTB', // Stamford Brook
    '940GZZLURVP', // Ravenscourt Park
    '940GZZLUHSD', // Hammersmith
    '940GZZLUBRC', // Barons Court
    '940GZZLUWBP', // West Brompton
    '940GZZLUERC', // Earl's Court
  ],
  // Ealing Broadway spur: Ealing Broadway → Earl's Court (via Hammersmith)
  ealing: [
    '940GZZLUEBY', // Ealing Broadway
    '940GZZLUECM', // Ealing Common
    '940GZZLUACT', // Acton Town
    '940GZZLUCYP', // Chiswick Park
    '940GZZLUTNG', // Turnham Green
    '940GZZLUHSD', // Hammersmith
    '940GZZLUBRC', // Barons Court
    '940GZZLUERC', // Earl's Court
  ],
  // Edgware Road horseshoe: Edgware Road → Earl's Court (via Notting Hill)
  horseshoe: [
    '940GZZLUEGR', // Edgware Road
    '940GZZLUPAC', // Paddington
    '940GZZLUBWT', // Bayswater
    '940GZZLUNHG', // Notting Hill Gate
    '940GZZLUHSK', // High Street Kensington
    '940GZZLUERC', // Earl's Court
  ],
};

// Priority order for branch matching (more specific branches first)
const DISTRICT_BRANCH_PRIORITY = ['upminster', 'horseshoe', 'richmond', 'ealing', 'spine'];

// Average inter-station travel time in ms (90 seconds)
const AVG_TRAVEL_MS = 90000;
const FLARE_WINDOW_MS = 60000;

// Victoria line colours
const VICTORIA_BOLUS_COLOURS = {
  core: 'rgba(255, 220, 100, ',
  mid: 'rgba(255, 160, 40, ',
  edge: 'rgba(255, 100, 20, 0)',
  artery_outer: 'rgba(255, 160, 40, 0.12)',
  artery_inner: 'rgba(255, 160, 40, 0.06)',
};

// District line colours
const DISTRICT_BOLUS_COLOURS = {
  core: 'rgba(100, 240, 200, ',
  mid: 'rgba(14, 184, 130, ',
  edge: 'rgba(0, 150, 110, 0)',
  artery_outer: 'rgba(14, 184, 130, 0.15)',
  artery_inner: 'rgba(14, 184, 130, 0.07)',
};

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

// ── Sound layer (M5) ─────────────────────────────────────────────────────────

let audioCtx = null;
let soundMuted = false;

let thermalMode = false;

export function setThermalMode(enabled) {
  thermalMode = enabled;
}

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

// Resume AudioContext on first user gesture (browser autoplay policy)
function ensureAudioResumed() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}
document.addEventListener('click', ensureAudioResumed, { once: false });

function playArrivalTone(line) {
  if (soundMuted) return;
  try {
    const ac = getAudioContext();
    if (ac.state === 'suspended') return;

    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);

    // Victoria: warm amber tone A4 440Hz; District: cooler D4 294Hz
    osc.type = 'sine';
    osc.frequency.value = line === 'victoria' ? 440 : 294;

    const now = ac.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.start(now);
    osc.stop(now + 0.65);
  } catch (_) {
    // AudioContext not available — silent fail
  }
}

export function setSoundMuted(muted) {
  soundMuted = muted;
}

export function initBloodstream(map, canvas, getTrainState, getStationData) {
  const ctx = canvas.getContext('2d');

  // Victoria line stations — ordered array south→north
  let victoriaStations = [];

  // District line — one ordered array per branch
  let districtBranches = {
    spine: [],
    upminster: [],
    richmond: [],
    ealing: [],
    horseshoe: [],
  };

  // All district station positions, keyed by station ID
  let districtStationMap = {};

  let victoriaBoluses = [];
  let districtBoluses = [];
  let animFrame = null;
  let lastFetchedAt = null;

  const jitterPhase = {};

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function stationToPoint(s) {
    const pt = map.latLngToContainerPoint([s.lat, s.lng]);
    const rgb = hexToRgb(s.halo_hex);
    if (!jitterPhase[s.id]) {
      jitterPhase[s.id] = (Math.random() - 0.5) * 400;
    }
    return {
      id: s.id || s.station_id,
      name: s.name,
      x: pt.x,
      y: pt.y,
      halo_hex: s.halo_hex || '#ffa028',
      halo_rgb: rgb,
      wealth_score: s.wealth_score || 0.5,
      incident_jitter: s.incident_jitter || false,
      lat: s.lat,
      line: s.line,
    };
  }

  // ── Position computation ─────────────────────────────────────────────────────

  function computePositions() {
    const allData = getStationData();
    const entries = Object.values(allData);
    if (entries.length === 0) return;

    // Victoria line — build ordered array from VICTORIA_SEQUENCE_IDS
    const victoriaEntries = entries.filter(e => e.line === 'victoria');
    const vOrdered = [];
    for (const id of VICTORIA_SEQUENCE_IDS) {
      const s = victoriaEntries.find(e => (e.id || e.station_id) === id);
      if (s) vOrdered.push(stationToPoint(s));
    }
    if (vOrdered.length >= 3) {
      victoriaStations = vOrdered;
    } else {
      // Fallback: lat sort
      victoriaStations = victoriaEntries
        .filter(e => e.lat)
        .sort((a, b) => a.lat - b.lat)
        .map(stationToPoint);
    }

    // District line — build ordered arrays for each branch
    const districtEntries = entries.filter(e => e.line === 'district');
    districtStationMap = {};
    for (const s of districtEntries) {
      const pt = stationToPoint(s);
      districtStationMap[pt.id] = pt;
    }

    for (const [branchName, idList] of Object.entries(DISTRICT_BRANCHES)) {
      districtBranches[branchName] = idList
        .map(id => districtStationMap[id])
        .filter(Boolean);
    }
  }

  // ── Find branch for a District line bolus ───────────────────────────────────

  function findDistrictBranch(towards_station_id) {
    for (const branchName of DISTRICT_BRANCH_PRIORITY) {
      const seq = DISTRICT_BRANCHES[branchName];
      if (seq.includes(towards_station_id)) {
        return branchName;
      }
    }
    return 'spine';
  }

  // ── Bolus state management ──────────────────────────────────────────────────

  function rebuildBoluses() {
    const ts = getTrainState();
    if (!ts || !ts.trains) return;

    victoriaBoluses = [];
    districtBoluses = [];
    arrivedBoluses.clear();

    for (const t of ts.trains) {
      if (t.time_to_station_seconds == null) continue;

      if (t.line === 'victoria') {
        const targetIdx = victoriaStations.findIndex(
          s => s.id === t.towards_station_id
        );
        if (targetIdx < 0) continue;
        victoriaBoluses.push({
          vehicle_id: t.vehicle_id,
          target_station_idx: targetIdx,
          time_to_station_ms: t.time_to_station_seconds * 1000,
          last_updated: Date.now(),
          direction: t.direction || 'northbound',
        });

      } else if (t.line === 'district') {
        const branchName = findDistrictBranch(t.towards_station_id);
        const seq = districtBranches[branchName];
        if (!seq || seq.length === 0) continue;
        const targetIdx = seq.findIndex(s => s.id === t.towards_station_id);
        if (targetIdx < 0) continue;
        districtBoluses.push({
          vehicle_id: t.vehicle_id,
          branch: branchName,
          target_station_idx: targetIdx,
          time_to_station_ms: t.time_to_station_seconds * 1000,
          last_updated: Date.now(),
          direction: t.direction || 'westbound',
        });
      }
    }
  }

  function getBolusT(bolus) {
    const elapsed = Date.now() - bolus.last_updated;
    const remaining = Math.max(0, bolus.time_to_station_ms - elapsed);
    return Math.max(0, Math.min(1, 1 - remaining / AVG_TRAVEL_MS));
  }

  function getVictoriaBolusScreenPos(bolus, tOverride) {
    const t = tOverride !== undefined ? tOverride : getBolusT(bolus);
    const targetIdx = bolus.target_station_idx;
    const prevIdx = bolus.direction === 'northbound' ? targetIdx - 1 : targetIdx + 1;
    if (prevIdx < 0 || prevIdx >= victoriaStations.length) {
      return { x: victoriaStations[targetIdx].x, y: victoriaStations[targetIdx].y };
    }
    return lerpPoint(victoriaStations[prevIdx], victoriaStations[targetIdx], t);
  }

  function getDistrictBolusScreenPos(bolus, tOverride) {
    const t = tOverride !== undefined ? tOverride : getBolusT(bolus);
    const seq = districtBranches[bolus.branch];
    if (!seq || seq.length === 0) return null;
    const targetIdx = bolus.target_station_idx;
    const prevIdx = bolus.direction === 'westbound' ? targetIdx - 1 : targetIdx + 1;
    if (prevIdx < 0 || prevIdx >= seq.length) {
      return { x: seq[targetIdx].x, y: seq[targetIdx].y };
    }
    return lerpPoint(seq[prevIdx], seq[targetIdx], t);
  }

  function getBolusTimeToStation(bolus) {
    const elapsed = Date.now() - bolus.last_updated;
    return Math.max(0, bolus.time_to_station_ms - elapsed);
  }

  // ── Drawing — Victoria ───────────────────────────────────────────────────────

  function drawArtery(stationList, colours) {
    if (stationList.length < 2) return;
    // Outer vein wall
    ctx.beginPath();
    ctx.moveTo(stationList[0].x, stationList[0].y);
    for (let i = 1; i < stationList.length; i++) {
      const prev = stationList[i - 1];
      const curr = stationList[i];
      const mx = (prev.x + curr.x) / 2;
      const my = (prev.y + curr.y) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
    }
    ctx.lineTo(stationList[stationList.length - 1].x, stationList[stationList.length - 1].y);
    ctx.strokeStyle = colours.artery_outer;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Inner bright line
    ctx.beginPath();
    ctx.moveTo(stationList[0].x, stationList[0].y);
    for (let i = 1; i < stationList.length; i++) {
      const prev = stationList[i - 1];
      const curr = stationList[i];
      const mx = (prev.x + curr.x) / 2;
      const my = (prev.y + curr.y) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
    }
    ctx.lineTo(stationList[stationList.length - 1].x, stationList[stationList.length - 1].y);
    ctx.strokeStyle = colours.artery_inner;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function getCrowdingRadius() {
    const hour = new Date().getHours();
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) return 9;
    if (hour >= 6 && hour <= 22) return 7;
    return 5;
  }

  function drawBolus(pos, colours, opacityMultiplier = 1) {
    const { x, y } = pos;
    const r = getCrowdingRadius();
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0,    `${colours.core}${0.95 * opacityMultiplier})`);
    grad.addColorStop(0.44, `${colours.mid}${0.6  * opacityMultiplier})`);
    grad.addColorStop(1,    colours.edge);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  const arrivedBoluses = new Set();

  function drawBolusSet(boluses, getPos, colours, line) {
    for (const bolus of boluses) {
      const t = getBolusT(bolus);
      const pos = getPos(bolus, t);
      if (!pos) continue;

      // Fire arrival tone once per bolus when it reaches its station
      if (t >= 0.95 && !arrivedBoluses.has(bolus.vehicle_id)) {
        arrivedBoluses.add(bolus.vehicle_id);
        playArrivalTone(line);
      }

      // Single trailing echo — direction hint without the blob effect
      const trailPos = getPos(bolus, Math.max(0, t - 0.03));
      if (trailPos) drawBolus(trailPos, colours, 0.18);
      drawBolus(pos, colours, 1);
    }
  }

  function drawFlares(stationList, bolusSet, getPos) {
    const now = Date.now();
    for (let si = 0; si < stationList.length; si++) {
      const station = stationList[si];
      const { r, g, b } = station.halo_rgb;

      // Ambient pulse — barely visible, just a heartbeat hint
      const ambientPhase = (now / 3000 + si * 0.7) % 1;
      const ambientR = lerp(2, 4, Math.abs(Math.sin(ambientPhase * Math.PI)));
      const ambientOpacity = 0.08 + 0.04 * Math.sin(ambientPhase * Math.PI * 2);
      ctx.beginPath();
      ctx.arc(station.x, station.y, ambientR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${ambientOpacity})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Check approaching boluses
      let closestProximity = -1;
      for (const bolus of bolusSet) {
        let atThisStation = false;
        if (bolus.branch !== undefined) {
          // District line
          const seq = districtBranches[bolus.branch];
          if (seq && seq[bolus.target_station_idx] && seq[bolus.target_station_idx].id === station.id) {
            atThisStation = true;
          }
        } else {
          // Victoria line
          if (bolus.target_station_idx === si) atThisStation = true;
        }

        if (!atThisStation) continue;
        const tta = getBolusTimeToStation(bolus);
        if (tta <= FLARE_WINDOW_MS) {
          const proximity = 1 - tta / FLARE_WINDOW_MS;
          if (proximity > closestProximity) closestProximity = proximity;
        }
      }

      if (closestProximity < 0) continue;

      let jitter = 0;
      if (station.incident_jitter) {
        jitter = jitterPhase[station.id] || 0;
        const jitterT = ((now + jitter) / 1000) % 1;
        closestProximity = Math.max(0, Math.min(1, closestProximity + 0.05 * Math.sin(jitterT * Math.PI * 4)));
      }

      const p = closestProximity;
      // Tight arrival flare — a small glow, not an explosion
      const r1 = lerp(4, 14, p);
      const o1 = lerp(0.6, 0, p);
      ctx.beginPath();
      ctx.arc(station.x, station.y, r1, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${o1})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      const r2 = lerp(4, 9, p);
      ctx.beginPath();
      ctx.arc(station.x, station.y, r2, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${o1 * 0.4})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }

  function drawPulseRings() {
    const now = Date.now();
    const allStations = [...victoriaStations, ...Object.values(districtStationMap)];
    for (const s of allStations) {
      const densityFactor = 1 - (s.wealth_score || 0.5);
      const pulseMs = lerp(4000, 9000, 1 - densityFactor);
      const phase = (now % pulseMs) / pulseMs;
      const r = lerp(4, 18, phase);
      const opacity = lerp(0.07, 0, phase);
      const { r: cr, g: cg, b: cb } = s.halo_rgb;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${opacity})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }

  function drawThermal() {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const allStations = [...victoriaStations, ...Object.values(districtStationMap)];
    for (const s of allStations) {
      const heat = s.wealth_score || 0.5;
      const r = lerp(40, 130, heat);
      const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
      // Wealthy = white-gold, poor = deep red-orange
      const hotR = Math.round(lerp(200, 255, heat));
      const hotG = Math.round(lerp(30, 210, heat));
      const hotB = Math.round(lerp(0, 60, heat));
      grad.addColorStop(0,   `rgba(${hotR},${hotG},${hotB},0.75)`);
      grad.addColorStop(0.5, `rgba(${hotR},${hotG},${hotB},0.25)`);
      grad.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Main draw loop ───────────────────────────────────────────────────────────

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Victoria line — no canvas artery (Leaflet polylines serve that role)
    if (victoriaStations.length > 1) {
      drawFlares(victoriaStations, victoriaBoluses, getVictoriaBolusScreenPos);
      drawBolusSet(victoriaBoluses, getVictoriaBolusScreenPos, VICTORIA_BOLUS_COLOURS, 'victoria');
    }

    // District flares — draw for all district stations
    const allDistrictStations = Object.values(districtStationMap);
    if (allDistrictStations.length > 0) {
      drawFlares(allDistrictStations, districtBoluses, getDistrictBolusScreenPos);
    }

    // District boluses
    drawBolusSet(districtBoluses, getDistrictBolusScreenPos, DISTRICT_BOLUS_COLOURS, 'district');

    // Borough pulse rings (density-driven ambient animation)
    drawPulseRings();

    // Thermal portrait overlay
    if (thermalMode) drawThermal();

    // Check for new train data
    const ts = getTrainState();
    if (ts && ts.fetched_at !== lastFetchedAt) {
      lastFetchedAt = ts.fetched_at;
      rebuildBoluses();
    }

    animFrame = requestAnimationFrame(draw);
  }

  // ── Map event wiring ─────────────────────────────────────────────────────────

  map.on('moveend zoomend', () => {
    computePositions();
  });

  window.addEventListener('resize', () => {
    computePositions();
  });

  // ── Public API ───────────────────────────────────────────────────────────────

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

export { VICTORIA_SEQUENCE_IDS, DISTRICT_BRANCHES };
