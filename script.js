/* ============================================================
   PH BizMap — script.js
   Business Mapping System for the Philippines
   ============================================================ */

'use strict';

/* ── State ───────────────────────────────────────────────── */
const STATE = {
  data:           [],          // raw locations from JSON
  filtered:       [],          // currently filtered set
  markers:        {},          // id → Leaflet marker
  selectedRegion: 'All',
  selectedCat:    'All',
  minSales:       0,
  routeMode:      false,
  routeStops:     [],          // array of location ids
  routePolyline:  null,
  clusterEnabled: true,
  heatEnabled:    false,
  territoriesVisible: true,
  darkMode:       true,
  satelliteVisible: false,
  chartInstance:  null,
  drawLayer:      null,        // Leaflet.Draw feature group
  heatLayer:      null,
  clusterGroup:   null,
  simpleGroup:    null,        // non-clustered marker group
};

/* ── Category → colour ──────────────────────────────────── */
const CAT_COLOR = {
  'Headquarters':    '#ff5252',
  'Regional Office': '#ff5252',
  'Retail':          '#00e676',
  'Distribution':    '#ffab40',
  'Warehouse':       '#b388ff',
};

/* ── Region → colour ────────────────────────────────────── */
const REGION_COLOR = {
  NCR:      '#00d4ff',
  Luzon:    '#00e676',
  Visayas:  '#ffab40',
  Mindanao: '#b388ff',
};

/* ── Predefined territory polygons (rough bounding areas) ── */
const TERRITORIES = [
  {
    name: 'NCR Territory',
    region: 'NCR',
    color: '#00d4ff',
    coords: [
      [14.77, 120.89], [14.77, 121.12], [14.45, 121.12], [14.45, 120.89]
    ],
  },
  {
    name: 'Luzon Territory',
    region: 'Luzon',
    color: '#00e676',
    coords: [
      [18.5, 119.5], [18.5, 122.5], [13.0, 122.5], [13.0, 119.5]
    ],
  },
  {
    name: 'Visayas Territory',
    region: 'Visayas',
    color: '#ffab40',
    coords: [
      [12.0, 121.5], [12.0, 125.5], [9.0, 125.5], [9.0, 121.5]
    ],
  },
  {
    name: 'Mindanao Territory',
    region: 'Mindanao',
    color: '#b388ff',
    coords: [
      [9.5, 121.5], [9.5, 126.5], [5.5, 126.5], [5.5, 121.5]
    ],
  },
];

/* ═══════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  loadData();
  initUI();
});

/* ── Map initialisation ──────────────────────────────────── */
let map;
let tileLayerDark, tileLayerSatellite;

function initMap() {
  // Create map centred on Philippines
  map = L.map('map', {
    center: [12.5, 122.5],
    zoom: 6,
    zoomControl: true,
  });

  // Dark tile layer (CartoDB dark matter)
  tileLayerDark = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    { attribution: '&copy; CartoDB &copy; OSM', subdomains: 'abcd', maxZoom: 19 }
  ).addTo(map);

  // Satellite layer (ESRI)
  tileLayerSatellite = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { attribution: '&copy; Esri', maxZoom: 19 }
  );

  // Draw control (Leaflet Draw)
  STATE.drawLayer = new L.FeatureGroup().addTo(map);
  const drawControl = new L.Control.Draw({
    edit: { featureGroup: STATE.drawLayer },
    draw: {
      polygon:    { shapeOptions: { color: '#00d4ff', fillOpacity: 0.15 } },
      polyline:   false,
      rectangle:  { shapeOptions: { color: '#00e676', fillOpacity: 0.15 } },
      circle:     false,
      marker:     false,
      circlemarker: false,
    },
  });
  map.addControl(drawControl);

  // Handle drawn shapes
  map.on(L.Draw.Event.CREATED, (e) => {
    STATE.drawLayer.addLayer(e.layer);
    updateStatus(`Territory drawn · ${STATE.drawLayer.getLayers().length} custom shape(s)`);
    saveToLocalStorage();
  });

  // Marker groups
  STATE.clusterGroup = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 50 });
  STATE.simpleGroup  = L.layerGroup();

  // Territory polygons layer
  initTerritoryPolygons();
}

