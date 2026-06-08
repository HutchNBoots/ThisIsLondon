/**
 * typomap.js — The Typographic Map
 *
 * No tiles. No geography. Only names.
 * Each station name floats at its real lat/lng coordinate.
 * Font size encodes data; colour encodes line; weight encodes wealth.
 * The city as pure typography.
 */

export function initTypoMap(map, canvas, getStationData, getLineVisible, getLinePalette, getTrainState) {
  let active = false;
  let rafId = null;
  let tilePane = null;
  let overlayPane = null;
  let markerPane = null;

  // Deduplicated list of canonical stations (one entry per physical station)
  let stations = [];

  // Delayed line IDs from last train state poll (set of line names with delays)
  const delayedLines = new Set();

  function buildStationList() {
    const sd = getStationData();
    const seen = new Set();
    stations = [];
    for (const st of Object.values(sd)) {
      if (seen.has(st.name)) continue;
      seen.add(st.name);
      stations.push(st);
    }
  }

  // Determine if a given line currently has a disruption
  function refreshDelayState() {
    const ts = getTrainState();
    delayedLines.clear();
    if (!ts || !ts.trains) return;
    // If a line has very few trains relative to typical, flag it
    const countByLine = {};
    ts.trains.forEach(t => {
      const l = t.line || '';
      countByLine[l] = (countByLine[l] || 0) + 1;
    });
    // lines with 0 trains when there should be some = potential delay
    const allLines = Object.keys(getLinePalette());
    allLines.forEach(l => {
      if (!countByLine[l] || countByLine[l] < 2) delayedLines.add(l);
    });
  }

  function getPaletteForMode() {
    const isLight = document.body.classList.contains('mode-light');
    return getLinePalette(isLight);
  }

  function draw() {
    if (!active) return;

    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // Background fill — respects current mode
    const isLight = document.body.classList.contains('mode-light');
    const bg = isLight ? '#F0EAD6' : '#0E1018';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const palette = getPaletteForMode();
    const lineVisible = getLineVisible();

    refreshDelayState();

    // Line-skeleton: draw faint structural lines between consecutive stations
    // Uses a reduced set of well-known sequences to avoid re-importing bloodstream data.
    // We just draw straight segments between each visible station and its geographic
    // neighbours — enough to see the skeleton without needing full sequence arrays.

    // Group stations by line, sort by latitude (approximate north-south order)
    const byLine = {};
    stations.forEach(st => {
      if (!st.line) return;
      if (!byLine[st.line]) byLine[st.line] = [];
      byLine[st.line].push(st);
    });

    // Draw structural skeleton lines (faint)
    Object.entries(byLine).forEach(([line, stns]) => {
      if (!lineVisible[line]) return;
      const colour = palette[line] || '#888';
      // sort by lng then lat to get rough geographic order per line
      const sorted = [...stns].sort((a, b) => a.lng - b.lng);
      ctx.save();
      ctx.strokeStyle = colour;
      ctx.globalAlpha = isLight ? 0.12 : 0.10;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      sorted.forEach((st, i) => {
        const pt = map.latLngToContainerPoint([st.lat, st.lng]);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
      ctx.restore();
    });

    // Draw station names
    stations.forEach(st => {
      if (!lineVisible[st.line]) return;

      const pt = map.latLngToContainerPoint([st.lat, st.lng]);
      if (pt.x < -200 || pt.x > W + 200 || pt.y < -40 || pt.y > H + 40) return;

      // Font size: base 13px, scaled by wealth (font_weight proxy: 300=poor, 600=wealthy)
      const wealth = ((st.font_weight || 400) - 300) / 300; // 0..1
      const zoom = map.getZoom();
      const zoomScale = Math.max(0.6, Math.min(1.6, (zoom - 9) / 4));
      const fontSize = Math.round((11 + wealth * 9) * zoomScale);

      const colour = palette[st.line] || '#888';
      const isDelayed = delayedLines.has(st.line);

      ctx.save();
      ctx.font = `${st.font_weight || 400} ${fontSize}px 'Bebas Neue', 'Share Tech Mono', monospace`;
      ctx.letterSpacing = '3px';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      // Delayed lines render names in poster red
      const textColour = isDelayed
        ? (isLight ? '#C8102E' : '#FF4444')
        : colour;

      // Wealthy stations: full opacity. Deprived: slightly dimmer.
      ctx.globalAlpha = isLight
        ? 0.55 + wealth * 0.4
        : 0.45 + wealth * 0.5;

      ctx.fillStyle = textColour;
      ctx.fillText(st.name.toUpperCase(), pt.x + 6, pt.y);

      // Tiny line-colour dot to the left of the name
      ctx.globalAlpha = isLight ? 0.7 : 0.6;
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, Math.max(2, fontSize * 0.18), 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    // Wordmark watermark at bottom right
    ctx.save();
    ctx.font = `700 ${Math.round(11 * (canvas.width / 800))}px 'Bebas Neue', monospace`;
    ctx.fillStyle = isLight ? 'rgba(28,31,42,0.12)' : 'rgba(240,234,214,0.08)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('THIS IS LONDON — TYPOGRAPHIC MAP', W - 16, H - 16);
    ctx.restore();

    rafId = requestAnimationFrame(draw);
  }

  function hideTiles() {
    tilePane = map.getPane('tilePane');
    overlayPane = map.getPane('overlayPane');
    markerPane = map.getPane('markerPane');
    if (tilePane) tilePane.style.opacity = '0';
    if (overlayPane) overlayPane.style.opacity = '0';
    // Keep marker pane hidden — names are drawn on canvas
    if (markerPane) markerPane.style.opacity = '0';
  }

  function showTiles() {
    if (tilePane) tilePane.style.opacity = '';
    if (overlayPane) overlayPane.style.opacity = '';
    if (markerPane) markerPane.style.opacity = '';
  }

  function enter() {
    if (active) return;
    active = true;
    buildStationList();
    hideTiles();
    document.body.classList.add('mode-typo');
    draw();
  }

  function exit() {
    if (!active) return;
    active = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    showTiles();
    document.body.classList.remove('mode-typo');
    // Clear canvas so bloodstream can resume
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function toggle() {
    if (active) exit(); else enter();
    return active;
  }

  // Rebuild list when new stations load
  function refresh() {
    if (active) buildStationList();
  }

  return { enter, exit, toggle, refresh, isActive: () => active };
}
