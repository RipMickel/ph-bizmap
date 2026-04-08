# ph-bizmap

# 🗺 PH BizMap — Business Mapping System

An interactive business mapping system for the Philippines, built with Leaflet.js, Chart.js, and vanilla JavaScript. Designed for sales territory management, logistics visualization, and market analysis.

---

## 🚀 Quick Start

```bash
npm install
npm start
# → http://127.0.0.1:8080
```

---

## ✨ Features

| Feature | Description |
|---|---|
| **Interactive Map** | Leaflet.js with CartoDB dark tiles + ESRI satellite |
| **25 Sample Locations** | Philippines-wide business data (NCR, Luzon, Visayas, Mindanao) |
| **Marker Clustering** | Toggle clustered/individual markers |
| **Heatmap** | Sales-weighted heat layer |
| **Territory Polygons** | Pre-drawn region boundaries + custom drawing tool |
| **Filters** | Filter by region, category, min. sales |
| **Search** | Live location search with zoom-to |
| **Analytics Dashboard** | KPIs, territory breakdown bars, doughnut chart |
| **Routing** | Click markers in routing mode to plot polyline routes |
| **Export** | GeoJSON & CSV export of filtered locations |
| **Import** | Drag-and-drop GeoJSON file import |
| **LocalStorage** | Drawn territories persist across page reloads |
| **Dark / Light Mode** | Toggle with header button |
| **Responsive** | Works on mobile and desktop |

---

## 📁 Project Structure

```
/
├── index.html          ← Main HTML shell
├── style.css           ← All styles (CSS variables, dark/light mode)
├── script.js           ← Map logic, filters, analytics, routing, export
├── data/
│   └── locations.json  ← 25 Philippines business locations
├── package.json        ← npm config + live-server script
└── README.md
```

---

## 🌐 Deploy to GitHub Pages

1. `git init && git add . && git commit -m "Initial commit"`
2. Create repo on github.com, then:
```bash
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```
3. Go to **Settings → Pages → Branch: main / folder: / (root)** → Save
4. Site live at `https://YOUR_USER.github.io/YOUR_REPO/`

---

## 🛠 Tech Stack

- **[Leaflet.js](https://leafletjs.com/)** — Map rendering
- **[Leaflet.Draw](https://github.com/Leaflet/Leaflet.draw)** — Territory drawing
- **[Leaflet.MarkerCluster](https://github.com/Leaflet/Leaflet.markercluster)** — Clustering
- **[Leaflet.Heat](https://github.com/Leaflet/Leaflet.heat)** — Heatmap
- **[Chart.js](https://www.chartjs.org/)** — Analytics charts
- **CartoDB / ESRI** — Tile layers
- **Vanilla JS** — No framework dependencies

---

## 📊 Data Format (`locations.json`)

```json
{
  "locations": [
    {
      "id": 1,
      "name": "Metro Manila HQ",
      "lat": 14.5995,
      "lng": 120.9842,
      "region": "NCR",
      "category": "Headquarters",
      "sales": 4850000,
      "address": "Makati City, Metro Manila"
    }
  ]
}
```

**Valid categories:** `Headquarters`, `Regional Office`, `Retail`, `Distribution`, `Warehouse`  
**Valid regions:** `NCR`, `Luzon`, `Visayas`, `Mindanao`

---

## 📝 License

MIT