/* ── Load data from JSON ─────────────────────────────────── */
function loadData() {
  fetch('data/locations.json')
    .then(r => {
      if (!r.ok) throw new Error('Network response error');
      return r.json();
    })
    .then(json => {
      STATE.data     = json.locations;
      STATE.filtered = [...STATE.data];
      buildMarkers();
      renderLocationList();
      renderAnalytics();
      fitBounds();
      loadFromLocalStorage(); // restore saved drawings
    })
    .catch(err => {
      console.error('Failed to load locations.json:', err);
      updateStatus('⚠ Could not load data/locations.json — make sure you run via live-server');
    });
}

/* ── Custom SVG marker icon ──────────────────────────────── */
function makeIcon(color, size = 14) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size * 2}" height="${size * 2.4}" viewBox="0 0 28 34">
      <circle cx="14" cy="14" r="11" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="2"/>
      <circle cx="14" cy="14" r="5" fill="${color}"/>
      <line x1="14" y1="25" x2="14" y2="33" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize:   [size * 2, size * 2.4],
    iconAnchor: [size, size * 2.4],
    popupAnchor:[0, -size * 2.4],
  });
}

/* ── Build all Leaflet markers ───────────────────────────── */
function buildMarkers() {
  STATE.clusterGroup.clearLayers();
  STATE.simpleGroup.clearLayers();
  STATE.markers = {};

  STATE.data.forEach(loc => {
    const color  = CAT_COLOR[loc.category] || '#00d4ff';
    const icon   = makeIcon(color);
    const marker = L.marker([loc.lat, loc.lng], { icon });

    // Popup
    marker.bindPopup(buildPopupHTML(loc), { maxWidth: 240 });

    // Hover tooltip
    marker.on('mouseover', (e) => showTooltip(loc, e.originalEvent));
    marker.on('mousemove', (e) => moveTooltip(e.originalEvent));
    marker.on('mouseout',  ()  => hideTooltip());

    // Click handler
    marker.on('click', () => handleMarkerClick(loc));

    STATE.markers[loc.id] = marker;
    STATE.clusterGroup.addLayer(marker);
    STATE.simpleGroup.addLayer(marker);
  });

  activateClusterMode(STATE.clusterEnabled);
}

function buildPopupHTML(loc) {
  return `
    <div class="popup-inner">
      <div class="popup-name">${loc.name}</div>
      <div class="popup-grid">
        <span class="popup-key">Region</span>
        <span class="popup-val">${loc.region}</span>
        <span class="popup-key">Category</span>
        <span class="popup-val">${loc.category}</span>
        <span class="popup-key">Address</span>
        <span class="popup-val">${loc.address}</span>
        <span class="popup-key">Sales</span>
        <span class="popup-val popup-sales-val">${formatCurrency(loc.sales)}</span>
      </div>
    </div>`;
}

/* ── Territory polygons (predefined) ─────────────────────── */
let territoryPolyLayer;
function initTerritoryPolygons() {
  territoryPolyLayer = L.layerGroup();
  TERRITORIES.forEach(t => {
    const poly = L.polygon(t.coords, {
      color:       t.color,
      fillColor:   t.color,
      fillOpacity: 0.05,
      weight:      1.5,
      dashArray:   '6 4',
    });
    poly.bindTooltip(t.name, { permanent: false, className: '' });
    territoryPolyLayer.addLayer(poly);
  });
  territoryPolyLayer.addTo(map);
}

/* ── Apply filter & re-render ───────────────────────────── */
function applyFilters() {
  const q = document.getElementById('search-input').value.toLowerCase().trim();

  STATE.filtered = STATE.data.filter(loc => {
    const matchRegion = STATE.selectedRegion === 'All' || loc.region === STATE.selectedRegion;
    const matchCat    = STATE.selectedCat    === 'All' || loc.category === STATE.selectedCat;
    const matchSales  = loc.sales >= STATE.minSales;
    const matchSearch = !q || loc.name.toLowerCase().includes(q) || loc.address.toLowerCase().includes(q);
    return matchRegion && matchCat && matchSales && matchSearch;
  });

  updateMarkerVisibility();
  renderLocationList();
  renderAnalytics();
  updateStatus(`Showing ${STATE.filtered.length} of ${STATE.data.length} locations`);
}

