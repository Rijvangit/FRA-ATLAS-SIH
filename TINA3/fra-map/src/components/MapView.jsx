

import React, { forwardRef, useState, useImperativeHandle, useEffect } from 'react'
import { MapContainer, TileLayer, GeoJSON, LayersControl, useMap } from 'react-leaflet'
import L from 'leaflet'
import fraClaims from '../data/fraClaims'

const indiaCenter = [22.9734, 78.6569]

const claimStyle = (feature) => {
  const status = feature.properties.status
  let color = "blue"
  if (status === "Approved") color = "green"
  if (status === "Pending") color = "orange"
  if (status === "Rejected") color = "red"
  return { color, weight: 2, fillOpacity: 0.4 }
}

const onEachClaim = (feature, layer) => {
  const { claim_id, village, district, state, status } = feature.properties
  let color = "blue"
  if (status === "Approved") color = "green"
  if (status === "Pending") color = "orange"
  if (status === "Rejected") color = "red"

  layer.bindPopup(`
    <b>Claim ID:</b> ${claim_id}<br/>
    <b>Village:</b> ${village}<br/>
    <b>District:</b> ${district}<br/>
    <b>State:</b> ${state}<br/>
    <b>Status:</b> <span style="color:${color}">${status}</span>
  `)
}

// Legend component
function Legend() {
  const map = useMap()

  useEffect(() => {
    const legend = L.control({ position: "bottomright" })

    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "info legend")
      div.innerHTML = `
        <h4>Claim Status</h4>
        <i style="background: green"></i> Approved<br/>
        <i style="background: orange"></i> Pending<br/>
        <i style="background: red"></i> Rejected<br/>
      `
      div.style.padding = "6px"
      div.style.background = "white"
      div.style.boxShadow = "0 0 5px rgba(0,0,0,0.3)"
      div.style.fontSize = "12px"
      return div
    }

    legend.addTo(map)
    return () => {
      legend.remove()
    }
  }, [map])

  return null
}

// Main MapView
const MapView = forwardRef((props, ref) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("All")
  const [geoData, setGeoData] = useState(fraClaims)

  // Update geoData when filterStatus changes
  useEffect(() => {
    if (filterStatus === "All") {
      setGeoData(fraClaims)
    } else {
      setGeoData({
        ...fraClaims,
        features: fraClaims.features.filter(f => f.properties.status === filterStatus)
      })
    }
  }, [filterStatus])

  useImperativeHandle(ref, () => ({
    handleSearch: (query) => setSearchQuery(query),
    handleFilter: (status) => setFilterStatus(status)
  }))

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
      </LayersControl>

      {/* Legend added here */}
      <Legend />

      {/* Search helper */}
      {searchQuery && <SearchHelper query={searchQuery} geoData={geoData} />}
    </MapContainer>
  )
})

// SearchHelper respects current geoData
function SearchHelper({ query, geoData }) {
  const map = useMap()
  if (query) {
    const feature = geoData.features.find(
      (f) =>
        f.properties.village.toLowerCase() === query.toLowerCase() ||
        f.properties.district.toLowerCase() === query.toLowerCase()
    )
    if (feature) {
      const bounds = L.geoJSON(feature).getBounds()
      map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 })
    } else {
      console.log("No match found:", query)
    }
  }
  return null
}

export default MapView
