/**
 * panel.js — station heartbeat panel helpers (M5c)
 */

let factsScrollInterval = null;

/**
 * Render arrivals data into the dot-matrix board.
 * @param {Array} arrivals - array of {towards_station_name, time_to_station_seconds, platform_name}
 * @param {string} stationName - name of the selected station
 */
export function renderArrivals(arrivals, stationName) {
  const el = document.getElementById('panel-arrivals');
  if (!el) return;

  if (!arrivals || arrivals.length === 0) {
    el.innerHTML = '<div class="arrival-row"><span class="arrival-destination">NO SERVICE DATA</span></div><span class="cursor-blink">_</span>';
    return;
  }

  const rows = arrivals.slice(0, 3).map((a) => {
    const dest = ((a.towards_station_name || a.destinationName || 'UNKNOWN'))
      .toUpperCase()
      .slice(0, 24);
    const secs = a.time_to_station_seconds ?? a.timeToStation ?? 0;
    const mins = Math.ceil(secs / 60);
    const timeClass = mins < 2 ? 'arrival-time soon' : 'arrival-time';
    const timeLabel = mins < 1 ? '&lt;1 MIN' : `${String(mins).padStart(2, '0')} MIN`;
    return `<div class="arrival-row">
      <span class="arrival-destination">${dest}</span>
      <span class="${timeClass}">${timeLabel}</span>
    </div>`;
  });

  el.innerHTML = rows.join('') + '<span class="cursor-blink">_</span>';
}

/**
 * Start the facts ticker scroll animation.
 * @param {string[]} facts - Array of fact sentences to scroll
 */
export function startFactsScroll(facts) {
  const container = document.getElementById('panel-facts');
  if (!container) return;

  // Clear any existing scroll
  if (factsScrollInterval) {
    clearInterval(factsScrollInterval);
    factsScrollInterval = null;
  }

  container.innerHTML = '';

  const inner = document.createElement('div');
  inner.id = 'panel-facts-inner';

  const lines = facts.filter(Boolean);
  if (lines.length === 0) return;

  // Render lines twice so the scroll loops seamlessly
  const renderLines = (arr) =>
    arr.map((f) => `<div class="fact-line">&#8250; ${f}</div>`).join('');

  inner.innerHTML = renderLines(lines) + renderLines(lines);
  container.appendChild(inner);

  // Calculate total height of one set of lines (approx 28px per line)
  const lineHeight = 28;
  const totalHeight = lines.length * lineHeight;

  // ~25px per second
  const duration = totalHeight / 25;
  inner.style.animationDuration = `${duration}s`;
  inner.style.animationName = 'scrollFacts';
  inner.style.animationTimingFunction = 'linear';
  inner.style.animationIterationCount = 'infinite';

  // Store total height as CSS var for the keyframe
  inner.style.setProperty('--scroll-height', `${totalHeight}px`);
}