function updateMarkerVisibility() {
  const visibleIds = new Set(STATE.filtered.map(l => l.id));
  Object.entries(STATE.markers).forEach(([id, marker]) => {
    const visible = visibleIds.has(Number(id));
    if (STATE.clusterEnabled) {
      visible ? STATE.clusterGroup.addLayer(marker) : STATE.clusterGroup.removeLayer(marker);
    } else {
      visible ? STATE.simpleGroup.addLayer(marker) : STATE.simpleGroup.removeLayer(marker);
    }
  });

  // Refresh heatmap
  if (STATE.heatEnabled) refreshHeatmap();
}

/* ── Clustering toggle ───────────────────────────────────── */
function activateClusterMode(enable) {
  STATE.clusterEnabled = enable;
  if (enable) {
    map.removeLayer(STATE.simpleGroup);
    map.addLayer(STATE.clusterGroup);
  } else {
    map.removeLayer(STATE.clusterGroup);
    map.addLayer(STATE.simpleGroup);
  }
  updateMarkerVisibility();
}

/* ── Heatmap ─────────────────────────────────────────────── */
function refreshHeatmap() {
  if (STATE.heatLayer) map.removeLayer(STATE.heatLayer);
  if (!STATE.heatEnabled) return;

  const pts = STATE.filtered.map(loc => [
    loc.lat, loc.lng, Math.min(loc.sales / 5000000, 1)
  ]);
  STATE.heatLayer = L.heatLayer(pts, { radius: 40, blur: 25, maxZoom: 10 }).addTo(map);
}

/* ── Location list (sidebar) ─────────────────────────────── */
function renderLocationList() {
  const el = document.getElementById('location-list');
  el.innerHTML = '';

  if (!STATE.filtered.length) {
    el.innerHTML = '<div style="padding:16px;font-family:var(--font-mono);font-size:10px;color:var(--text-muted);text-align:center">No locations match filters</div>';
    return;
  }

  STATE.filtered.forEach(loc => {
    const color = CAT_COLOR[loc.category] || '#00d4ff';
    const item  = document.createElement('div');
    item.className = 'location-item';
    item.dataset.id = loc.id;
    item.innerHTML  = `
      <div class="loc-dot" style="background:${color}"></div>
      <div class="loc-info">
        <div class="loc-name">${loc.name}</div>
        <div class="loc-meta">${loc.region} · ${loc.category}</div>
      </div>
      <div class="loc-sales">${formatCurrencyShort(loc.sales)}</div>`;
    item.addEventListener('click', () => zoomToLocation(loc));
    el.appendChild(item);
  });
}

/* ── Zoom to location ─────────────────────────────────────── */
function zoomToLocation(loc) {
  map.flyTo([loc.lat, loc.lng], 13, { animate: true, duration: 0.8 });
  STATE.markers[loc.id]?.openPopup();
  // Highlight list item
  document.querySelectorAll('.location-item').forEach(el => {
    el.classList.toggle('selected', Number(el.dataset.id) === loc.id);
  });
}

/* ── Marker click (routing + zoom) ───────────────────────── */
function handleMarkerClick(loc) {
  if (STATE.routeMode) {
    addRouteStop(loc);
    return;
  }
  zoomToLocation(loc);
}

/* ── Routing ─────────────────────────────────────────────── */
function addRouteStop(loc) {
  if (STATE.routeStops.find(s => s.id === loc.id)) return; // no duplicates
  STATE.routeStops.push(loc);
  renderRoute();
}

function renderRoute() {
  if (STATE.routePolyline) map.removeLayer(STATE.routePolyline);

  const listEl = document.getElementById('route-list');
  listEl.innerHTML = STATE.routeStops.map((s, i) =>
    `<div class="route-stop">${i + 1}. ${s.name}</div>`
  ).join('');

  if (STATE.routeStops.length < 2) return;

  const latlngs = STATE.routeStops.map(s => [s.lat, s.lng]);
  STATE.routePolyline = L.polyline(latlngs, {
    color:     '#00d4ff',
    weight:    3,
    dashArray: '8 5',
    opacity:   0.85,
  }).addTo(map);
  map.fitBounds(STATE.routePolyline.getBounds(), { padding: [30, 30] });
}

function clearRoute() {
  if (STATE.routePolyline) map.removeLayer(STATE.routePolyline);
  STATE.routePolyline = null;
  STATE.routeStops    = [];
  document.getElementById('route-list').innerHTML = '';
}

