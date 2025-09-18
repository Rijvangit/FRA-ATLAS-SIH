import React, { useState, useRef } from 'react'
import MapView from './components/MapView'

export default function App() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const mapRef = useRef(null)

  return (
    <div className="app" style={{ display: "flex", height: "100vh" }}>
      <aside 
        className="sidebar" 
        style={{ width: 300, padding: 20, background: "#f9f9f9", boxShadow: "2px 0 5px rgba(0,0,0,0.1)" }}
      >
        <h2>FRA Atlas</h2>
        <p>Interactive Map for FRA Claims</p>

        {/* Search */}
        <input
          style={{ width: "100%", padding: 6, marginBottom: 6 }}
          type="text"
          placeholder="Search village or district"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button
          style={{ width: "100%", padding: 6, marginBottom: 10 }}
          onClick={() => mapRef.current && mapRef.current.handleSearch(searchQuery)}
        >
          Search
        </button>

        {/* Filter by status */}
        <label>Filter by Status:</label>
        <select
          style={{ width: "100%", padding: 6, marginBottom: 6 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All</option>
          <option value="Approved">Approved</option>
          <option value="Pending">Pending</option>
          <option value="Rejected">Rejected</option>
        </select>
        <button
          style={{ width: "100%", padding: 6, marginBottom: 10 }}
          onClick={() => mapRef.current && mapRef.current.handleFilter(statusFilter)}
        >
          Apply Filter
        </button>

        {/* Reset filters */}
        <button
          style={{ width: "100%", padding: 6, background: "#ddd" }}
          onClick={() => {
            setSearchQuery("")
            setStatusFilter("All")
            if (mapRef.current) mapRef.current.handleFilter("All")
          }}
        >
          Reset Filters
        </button>
      </aside>

      <div className="map-area" style={{ flex: 1 }}>
        <MapView ref={mapRef} />
      </div>
    </div>
  )
}
