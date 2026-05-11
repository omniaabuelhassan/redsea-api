/**
 * RED SEA MARINE EXPLORER - FINAL INTEGRATED SCRIPT
 * Fixed: API URL updated to Render production
 */

// ✅ ONE PLACE to change the API URL — easy to update later
const API_BASE = "https://redsea-api.onrender.com";

// 1. Initialize Map
const map = L.map("map").setView([22.0, 38.5], 6);

L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
}).addTo(map);

// 2. Define Layer Groups
const heatLayerGroup = L.layerGroup().addTo(map);
const markerLayerGroup = L.layerGroup().addTo(map);

// 3. UI Selectors
const speciesSelect = document.getElementById("speciesSelect");
const radiusSlider = document.getElementById("radiusSlider");
const radiusLabel = document.getElementById("radiusLabel");
const applyBtn = document.getElementById("applyBtn");
const totalCountLabel = document.getElementById("totalCount");
const avgDepthLabel = document.getElementById("avgDepth");

// 4. Load Species Dropdown
async function loadSpecies() {
  try {
    const response = await fetch(`${API_BASE}/api/sightings/species`);
    const rawData = await response.json();

    const speciesList = Array.isArray(rawData)
      ? rawData
      : rawData.data || rawData.species || [];

    speciesSelect.innerHTML = '<option value="">All Species</option>';
    speciesList.forEach((item) => {
      const name = typeof item === "string" ? item : item.species || item.name;
      if (name) {
        const opt = document.createElement("option");
        opt.value = name;
        opt.innerHTML = name;
        speciesSelect.appendChild(opt);
      }
    });
  } catch (err) {
    console.error("Dropdown error:", err);
  }
}

// 5. Fetch Sightings using Radius Slider & Species Filter
async function fetchSightings() {
  const center = map.getCenter();
  const species = speciesSelect.value;
  const radiusMeters = radiusSlider.value * 1000;

  let url = `${API_BASE}/api/sightings/radius?lat=${center.lat}&lon=${center.lng}&radius=${radiusMeters}`;

  if (species) {
    url += `&species=${encodeURIComponent(species)}`;
  }

  try {
    console.log("Fetching:", url);
    const response = await fetch(url);
    const data = await response.json();

    if (data && data.features) {
      updateLayers(data);
      calculateStats(data.features);
    } else {
      clearMap();
    }
  } catch (error) {
    console.error("Fetch Error:", error);
  }
}

// 6. Update Map Visuals
function updateLayers(geojsonData) {
  heatLayerGroup.clearLayers();
  markerLayerGroup.clearLayers();

  const heatPoints = [];

  geojsonData.features.forEach((feature) => {
    const [lon, lat] = feature.geometry.coordinates;
    const props = feature.properties;

    heatPoints.push([lat, lon, 0.8]);

    const marker = L.circleMarker([lat, lon], {
      radius: 6,
      fillColor: "#00f2ff",
      color: "#fff",
      weight: 1,
      fillOpacity: 0.8,
    }).bindPopup(`
      <div style="color: #333;">
        <strong>${props.species || "Unknown"}</strong><br>
        <b>Depth:</b> ${props.depth_m || "N/A"}m<br>
        <b>Temp:</b> ${props.temp_c ? props.temp_c.toFixed(1) : "N/A"}°C
      </div>
    `);

    markerLayerGroup.addLayer(marker);
  });

  if (heatPoints.length > 0) {
    const heat = L.heatLayer(heatPoints, {
      radius: 45,
      blur: 25,
      max: 1.0,
      gradient: { 0.4: "blue", 0.6: "cyan", 0.8: "lime", 1: "yellow" },
    });
    heatLayerGroup.addLayer(heat);
  }
}

// 7. Calculate Stats
function calculateStats(features) {
  const total = features.length;
  totalCountLabel.innerHTML = `Sightings: ${total}`;

  if (total > 0) {
    const sumDepth = features.reduce(
      (acc, f) => acc + (f.properties.depth_m || 0),
      0
    );
    const avg = (sumDepth / total).toFixed(1);
    avgDepthLabel.innerHTML = `Avg Depth: ${avg}m`;
  } else {
    avgDepthLabel.innerHTML = `Avg Depth: --`;
  }
}

function clearMap() {
  heatLayerGroup.clearLayers();
  markerLayerGroup.clearLayers();
  totalCountLabel.innerHTML = `Sightings: 0`;
  avgDepthLabel.innerHTML = `Avg Depth: --`;
}

// 8. Event Listeners
radiusSlider.addEventListener("input", (e) => {
  radiusLabel.innerHTML = e.target.value;
});

applyBtn.addEventListener("click", fetchSightings);

const overlays = {
  "Heatmap Density": heatLayerGroup,
  "Individual Sightings": markerLayerGroup,
};
L.control.layers(null, overlays, { collapsed: false }).addTo(map);

map.on("moveend", fetchSightings);

// Initial Load
loadSpecies();
fetchSightings();