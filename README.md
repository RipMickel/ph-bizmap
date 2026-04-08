# 🏦 PH BankMap — Banking Network System

An interactive **banking network mapping system for the Philippines**, built with **Leaflet.js, Chart.js, and vanilla JavaScript**.

Designed for:

* Branch network visualization
* Asset distribution analysis
* Territory management
* Financial operations planning

---

## 🚀 Quick Start

```bash
npm install
npm start
# → http://127.0.0.1:8080
```

---

## ✨ Features

| Feature                | Description                                                |
| ---------------------- | ---------------------------------------------------------- |
| 🗺 Interactive Map     | Leaflet.js with CartoDB dark tiles + ESRI satellite        |
| 🏦 Bank Branch Data    | Nationwide branch coverage (NCR, Luzon, Visayas, Mindanao) |
| 🔍 Search              | Live branch & location search with zoom-to                 |
| 🎯 Filters             | Filter by region, branch type, and minimum assets          |
| 📊 Analytics Dashboard | KPIs, asset breakdown, and branch insights                 |
| 🔥 Heatmap             | Asset-weighted density visualization                       |
| ⬡ Marker Clustering    | Toggle clustered or individual markers                     |
| ⬟ Territory Polygons   | Predefined regions + custom drawing tools                  |
| ✏ Drawing Tools        | Create and save custom territories                         |
| 🚗 Routing             | Plot routes by clicking branches                           |
| 📤 Export              | Export filtered data to GeoJSON & CSV                      |
| 📥 Import              | Drag-and-drop GeoJSON support                              |
| 💾 Persistence         | Saved drawings via LocalStorage                            |
| 🌙 Dark / Light Mode   | Toggle UI themes                                           |
| 📱 Responsive          | Optimized for desktop and mobile                           |

---

## 📁 Project Structure

```
/
├── index.html          ← Main UI layout
├── style.css           ← Styling (themes, layout, responsiveness)
├── script.js           ← Core logic (map, filters, analytics, routing)
├── data/
│   └── locations.json  ← Bank branch dataset
├── package.json        ← Dev server config
└── README.md
```

---

## 🌐 Deployment (GitHub Pages)

```bash
git init
git add .
git commit -m "Initial commit"

git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

Then:

1. Go to **Settings → Pages**
2. Set:

   * Branch: `main`
   * Folder: `/ (root)`
3. Click **Save**

Your site will be live at:

```
https://YOUR_USER.github.io/YOUR_REPO/
```

---

## 🛠 Tech Stack

* **Leaflet.js** — Map rendering
* **Leaflet.Draw** — Territory drawing
* **Leaflet.MarkerCluster** — Marker clustering
* **Leaflet.Heat** — Heatmap layer
* **Chart.js** — Analytics charts
* **CartoDB / ESRI** — Map tile providers
* **Vanilla JavaScript** — No framework dependencies

---

## 📊 Data Format (`locations.json`)

```json
{
  "locations": [
    {
      "id": 1,
      "name": "Makati Main Branch",
      "lat": 14.5547,
      "lng": 121.0244,
      "region": "NCR",
      "category": "Main Branch",
      "assets": 4850000000,
      "address": "Makati City, Metro Manila"
    }
  ]
}
```

### Valid Branch Types

* Main Branch
* Branch
* Rural Branch

### Valid Regions

* NCR
* Luzon
* Visayas
* Mindanao

---

## 📈 Use Cases

* 🏦 Bank network expansion planning
* 📊 Asset distribution analysis
* 🚚 Field operations & routing
* 🗺 Territory management
* 📍 Market coverage visualization

---

## 📝 License

MIT License

