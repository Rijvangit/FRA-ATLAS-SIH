import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import NavBar from './components/NavBar';
import data from "./data.json";
import MapView from "./MapView";
import OCRUpload from "./components/OCRUpload";
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
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const path = location.pathname.replace(/^\/+/, '');
    if (path === '' || path === 'dashboard') setActiveTab('dashboard');
    else if (path === 'maps') setActiveTab('maps');
    else if (path === 'alerts') setActiveTab('alerts');
    else if (path === 'ocr') setActiveTab('ocr');
  }, [location.pathname]);

  const go = (path) => {
    setActiveTab(path);
    navigate(path === 'dashboard' ? '/' : `/${path}`);
  };
  
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
        <h1 className="text-4xl font-bold gradient-text mb-2">TRINETRA FRA Atlas WebGIS DSS</h1>
        <p className="text-gray-600 text-lg">AI-powered Forest Rights Act monitoring and analytics</p>
        {error && (
          <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 rounded-lg text-yellow-700">
            {error}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <NavBar activeTab={activeTab} onNavigate={go} />

      {/* Tab Content */}
      <Routes>
        <Route path="/" element={
          <div>
            {/* Stats Overview */}
            {analytics && (
              <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl shadow">
                  <h3 className="text-sm font-medium text-gray-500">Total Claims</h3>
                  <p className="text-2xl font-bold text-blue-600">{analytics.totalClaims}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow">
                  <h3 className="text-sm font-medium text-gray-500">Total Area</h3>
                  <p className="text-2xl font-bold text-green-600">{analytics.totalAreaHa?.toFixed(2) || '0'} ha</p>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow">
                  <h3 className="text-sm font-medium text-gray-500">Active Alerts</h3>
                  <p className="text-2xl font-bold text-red-600">{alerts.length}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow">
                  <h3 className="text-sm font-medium text-gray-500">Conflicts</h3>
                  <p className="text-2xl font-bold text-orange-600">{analytics.conflictCount || 0}</p>
                </div>
              </div>
            )}

            {/* Filters */}
            {/* ...filters + charts code kept as is... */}

            {/* Commented out Interactive Map View inside Dashboard */}
            {/*
            <div className="map-container" style={{ height: "500px" }}>
              <h2 className="text-lg font-semibold mb-4 text-gray-800">
                Interactive Map View
              </h2>
              <div style={{ height: "100%", width: "100%" }}>
                <MapView filters={filters} />
              </div>
            </div>
            */}
          </div>
        } />
      </Routes>

      {/* Commented out Maps Tab Content */}
      {/*
      {activeTab === 'maps' && (
        <div className="bg-white p-4 rounded-2xl shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Interactive Map</h2>
          <div style={{ height: "600px" }}>
            <MapView filters={filters} />
          </div>
        </div>
      )}
      */}

      {/* Commented out Alerts Tab Content */}
      {/*
      {activeTab === 'alerts' && (
        <div className="bg-white p-4 rounded-2xl shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Recent Alerts</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="p-2">ID</th>
                  <th className="p-2">State</th>
                  <th className="p-2">Severity</th>
                  <th className="p-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {alerts.slice(0, 25).map((a, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2">{a.id || idx + 1}</td>
                    <td className="p-2">{a.state || a.location || '-'}</td>
                    <td className="p-2">{a.severity || '-'}</td>
                    <td className="p-2">{a.date ? new Date(a.date).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      */}

      {/* Commented out OCR Tab Content */}
      {/*
      {activeTab === 'ocr' && (
        <OCRUpload />
      )}
      */}
    </div>
  );
}
