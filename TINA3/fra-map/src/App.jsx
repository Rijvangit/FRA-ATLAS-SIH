import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-control-geocoder";
import "leaflet-control-geocoder/dist/Control.Geocoder.css";

function App() {
  useEffect(() => {
    const map = L.map("map").setView([22.5, 78.9], 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    // Helper: status colors
    const getStatusColor = (status) => {
      if (!status) return "blue";
      switch (status.toLowerCase()) {
        case "approved": return "green";
        case "pending": return "yellow";
        case "rejected": return "red";
        default: return "blue";
      }
    };

    // Load MP polygons
    fetch("/Madhya_Pradesh_subdistricts.geojson")
      .then((res) => res.json())
      .then((data) => {
        L.geoJSON(data, {
          style: { color: "blue", weight: 1, fillOpacity: 0.1 },
        }).addTo(map);
      });

    // Load Telangana polygons
    fetch("/Telangana_subdistricts.geojson")
      .then((res) => res.json())
      .then((data) => {
        L.geoJSON(data, {
          style: { color: "blue", weight: 1, fillOpacity: 0.1 },
        }).addTo(map);
      });

    // Load FRA claims with color by status
    fetch("/fra_claims.geojson")
      .then((res) => res.json())
      .then((data) => {
        L.geoJSON(data, {
          style: (feature) => ({
            color: getStatusColor(feature.properties.claim_status),
            fillColor: getStatusColor(feature.properties.claim_status),
            weight: 2,
            fillOpacity: 0.6,
          }),
          onEachFeature: (feature, layer) => {
            layer.bindPopup(
              `<b>${feature.properties.village}</b><br/>
               District: ${feature.properties.district}<br/>
               Status: ${feature.properties.claim_status}`
            );
          },
        }).addTo(map);
      });

    // Reset button
    const resetControl = L.control({ position: "topleft" });
    resetControl.onAdd = () => {
      const btn = L.DomUtil.create("button", "reset-button");
      btn.innerHTML = "Reset";
      btn.style.background = "#fff";
      btn.style.padding = "5px";
      btn.style.cursor = "pointer";
      btn.onclick = () => map.setView([22.5, 78.9], 5);
      return btn;
    };
    resetControl.addTo(map);

    // Search bar with auto zoom
    L.Control.geocoder({
      defaultMarkGeocode: false,
    })
      .on("markgeocode", function (e) {
        const bbox = e.geocode.bbox;
        const poly = L.polygon([
          [bbox.getSouthEast().lat, bbox.getSouthEast().lng],
          [bbox.getNorthEast().lat, bbox.getNorthEast().lng],
          [bbox.getNorthWest().lat, bbox.getNorthWest().lng],
          [bbox.getSouthWest().lat, bbox.getSouthWest().lng],
        ]);
        map.fitBounds(poly.getBounds(), { animate: true, duration: 1.5 });
      })
      .addTo(map);

    return () => map.remove();
  }, []);

  return <div id="map" style={{ height: "100vh", width: "100%" }} />;
}

export default App;
