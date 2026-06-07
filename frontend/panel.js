/**
 * panel.js — station panel rendering helpers
 */

/**
 * Render arrivals data into the dot-matrix board.
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
 * Render the enriched People / Place / Right Now panel sections.
 * @param {object} data - full station data from /api/station/{id}
 * @param {object|null} onThisDay - first matching On This Day event {year, text} or null
 */
export function renderPanelSections(data, onThisDay) {
  renderPeopleSection(data);
  renderPlaceSection(data, onThisDay);
  renderRightNowSection(data);
}

function renderPeopleSection(data) {
  const el = document.getElementById('panel-people-content');
  if (!el) return;

  const demo = data.demographics || {};
  const lines = [];

  const density = demo.population_density_per_km2;
  if (density) {
    lines.push(`<div class="data-line"><span class="data-label">DENSITY</span><span class="data-value">${density.toLocaleString()} / KM²</span></div>`);
  }

  const age = demo.median_age;
  if (age) {
    lines.push(`<div class="data-line"><span class="data-label">MED. AGE</span><span class="data-value">${age} YRS</span></div>`);
  }

  // Handle both old (string array) and new (object array) language formats
  const langs = demo.top_languages || [];
  if (langs.length > 0) {
    const langItems = langs.slice(0, 2).map(l => {
      if (typeof l === 'string') return l.toUpperCase();
      return `${l.language.toUpperCase()} ${l.percent ? `(${l.percent}%)` : ''}`;
    });
    lines.push(`<div class="data-line lang-line"><span class="data-label">LANGUAGES</span><span class="data-value lang-value">${langItems.join(' · ')}</span></div>`);
  }

  const income = demo.median_income_gbp || (data.demographics || {}).median_income_gbp;
  if (income) {
    lines.push(`<div class="data-line"><span class="data-label">MED. INCOME</span><span class="data-value">£${income.toLocaleString()}</span></div>`);
  }

  el.innerHTML = lines.length > 0 ? lines.join('') : '<div class="data-line"><span class="data-value">—</span></div>';
}

function renderPlaceSection(data, onThisDay) {
  const el = document.getElementById('panel-place-content');
  if (!el) return;

  const demo = data.demographics || {};
  const facts = demo.borough_facts;
  const lines = [];

  if (Array.isArray(facts) && facts.length > 0) {
    // Show all borough facts as static inscriptions
    facts.forEach(fact => {
      lines.push(`<div class="fact-static">&#8250; ${fact}</div>`);
    });
  } else {
    // Fallback: old-format fact_sentence + history_sentence
    if (demo.fact_sentence) lines.push(`<div class="fact-static">&#8250; ${demo.fact_sentence}</div>`);
    if (demo.history_sentence) lines.push(`<div class="fact-static">&#8250; ${demo.history_sentence}</div>`);
  }

  if (onThisDay) {
    const yearStr = onThisDay.year ? `${onThisDay.year}: ` : '';
    lines.push(`<div class="fact-static on-this-day">&#8250; ON THIS DAY — ${yearStr}${onThisDay.text}</div>`);
  }

  el.innerHTML = lines.length > 0 ? lines.join('') : '<div class="fact-static">—</div>';
}

/**
 * Render a side-by-side comparison of two stations in the compare section.
 */
