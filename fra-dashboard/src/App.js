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
          <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 rounded-lg text-yellow-700 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}
      </div>

      {/* Stats Overview */}
      {analytics && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Total Claims</h3>
                <p className="text-3xl font-bold text-blue-600">{analytics.totalClaims}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Total Area</h3>
                <p className="text-3xl font-bold text-green-600">{analytics.totalAreaHa?.toFixed(2) || '0'} ha</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Active Alerts</h3>
                <p className="text-3xl font-bold text-red-600">{alerts.length}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Conflicts</h3>
                <p className="text-3xl font-bold text-orange-600">{analytics.conflictCount || 0}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filter-section">
        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
          </svg>
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
          <div className="text-sm text-gray-600 flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
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
    <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
      <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
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
    <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
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
    <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
      <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
      </svg>
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
  <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
    <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
    Interactive Map View
  </h2>
  <div style={{ height: "100%", width: "100%" }}>
    <MapView filters={filters} />
  </div>
</div>



    </div>
  );
}

