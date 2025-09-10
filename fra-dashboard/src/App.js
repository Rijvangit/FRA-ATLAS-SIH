import React, { useState, useEffect } from 'react';
import data from "./data.json";
import MapView from "./MapView";
import apiService from "./services/api";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line
} from "recharts";

export default function App() {
  const [analytics, setAnalytics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    state: 'all',
    year: 'all',
    claimType: 'all'
  });
  
  // Available filter options
  const [filterOptions, setFilterOptions] = useState({
    states: [],
    years: [],
    claimTypes: ['individual', 'community']
  });

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [analyticsData, alertsData] = await Promise.all([
          apiService.getAnalytics(),
          apiService.getAlerts({ limit: 50 })
        ]);
        
        setAnalytics(analyticsData);
        setAlerts(alertsData.alerts || []);
        setError(null);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load data from API. Using sample data.');
        // Fallback to sample data
        setAnalytics({
          totalClaims: 6,
          byStatus: [
            { status: 'approved', count: 3 },
            { status: 'pending', count: 2 },
            { status: 'rejected', count: 1 }
          ]
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Initialize filter options from data
  useEffect(() => {
    const states = [...new Set(data.claims.map(claim => claim.state))].sort();
    const years = [...new Set(data.claims.map(claim => claim.year))].sort((a, b) => b - a);
    
    setFilterOptions({
      states: ['all', ...states],
      years: ['all', ...years],
      claimTypes: ['all', 'individual', 'community']
    });
  }, []);

  // Filter data based on current filters
  const filteredData = data.claims.filter(claim => {
    if (filters.state !== 'all' && claim.state !== filters.state) return false;
    if (filters.year !== 'all' && claim.year !== parseInt(filters.year)) return false;
    if (filters.claimType !== 'all' && claim.type !== filters.claimType) return false;
    return true;
  });

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading FRA Atlas Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 fade-in">
      {/* Header */}
      <div className="mb-6 glass-card p-6 rounded-2xl">
        <h1 className="text-4xl font-bold gradient-text mb-2">FRA Atlas WebGIS DSS</h1>
        <p className="text-gray-600 text-lg">AI-powered Forest Rights Act monitoring and analytics</p>
        {error && (
          <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 rounded-lg text-yellow-700">
            {error}
          </div>
        )}
      </div>

      {/* Stats Overview */}
      {analytics && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="stats-card">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Claims</h3>
            <p className="text-3xl font-bold text-blue-600">{analytics.totalClaims}</p>
          </div>
          <div className="stats-card">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Area</h3>
            <p className="text-3xl font-bold text-green-600">{analytics.totalAreaHa?.toFixed(2) || '0'} ha</p>
          </div>
          <div className="stats-card">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Active Alerts</h3>
            <p className="text-3xl font-bold text-red-600">{alerts.length}</p>
          </div>
          <div className="stats-card">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Conflicts</h3>
            <p className="text-3xl font-bold text-orange-600">{analytics.conflictCount || 0}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filter-section">
        <h2 className="text-xl font-bold mb-4 text-gray-800">
          Filters
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
            <select 
              value={filters.state} 
              onChange={(e) => handleFilterChange('state', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors custom-select"
            >
              {filterOptions.states.map(state => (
                <option key={state} value={state}>
                  {state === 'all' ? 'All States' : state}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <select 
              value={filters.year} 
              onChange={(e) => handleFilterChange('year', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors custom-select"
            >
              {filterOptions.years.map(year => (
                <option key={year} value={year}>
                  {year === 'all' ? 'All Years' : year}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Claim Type</label>
            <select 
              value={filters.claimType} 
              onChange={(e) => handleFilterChange('claimType', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors custom-select"
            >
              {filterOptions.claimTypes.map(type => (
                <option key={type} value={type}>
                  {type === 'all' ? 'All Claim Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {filteredData.length} of {data.claims.length} claims
          </div>
          <button 
            onClick={() => setFilters({ state: 'all', year: 'all', claimType: 'all' })}
            className="btn-primary text-sm"
          >
            Clear Filters
          </button>
        </div>
      </div>

{/* Charts */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
  {/* Bar Chart - State/District wise */}
  <div className="chart-container h-80">
    <h2 className="text-lg font-semibold mb-4 text-gray-800">
      State-wise Approvals
    </h2>
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={filteredData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="state" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb', 
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }} 
        />
        <Bar dataKey="approved" fill="#22c55e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>

  {/* Line Chart - Yearly Trends */}
  <div className="chart-container h-80">
    <h2 className="text-lg font-semibold mb-4 text-gray-800">
      Yearly Trends
    </h2>
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={filteredData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="year" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb', 
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }} 
        />
        <Line type="monotone" dataKey="approved" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }} />
        <Line type="monotone" dataKey="pending" stroke="#eab308" strokeWidth={3} dot={{ fill: '#eab308', strokeWidth: 2, r: 4 }} />
        <Line type="monotone" dataKey="rejected" stroke="#ef4444" strokeWidth={3} dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  </div>

  {/* Pie Chart - Individual vs Community */}
  <div className="chart-container h-80">
    <h2 className="text-lg font-semibold mb-4 text-gray-800">
      Claim Type Distribution
    </h2>
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={[
            {
              name: "Individual",
              value: filteredData.filter((d) => d.type === "individual").length
            },
            {
              name: "Community",
              value: filteredData.filter((d) => d.type === "community").length
            }
          ]}
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          dataKey="value"
        >
          <Cell fill="#3b82f6" />
          <Cell fill="#22c55e" />
        </Pie>
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb', 
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }} 
        />
      </PieChart>
    </ResponsiveContainer>
  </div>
</div>
<div className="map-container" style={{ height: "500px" }}>
  <h2 className="text-lg font-semibold mb-4 text-gray-800">
    Interactive Map View
  </h2>
  <div style={{ height: "100%", width: "100%" }}>
    <MapView filters={filters} />
  </div>
</div>



    </div>
  );
}