export function renderComparison(dataA, dataB) {
  const el = document.getElementById('panel-compare-content');
  if (!el) return;

  const dA = dataA.demographics || {};
  const dB = dataB.demographics || {};

  function val(obj, key, fmt) {
    const v = obj[key];
    return v != null ? fmt(v) : '—';
  }

  const rows = [
    ['BOROUGH',  dataA.borough || '—',  dataB.borough || '—'],
    ['DENSITY',  val(dA, 'population_density_per_km2', v => `${v.toLocaleString()}/km²`),
                 val(dB, 'population_density_per_km2', v => `${v.toLocaleString()}/km²`)],
    ['INCOME',   val(dA, 'median_income_gbp', v => `£${v.toLocaleString()}`),
                 val(dB, 'median_income_gbp', v => `£${v.toLocaleString()}`)],
    ['MED AGE',  val(dA, 'median_age', v => `${v} yrs`),
                 val(dB, 'median_age', v => `${v} yrs`)],
    ['LIFE EXP', val(dA, 'life_expectancy', v => `${v} yrs`),
                 val(dB, 'life_expectancy', v => `${v} yrs`)],
    ['GREEN SPC',val(dA, 'green_space_pct', v => `${v}%`),
                 val(dB, 'green_space_pct', v => `${v}%`)],
  ];

  const html = rows.map(([label, a, b]) =>
    `<div class="compare-row">
      <span class="compare-label">${label}</span>
      <span class="compare-val">${a.toUpperCase()}</span>
      <span class="compare-val">${b.toUpperCase()}</span>
    </div>`
  ).join('');

  el.innerHTML = `
    <div class="compare-headers">
      <span></span>
      <span class="compare-head">${(dataA.name || '').toUpperCase()}</span>
      <span class="compare-head">${(dataB.name || '').toUpperCase()}</span>
    </div>
    ${html}
  `;
  el.style.display = 'block';
}

export function hideComparison() {
  const el = document.getElementById('panel-compare-content');
  if (el) el.style.display = 'none';
}

/**
 * Render borough data into the borough panel.
 */
export function renderBoroughPanel(data) {
  const nameEl = document.getElementById('borough-panel-name');
  const factsEl = document.getElementById('borough-panel-facts');
  const dataEl = document.getElementById('borough-panel-data');

  if (nameEl) nameEl.textContent = (data.borough || '').toUpperCase();

  // Facts
  if (factsEl) {
    const facts = data.borough_facts || [];
    factsEl.innerHTML = facts.length > 0
      ? facts.map(f => `<div class="fact-static">&#8250; ${f}</div>`).join('')
      : '<div class="fact-static">—</div>';
  }

  // Data rows
  if (dataEl) {
    const rows = [];
    if (data.population_density_per_km2)
      rows.push(['DENSITY', `${data.population_density_per_km2.toLocaleString()} / KM²`]);
    if (data.median_income_gbp)
      rows.push(['INCOME', `£${data.median_income_gbp.toLocaleString()}`]);
    if (data.median_age)
      rows.push(['MED. AGE', `${data.median_age} YRS`]);
    if (data.life_expectancy)
      rows.push(['LIFE EXP', `${data.life_expectancy} YRS`]);
    if (data.green_space_pct)
      rows.push(['GREEN SPC', `${data.green_space_pct}%`]);
    if (data.employment_rate)
      rows.push(['EMPLOYMENT', `${data.employment_rate}%`]);

    const langs = data.top_languages || [];
    if (langs.length > 0) {
      const langStr = langs.slice(0, 2).map(l =>
        typeof l === 'string' ? l : `${l.language} (${l.percent}%)`
      ).join(' · ');
      rows.push(['LANGUAGES', langStr.toUpperCase()]);
    }

    dataEl.innerHTML = rows.map(([label, val]) =>
      `<div class="data-line">
        <span class="data-label">${label}</span>
        <span class="data-value">${val}</span>
      </div>`
    ).join('') || '<div class="data-line"><span class="data-value">—</span></div>';
  }
}

function renderRightNowSection(data) {
  const el = document.getElementById('panel-now-content');
  if (!el) return;

  const lines = [];

  const count = data.incident_count;
  const type = data.top_incident_type;

  if (count != null) {
    lines.push(`<div class="data-line"><span class="data-label">INCIDENTS</span><span class="data-value">${count} THIS MONTH</span></div>`);
    if (type) {
      lines.push(`<div class="data-line"><span class="data-label">TOP TYPE</span><span class="data-value">${type.toUpperCase()}</span></div>`);
    }
  } else {
    lines.push(`<div class="data-line"><span class="data-value">POLICE DATA UNAVAILABLE</span></div>`);
  }

  el.innerHTML = lines.join('');
}
