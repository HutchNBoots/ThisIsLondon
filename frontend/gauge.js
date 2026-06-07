/**
 * gauge.js — line pressure gauge (M5d)
 * Renders a vertical SVG pressure gauge with no numbers — purely visual/analogue.
 */

const GAUGE_W = 28;
const GAUGE_H = 180;
const TRACK_X = 10;
const TRACK_Y = 24;
const TRACK_W = 8;
const TRACK_H = GAUGE_H - 46;

let fillEl = null;
let borderEl = null;

/**
 * Initialise the SVG gauge into the given container element.
 * @param {HTMLElement} container
 */
export function initGauge(container) {
  if (!container) return;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('viewBox', `0 0 ${GAUGE_W} ${GAUGE_H}`);

  // Outer background rect
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('x', '1');
  bg.setAttribute('y', '1');
  bg.setAttribute('width', GAUGE_W - 2);
  bg.setAttribute('height', GAUGE_H - 2);
  bg.setAttribute('rx', '4');
  bg.setAttribute('fill', '#0d0d0d');
  bg.setAttribute('stroke', '#ff990055');
  bg.setAttribute('stroke-width', '1');
  svg.appendChild(bg);

  // "LINE" label at top
  const labelTop = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  labelTop.setAttribute('x', GAUGE_W / 2);
  labelTop.setAttribute('y', '14');
  labelTop.setAttribute('text-anchor', 'middle');
  labelTop.setAttribute('font-family', "'Share Tech Mono', monospace");
  labelTop.setAttribute('font-size', '5');
  labelTop.setAttribute('fill', '#ff990066');
  labelTop.setAttribute('letter-spacing', '1');
  labelTop.textContent = 'LINE';
  svg.appendChild(labelTop);

  // Track (dark background bar)
  const track = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  track.setAttribute('x', TRACK_X);
  track.setAttribute('y', TRACK_Y);
  track.setAttribute('width', TRACK_W);
  track.setAttribute('height', TRACK_H);
  track.setAttribute('rx', '2');
  track.setAttribute('fill', '#0a0500');
  track.setAttribute('stroke', '#ff990033');
  track.setAttribute('stroke-width', '1');
  svg.appendChild(track);

  // Fill bar (positioned from bottom)
  fillEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  const initHeight = TRACK_H * 0.4;
  fillEl.setAttribute('x', TRACK_X);
  fillEl.setAttribute('y', TRACK_Y + TRACK_H - initHeight);
  fillEl.setAttribute('width', TRACK_W);
  fillEl.setAttribute('height', initHeight);
  fillEl.setAttribute('rx', '2');
  fillEl.setAttribute('fill', '#ff9900');
  fillEl.style.transition = 'height 0.8s ease, y 0.8s ease, fill 0.8s ease';
  svg.appendChild(fillEl);

  // "PWR" label at bottom
  const labelBot = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  labelBot.setAttribute('x', GAUGE_W / 2);
  labelBot.setAttribute('y', GAUGE_H - 6);
  labelBot.setAttribute('text-anchor', 'middle');
  labelBot.setAttribute('font-family', "'Share Tech Mono', monospace");
  labelBot.setAttribute('font-size', '5');
  labelBot.setAttribute('fill', '#ff990066');
  labelBot.setAttribute('letter-spacing', '1');
  labelBot.textContent = 'PWR';
  svg.appendChild(labelBot);

  container.appendChild(svg);
}

/**
 * Update the gauge fill based on current pressure state.
 * @param {{ running: number, scheduled: number, ratio: number, status: string }} pressureState
 */
export function updateGauge(pressureState) {
  if (!fillEl) return;

  const ratio = Math.min(1, Math.max(0, pressureState?.ratio ?? 0.4));
  const fillH = TRACK_H * ratio;
  const fillY = TRACK_Y + TRACK_H - fillH;

  let color;
  if (ratio > 0.8) {
    color = '#44ff88';
  } else if (ratio >= 0.5) {
    color = '#ff9900';
  } else {
    color = '#ff3300';
  }

  fillEl.setAttribute('height', fillH);
  fillEl.setAttribute('y', fillY);
  fillEl.setAttribute('fill', color);
}