/* ── Analytics ───────────────────────────────────────────── */
function renderAnalytics() {
  const total   = STATE.filtered.reduce((s, l) => s + l.sales, 0);
  const count   = STATE.filtered.length;
  const avg     = count ? Math.round(total / count) : 0;

  // KPIs
  document.getElementById('kpi-total-sales').textContent = formatCurrencyShort(total);
  document.getElementById('kpi-count').textContent       = count;
  document.getElementById('kpi-avg').textContent         = formatCurrencyShort(avg);

  // Territory breakdown
  const byRegion = {};
  STATE.filtered.forEach(l => {
    byRegion[l.region] = (byRegion[l.region] || 0) + l.sales;
  });
  const topRegion = Object.entries(byRegion).sort((a, b) => b[1] - a[1])[0];
  document.getElementById('kpi-top-region').textContent = topRegion ? topRegion[0] : '—';

  const maxSales = Math.max(...Object.values(byRegion), 1);
  const statsEl  = document.getElementById('territory-stats');
  statsEl.innerHTML = '';
  Object.entries(byRegion).sort((a, b) => b[1] - a[1]).forEach(([region, sales]) => {
    const color  = REGION_COLOR[region] || '#00d4ff';
    const pct    = ((sales / maxSales) * 100).toFixed(1);
    const locCnt = STATE.filtered.filter(l => l.region === region).length;
    statsEl.innerHTML += `
      <div class="t-stat">
        <div class="t-stat-header">
          <span class="t-name" style="color:${color}">${region}</span>
          <span class="t-count">${locCnt} sites</span>
        </div>
        <div class="t-bar-bg">
          <div class="t-bar" style="width:${pct}%;background:${color}"></div>
        </div>
        <div class="t-sales">${formatCurrency(sales)}</div>
      </div>`;
  });

  renderChart();
}

