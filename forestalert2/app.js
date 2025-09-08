/* Forest Alert — Mock 2025 */
const MAP_BOUNDS_INDIA = [[6, 68], [38, 98]]; // rough bounds
const STATE_LIST = ["Telangana", "Odisha", "Tripura", "Madhya Pradesh"];

const stateCenters = {
  "Telangana": [18.1124, 79.0193],
  "Odisha": [20.9517, 85.0985],
  "Tripura": [23.9408, 91.9882],
  "Madhya Pradesh": [23.4733, 77.9470]
};

let map, allAlerts = [], markersLayer;
const colors = { Low: "#71c562", Medium: "#ffc857", High: "#ff6b6b" };

function initMap() {
  map = L.map('map', { maxBounds: MAP_BOUNDS_INDIA, maxBoundsViscosity: 0.7 }).setView([22.5, 80], 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);
}

function chipEl(name) {
  const el = document.createElement('button');
  el.className = 'chip active';
  el.dataset.state = name;
  el.textContent = name;
  el.addEventListener('click', () => {
    el.classList.toggle('active');
  });
  return el;
}

function setupControls() {
  const wrap = document.getElementById('state-filters');
  STATE_LIST.forEach(s => wrap.appendChild(chipEl(s)));

  document.getElementById('apply-btn').addEventListener('click', applyFilters);
  document.getElementById('reset-btn').addEventListener('click', () => {
    // Reset states
    [...document.querySelectorAll('.chip')].forEach(c => c.classList.add('active'));
    // Reset severity
    [...document.querySelectorAll('input[name=sev]')].forEach(i => i.checked = true);
    // Reset dates
    document.getElementById('start-date').value = '2025-01-01';
    document.getElementById('end-date').value   = '2025-12-31';
    applyFilters();
  });

  document.getElementById('download-visible').addEventListener('click', (e) => {
    e.preventDefault();
    downloadVisible();
  });
}

function fetchData() {
  return fetch('./data/alerts_2025.json')
    .then(r => r.json())
    .then(j => {
      allAlerts = j.alerts.map(a => ({ ...a, ts: new Date(a.date).getTime() }));
      document.getElementById('stat-total').textContent = allAlerts.length.toLocaleString();
      applyFilters();
    });
}

function currentFilters() {
  const activeStates = [...document.querySelectorAll('.chip.active')].map(c => c.dataset.state);
  const severities = [...document.querySelectorAll('input[name=sev]:checked')].map(i => i.value);
  const start = new Date(document.getElementById('start-date').value).getTime();
  const end   = new Date(document.getElementById('end-date').value);
  end.setHours(23,59,59,999);
  return { activeStates, severities, start: start, end: end.getTime() };
}

function applyFilters() {
  markersLayer.clearLayers();
  const f = currentFilters();
  const filtered = allAlerts.filter(a =>
    f.activeStates.includes(a.state) &&
    f.severities.includes(a.severity) &&
    a.ts >= f.start && a.ts <= f.end
  );

  filtered.forEach(a => {
    const m = L.circleMarker([a.lat, a.lon], {
      radius: 7,
      color: colors[a.severity],
      fillColor: colors[a.severity],
      fillOpacity: 0.8,
      weight: 1
    }).bindPopup(`
      <div class="popup">
        <div><b>${a.state}</b> • <span style="color:${colors[a.severity]}">${a.severity}</span></div>
        <div><small>${new Date(a.date).toLocaleString()}</small></div>
        <div>Cause: ${a.cause}</div>
        <div>Source: ${a.source} • Confidence: ${a.confidence}%</div>
        <div><em>${a.notes}</em></div>
        <div><code>ID: ${a.id}</code></div>
      </div>
    `);
    markersLayer.addLayer(m);
  });

  document.getElementById('stat-visible').textContent = filtered.length.toLocaleString();
  renderByState(filtered);
}

function renderByState(list) {
  const by = {};
  STATE_LIST.forEach(s => by[s] = 0);
  list.forEach(a => by[a.state]++);
  const container = document.getElementById('by-state');
  container.innerHTML = Object.entries(by).map(([s,c]) => `<div>${s}: <b>${c}</b></div>`).join('');
}

function downloadVisible() {
  const f = currentFilters();
  const filtered = allAlerts.filter(a =>
    f.activeStates.includes(a.state) &&
    f.severities.includes(a.severity) &&
    a.ts >= f.start && a.ts <= f.end
  ).map(({ts, ...rest}) => rest);

  const blob = new Blob([JSON.stringify({generatedAt: new Date().toISOString(), count: filtered.length, alerts: filtered}, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'visible_alerts_2025.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

window.addEventListener('DOMContentLoaded', () => {
  initMap();
  setupControls();
  fetchData();
});
