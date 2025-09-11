

import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, LayersControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import indiaStates from "./data/india_states.json"; // full India GeoJSON
import apiService from "./services/api";

// ---- Pick exactly 4 states to highlight (others stay grey) ----
const HIGHLIGHT = {
  telangana:        { name: "Telangana",        approved: 750, pending: 200, rejected: 50 },
  maharashtra:      { name: "Maharashtra",      approved: 1200, pending: 400, rejected: 200 },
  karnataka:        { name: "Karnataka",        approved: 600, pending: 250, rejected: 150 },
  "madhya pradesh": { name: "Madhya Pradesh",   approved: 500, pending: 300, rejected: 200 },
};

// --------- helpers ----------
const normalize = (s) =>
  (s ?? "")
    .toString()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const getStateName = (feature) => {
  return (
    feature?.properties?.st_nm ||
    feature?.properties?.ST_NM ||
    feature?.properties?.NAME_1 ||
    feature?.properties?.NAME ||
    feature?.properties?.state ||
    "Unknown"
  );
};

const approvalPct = (d) => {
  if (!d) return null;
  const total = (d.approved ?? 0) + (d.pending ?? 0) + (d.rejected ?? 0);
  if (!total) return 0;
  return Math.round((d.approved / total) * 100);
};

const colorForPct = (p) => {
  if (p == null) return "#e5e7eb";      // neutral grey for "no data"
  if (p >= 70)  return "#22c55e";       // green
  if (p >= 40)  return "#eab308";       // yellow
  return "#ef4444";                     // red
};

// --------- style + tooltip ----------
function styleFeature(feature) {
  const rawName = getStateName(feature);
  const key = normalize(rawName);
  const data = HIGHLIGHT[key]; // only 4 states have data

  // everyone else -> grey map with borders
  if (!data) {
    return {
      fillColor: "#e5e7eb", // light grey
      color: "#9ca3af",     // grey border
      weight: 1,
      fillOpacity: 0.4,
    };
  }

  // highlighted states (colored)
  const pct = approvalPct(data);
  return {
    fillColor: colorForPct(pct),
    color: "#374151", // darker border
    weight: 1.5,
    fillOpacity: 0.8,
  };
}

function onEachFeature(feature, layer) {
  const rawName = getStateName(feature);
  const key = normalize(rawName);
  const data = HIGHLIGHT[key];
  const pct = approvalPct(data);

  if (data) {
    layer.bindTooltip(
      `${rawName}
Approved: ${data.approved}
Pending: ${data.pending}
Rejected: ${data.rejected}
Approval: ${pct}%`,
      { sticky: true }
    );
  } else {
    layer.bindTooltip(`${rawName}: No data`, { sticky: true });
  }

  // subtle hover effect
  layer.on("mouseover", () => {
    layer.setStyle({
      weight: 2,
      fillOpacity: data ? 0.9 : 0.6,
    });
  });
  layer.on("mouseout", () => {
    layer.setStyle(styleFeature(feature));
  });
}

// --------- component ----------
export default function MapView({ filters = { state: 'all', year: 'all', claimType: 'all' } }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMapData = async () => {
      try {
        const [, alertsData] = await Promise.all([
          apiService.getClaims(),
          apiService.getAlertsGeoJSON({ limit: 100 })
        ]);
        
        setAlerts(alertsData.features || []);
      } catch (error) {
        console.error('Failed to load map data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMapData();
  }, []);

  // Create markers for forest alerts
  const createAlertMarkers = () => {
    return alerts
      .filter(alert => alert.geometry && Array.isArray(alert.geometry.coordinates) && alert.properties)
      .map((alert, index) => {
      // GeoJSON Point coordinates are [lon, lat]
      const [lon, lat] = alert.geometry.coordinates;
      const { severity, cause, source, confidence, state } = alert.properties;
      
      const color = severity === 'High' ? 'red' : severity === 'Medium' ? 'orange' : 'green';
      
      return (
        <Marker
          key={index}
          position={[lat, lon]}
          icon={L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="
              background-color: ${color};
              width: 12px;
              height: 12px;
              border-radius: 50%;
              border: 2px solid white;
              box-shadow: 0 0 0 2px ${color};
            "></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          })}
        >
          <Popup>
            <div>
              <h3 className="font-bold">{state}</h3>
              <p><strong>Severity:</strong> {severity}</p>
              <p><strong>Cause:</strong> {cause}</p>
              <p><strong>Source:</strong> {source}</p>
              <p><strong>Confidence:</strong> {confidence}%</p>
            </div>
          </Popup>
        </Marker>
      );
    });
  };

  if (loading) {
    return (
      <div style={{ height: "100%", width: "100%", minHeight: "420px" }} className="flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading map data...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", width: "100%", minHeight: "420px" }}>
      <MapContainer
        center={[22.9734, 78.6569]} // India-ish center
        zoom={5}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="OpenStreetMap">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          
          <LayersControl.Overlay checked name="FRA Claims">
            <GeoJSON data={indiaStates} style={styleFeature} onEachFeature={onEachFeature} />
          </LayersControl.Overlay>
          
          <LayersControl.Overlay checked name="Forest Alerts">
            {createAlertMarkers()}
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>
    </div>
  );
}