function renderChart() {
  // Aggregate by category
  const byCat = {};
  STATE.filtered.forEach(l => {
    byCat[l.category] = (byCat[l.category] || 0) + l.sales;
  });
  const labels = Object.keys(byCat);
  const values = labels.map(k => byCat[k]);
  const colors = labels.map(k => CAT_COLOR[k] || '#00d4ff');

  if (STATE.chartInstance) STATE.chartInstance.destroy();

  const ctx = document.getElementById('salesChart').getContext('2d');
  STATE.chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data:            values,
        backgroundColor: colors.map(c => c + '55'),
        borderColor:     colors,
        borderWidth:     2,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: {
            color:     '#7a8599',
            font:      { family: 'Space Mono', size: 9 },
            boxWidth:  10,
            padding:   8,
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${formatCurrency(ctx.raw)}`,
          },
        },
      },
    },
  });
}

/* ── Search ──────────────────────────────────────────────── */
function handleSearch(q) {
  const resultsEl = document.getElementById('search-results');
  resultsEl.innerHTML = '';
  if (!q) { applyFilters(); return; }

  const matches = STATE.data.filter(l =>
    l.name.toLowerCase().includes(q.toLowerCase()) ||
    l.address.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 6);

  matches.forEach(loc => {
    const div = document.createElement('div');
    div.className = 'search-result-item';
    div.innerHTML = `<span>${loc.name}</span><span>${loc.region}</span>`;
    div.addEventListener('click', () => {
      zoomToLocation(loc);
      resultsEl.innerHTML = '';
      document.getElementById('search-input').value = loc.name;
    });
    resultsEl.appendChild(div);
  });

  applyFilters();
}

/* ── Fit bounds ─────────────────────────────────────────── */
function fitBounds() {
  const pts = STATE.filtered.map(l => [l.lat, l.lng]);
  if (pts.length) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40] });
}

/* ── Export / Import ─────────────────────────────────────── */
function exportGeoJSON() {
  const features = STATE.filtered.map(loc => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [loc.lng, loc.lat] },
    properties: { id: loc.id, name: loc.name, region: loc.region, category: loc.category, sales: loc.sales, address: loc.address },
  }));
  const gj      = { type: 'FeatureCollection', features };
  const blob     = new Blob([JSON.stringify(gj, null, 2)], { type: 'application/json' });
  const url      = URL.createObjectURL(blob);
  const a        = document.createElement('a');
  a.href         = url;
  a.download     = 'ph-bizmap-export.geojson';
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV() {
  const rows = [['ID','Name','Region','Category','Sales','Lat','Lng','Address']];
  STATE.filtered.forEach(l => {
    rows.push([l.id, `"${l.name}"`, l.region, l.category, l.sales, l.lat, l.lng, `"${l.address}"`]);
  });
  const csv  = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'ph-bizmap-export.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function importGeoJSON(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const gj = JSON.parse(e.target.result);
      L.geoJSON(gj, {
        style: { color: '#00d4ff', weight: 2, fillOpacity: 0.1 },
        onEachFeature(feature, layer) {
          if (feature.properties) {
            layer.bindPopup(JSON.stringify(feature.properties, null, 2));
          }
        },
      }).addTo(map);
      updateStatus('GeoJSON imported successfully');
    } catch {
      updateStatus('⚠ Invalid GeoJSON file');
    }
  };
  reader.readAsText(file);
}

/* ── LocalStorage ────────────────────────────────────────── */
function saveToLocalStorage() {
  try {
    const layers = [];
    STATE.drawLayer.eachLayer(layer => {
      layers.push(layer.toGeoJSON());
    });
    localStorage.setItem('ph-bizmap-drawings', JSON.stringify(layers));
  } catch (e) { /* ignore */ }
}

function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem('ph-bizmap-drawings');
    if (!saved) return;
    JSON.parse(saved).forEach(gj => {
      L.geoJSON(gj, { style: { color: '#00d4ff', fillOpacity: 0.15, weight: 2 } })
        .eachLayer(l => STATE.drawLayer.addLayer(l));
    });
  } catch (e) { /* ignore */ }
}

/* ── Tooltip ─────────────────────────────────────────────── */
function showTooltip(loc, ev) {
  const tt = document.getElementById('map-tooltip');
  document.getElementById('tt-name').textContent  = loc.name;
  document.getElementById('tt-meta').textContent  = `${loc.region} · ${loc.category}`;
  document.getElementById('tt-sales').textContent = formatCurrency(loc.sales);
  tt.style.display = 'block';
  moveTooltip(ev);
}
function moveTooltip(ev) {
  const tt   = document.getElementById('map-tooltip');
  const wrap = document.getElementById('map-wrap');
  const rect = wrap.getBoundingClientRect();
  let x = ev.clientX - rect.left + 14;
  let y = ev.clientY - rect.top  + 14;
  if (x + 210 > rect.width)  x -= 220;
  if (y + 80  > rect.height) y -= 90;
  tt.style.left = x + 'px';
  tt.style.top  = y + 'px';
}
function hideTooltip() {
  document.getElementById('map-tooltip').style.display = 'none';
}

/* ── Status bar ──────────────────────────────────────────── */
function updateStatus(msg) {
  document.getElementById('status-bar').textContent = msg;
}

/* ── Formatters ──────────────────────────────────────────── */
function formatCurrency(v) {
  return '₱' + v.toLocaleString('en-PH');
}
function formatCurrencyShort(v) {
  if (v >= 1_000_000) return '₱' + (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000)     return '₱' + (v / 1_000).toFixed(0) + 'K';
  return '₱' + v;
}

/* ═══════════════════════════════════════════════════════════
   UI EVENT BINDINGS
   ═══════════════════════════════════════════════════════════ */
function initUI() {

  /* ── Tab switching ── */
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab + '-tab').classList.add('active');
      if (btn.dataset.tab === 'analytics') renderAnalytics();
    });
  });

  /* ── Sidebar toggle ── */
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle');
  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    toggleBtn.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀';
    setTimeout(() => map.invalidateSize(), 260);
  });

  /* ── Region chips ── */
  document.getElementById('region-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('#region-chips .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    STATE.selectedRegion = chip.dataset.region;
    applyFilters();
  });

  /* ── Category chips ── */
  document.getElementById('category-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('#category-chips .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    STATE.selectedCat = chip.dataset.category;
    applyFilters();
  });

  /* ── Sales slider ── */
  const rangeEl = document.getElementById('sales-range');
  const rangeValEl = document.getElementById('sales-range-val');
  rangeEl.addEventListener('input', () => {
    STATE.minSales   = Number(rangeEl.value);
    rangeValEl.textContent = formatCurrencyShort(STATE.minSales);
    applyFilters();
  });

  /* ── Search ── */
  document.getElementById('search-input').addEventListener('input', (e) => {
    handleSearch(e.target.value);
  });

  /* ── Clustering toggle ── */
  document.getElementById('toggle-cluster').addEventListener('click', function() {
    this.classList.toggle('active');
    activateClusterMode(!STATE.clusterEnabled);
    updateStatus(STATE.clusterEnabled ? 'Clustering ON' : 'Clustering OFF');
  });

  /* ── Heatmap toggle ── */
  document.getElementById('toggle-heatmap').addEventListener('click', function() {
    this.classList.toggle('active');
    STATE.heatEnabled = !STATE.heatEnabled;
    refreshHeatmap();
    updateStatus(STATE.heatEnabled ? 'Heatmap ON' : 'Heatmap OFF');
  });

  /* ── Territory visibility ── */
  document.getElementById('toggle-territories').addEventListener('click', function() {
    this.classList.toggle('active');
    STATE.territoriesVisible = !STATE.territoriesVisible;
    if (STATE.territoriesVisible) territoryPolyLayer.addTo(map);
    else map.removeLayer(territoryPolyLayer);
    updateStatus('Territory boundaries ' + (STATE.territoriesVisible ? 'visible' : 'hidden'));
  });

  /* ── Draw polygon shortcut ── */
  document.getElementById('draw-polygon-btn').addEventListener('click', () => {
    new L.Draw.Polygon(map, {
      shapeOptions: { color: '#ffab40', fillOpacity: 0.15 },
    }).enable();
    updateStatus('Draw mode: click on map to create polygon vertices, double-click to finish');
  });

  /* ── Clear drawings ── */
  document.getElementById('clear-drawings-btn').addEventListener('click', () => {
    STATE.drawLayer.clearLayers();
    localStorage.removeItem('ph-bizmap-drawings');
    updateStatus('Custom drawings cleared');
  });

  /* ── Routing mode ── */
  document.getElementById('toggle-routing').addEventListener('click', function() {
    this.classList.toggle('active');
    STATE.routeMode = !STATE.routeMode;
    map.getContainer().style.cursor = STATE.routeMode ? 'crosshair' : '';
    updateStatus(STATE.routeMode
      ? 'Routing mode ON — click markers to add stops'
      : 'Routing mode OFF');
  });

  /* ── Clear route ── */
  document.getElementById('clear-route-btn').addEventListener('click', () => {
    clearRoute();
    updateStatus('Route cleared');
  });

  /* ── Fit bounds ── */
  document.getElementById('btn-fit-bounds').addEventListener('click', () => {
    fitBounds();
    updateStatus('View reset to all visible locations');
  });

  /* ── Satellite toggle ── */
  document.getElementById('btn-satellite').addEventListener('click', function() {
    this.classList.toggle('active');
    STATE.satelliteVisible = !STATE.satelliteVisible;
    if (STATE.satelliteVisible) {
      map.removeLayer(tileLayerDark);
      tileLayerSatellite.addTo(map);
    } else {
      map.removeLayer(tileLayerSatellite);
      tileLayerDark.addTo(map);
    }
    updateStatus(STATE.satelliteVisible ? 'Satellite layer active' : 'Dark map layer active');
  });

  /* ── Dark mode toggle ── */
  document.getElementById('dark-mode-btn').addEventListener('click', function() {
    STATE.darkMode = !STATE.darkMode;
    document.body.classList.toggle('light', !STATE.darkMode);
    this.textContent = STATE.darkMode ? '☀ LIGHT' : '🌙 DARK';
    // Swap tile layers
    if (!STATE.satelliteVisible) {
      if (STATE.darkMode) {
        if (!map.hasLayer(tileLayerDark)) {
          map.removeLayer(tileLayerSatellite);
          tileLayerDark.addTo(map);
        }
      } else {
        map.removeLayer(tileLayerDark);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
          { attribution: '&copy; CartoDB &copy; OSM', subdomains: 'abcd', maxZoom: 19 }
        ).addTo(map);
      }
    }
  });

  /* ── Export ── */
  document.getElementById('export-geojson').addEventListener('click', exportGeoJSON);
  document.getElementById('export-csv').addEventListener('click', exportCSV);

  /* ── Import ── */
  document.getElementById('import-geojson').addEventListener('change', (e) => {
    if (e.target.files[0]) importGeoJSON(e.target.files[0]);
  });
}