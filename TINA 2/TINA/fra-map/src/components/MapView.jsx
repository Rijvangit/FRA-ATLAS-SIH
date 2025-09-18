import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, LayersControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import fraClaims from "../data/fraClaims";
import apiService from "../services/api";
import markerIcon2xUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";

// Fix for default markers in react-leaflet (Vite-friendly ESM imports)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2xUrl,
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
});

const indiaCenter = [20.5937, 78.9629];

export default function MapView({ onSearch, onFilter }) {
  const [geoData, setGeoData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load data from API
  useEffect(() => {
    const loadMapData = async () => {
      try {
        setLoading(true);
        const [claimsData, alertsData] = await Promise.all([
          apiService.getClaims(),
          apiService.getAlertsGeoJSON({ limit: 100 })
        ]);
        
        // Convert claims to GeoJSON format
        const claimsGeoJSON = {
          type: "FeatureCollection",
          features: claimsData.claims.map(claim => ({
            type: "Feature",
            properties: {
              id: claim.id,
              claimant_name: claim.claimant_name,
              village_name: claim.village_name,
              status: claim.status,
              created_at: claim.created_at
            },
            geometry: JSON.parse(claim.geometry)
          }))
        };
        
        setGeoData(claimsGeoJSON);
        setAlerts(alertsData.features || []);
        setError(null);
      } catch (err) {
        console.error('Failed to load map data:', err);
        setError('Failed to load data from API. Using sample data.');
        // Fallback to sample data
        setGeoData(fraClaims);
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };

    loadMapData();
  }, []);

  // Style function for claims
  const claimStyle = (feature) => {
    const status = feature.properties.status;
    const colors = {
      approved: "#22c55e", // green
      pending: "#eab308",  // yellow
      rejected: "#ef4444"  // red
    };
    
    return {
      fillColor: colors[status] || "#6b7280",
      weight: 2,
      opacity: 1,
      color: "white",
      dashArray: "3",
      fillOpacity: 0.7
    };
  };

  // Popup content for claims
  const onEachClaim = (feature, layer) => {
    const { claimant_name, village_name, status, created_at } = feature.properties;
    
    layer.bindPopup(`
      <div style="padding: 8px;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">FRA Claim</h3>
        <p style="margin: 4px 0;"><strong>Claimant:</strong> ${claimant_name}</p>
        <p style="margin: 4px 0;"><strong>Village:</strong> ${village_name}</p>
        <p style="margin: 4px 0;"><strong>Status:</strong> 
          <span style="
            padding: 2px 6px; 
            border-radius: 4px; 
            font-size: 12px;
            background-color: ${status === 'approved' ? '#dcfce7' : status === 'pending' ? '#fef3c7' : '#fee2e2'};
            color: ${status === 'approved' ? '#166534' : status === 'pending' ? '#92400e' : '#991b1b'};
          ">
            ${status}
          </span>
        </p>
        <p style="margin: 4px 0; font-size: 12px; color: #6b7280;">
          <strong>Created:</strong> ${new Date(created_at).toLocaleDateString()}
        </p>
      </div>
    `);
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

  if (error) {
    return (
      <div style={{ height: "100%", width: "100%", minHeight: "420px" }} className="flex items-center justify-center">
        <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <MapContainer center={indiaCenter} zoom={5} style={{ height: "100%", width: "100%" }}>
      <LayersControl position="topright">
        {/* Base map */}
        <LayersControl.BaseLayer checked name="OpenStreetMap">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          />
        </LayersControl.BaseLayer>

        {/* FRA Claims */}
        <LayersControl.Overlay checked name="FRA Claims">
          <GeoJSON
            data={geoData}
            style={claimStyle}
            onEachFeature={onEachClaim}
          />
        </LayersControl.Overlay>

        {/* Forest Alerts */}
        <LayersControl.Overlay checked name="Forest Alerts">
          {alerts
            .filter(alert => alert.geometry && alert.geometry.coordinates && alert.properties)
            .map((alert, index) => {
              // GeoJSON point coordinates are [lon, lat]
              const [lon, lat] = alert.geometry.coordinates;
              const { severity, cause, source, confidence, state } = alert.properties;
            
            const color = severity === 'High' ? 'red' : severity === 'Medium' ? 'orange' : 'green'
            
            return (
              <Marker
                key={index}
                position={[lat, lon]}
                icon={L.divIcon({
                  className: 'custom-div-icon',
                  html: `<div style="
                    background-color: ${color};
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    border: 2px solid white;
                    box-shadow: 0 0 0 2px ${color};
                  "></div>`,
                  iconSize: [10, 10],
                  iconAnchor: [5, 5]
                })}
              >
                <Popup>
                  <div style="padding: 8px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">Forest Alert</h3>
                    <p style="margin: 4px 0;"><strong>State:</strong> {state}</p>
                    <p style="margin: 4px 0;"><strong>Severity:</strong> 
                      <span style="
                        padding: 2px 6px; 
                        border-radius: 4px; 
                        font-size: 12px;
                        background-color: ${severity === 'High' ? '#fee2e2' : severity === 'Medium' ? '#fef3c7' : '#dcfce7'};
                        color: ${severity === 'High' ? '#991b1b' : severity === 'Medium' ? '#92400e' : '#166534'};
                      ">
                        {severity}
                      </span>
                    </p>
                    <p style="margin: 4px 0;"><strong>Cause:</strong> {cause}</p>
                    <p style="margin: 4px 0;"><strong>Source:</strong> {source}</p>
                    <p style="margin: 4px 0;"><strong>Confidence:</strong> {confidence}%</p>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </LayersControl.Overlay>
      </LayersControl>

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        backgroundColor: 'white',
        padding: '10px',
        borderRadius: '5px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        zIndex: 1000,
        fontSize: '12px'
      }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>FRA Claims Status</h4>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#22c55e', marginRight: '8px', borderRadius: '2px' }}></div>
          <span>Approved</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#eab308', marginRight: '8px', borderRadius: '2px' }}></div>
          <span>Pending</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#ef4444', marginRight: '8px', borderRadius: '2px' }}></div>
          <span>Rejected</span>
        </div>
        <h4 style={{ margin: '8px 0 4px 0', fontSize: '14px' }}>Forest Alerts</h4>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ width: '10px', height: '10px', backgroundColor: 'red', marginRight: '8px', borderRadius: '50%' }}></div>
          <span>High Severity</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ width: '10px', height: '10px', backgroundColor: 'orange', marginRight: '8px', borderRadius: '50%' }}></div>
          <span>Medium Severity</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '10px', height: '10px', backgroundColor: 'green', marginRight: '8px', borderRadius: '50%' }}></div>
          <span>Low Severity</span>
        </div>
      </div>
    </MapContainer>
  );
}