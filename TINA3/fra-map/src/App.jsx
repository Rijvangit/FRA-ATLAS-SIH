import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-control-geocoder";
import "leaflet-control-geocoder/dist/Control.Geocoder.css";
import { motion } from "framer-motion";

function FRAAtlas() {
  useEffect(() => {
    const map = L.map("map").setView([22.5, 78.9], 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    const getStatusColor = (status) => {
      if (!status) return "blue";
      switch (status.toLowerCase()) {
        case "approved": return "green";
        case "pending": return "yellow";
        case "rejected": return "red";
        default: return "blue";
      }
    };

    // Load polygons and claims
    const loadGeoJSON = (url, style = {}) =>
      fetch(url)
        .then(res => res.json())
        .then(data => L.geoJSON(data, style).addTo(map));

    loadGeoJSON("/Madhya_Pradesh_subdistricts.geojson", { style: { color: "blue", weight: 1, fillOpacity: 0.1 } });
    loadGeoJSON("/Telangana_subdistricts.geojson", { style: { color: "blue", weight: 1, fillOpacity: 0.1 } });

    fetch("/fra_claims.geojson")
      .then(res => res.json())
      .then(data => {
        L.geoJSON(data, {
          style: feature => ({
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

    // Geocoder search
    L.Control.geocoder({ defaultMarkGeocode: false })
      .on("markgeocode", e => {
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

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
      background: 'url("/forest-texture.jpg") center/cover no-repeat',
    }}>
      {/* Floating Blobs */}
      <motion.div
        className="absolute top-10 left-10 w-60 h-60 rounded-full z-0"
        style={{
          background: 'linear-gradient(135deg, #a0e9ff, #4facfe)',
          filter: 'blur(80px)',
        }}
        animate={{ y: [0, 50, 0], x: [0, 50, 0] }}
        transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-80 h-80 rounded-full z-0"
        style={{
          background: 'linear-gradient(135deg, #00f2fe, #1e90ff)',
          filter: 'blur(100px)',
        }}
        animate={{ y: [0, -50, 0], x: [0, -50, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse" }}
      />

      {/* Map Card */}
      <div style={{
        width: "95%",
        maxWidth: "1200px",
        height: "80vh",
        backgroundColor: "rgba(255,255,255,0.95)",
        borderRadius: "2rem",
        boxShadow: "0 20px 50px rgba(0,0,0,0.08)",
        overflow: "hidden",
        zIndex: 10,
      }}>
        <div id="map" style={{ height: "100%", width: "100%" }} />
      </div>

      {/* Footer */}
      <footer style={{
        marginTop: '2rem',
        width: '100%',
        textAlign: 'center',
        color: '#333',
        backgroundColor: 'rgba(255,255,255,0.7)',
        padding: '1rem 0',
        borderRadius: '1rem',
        zIndex: 10,
      }}>
        <p>© {new Date().getFullYear()} TRINETRA Project. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default FRAAtlas;
