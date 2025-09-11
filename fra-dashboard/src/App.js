import React, { useState, useEffect } from 'react';
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
  const [activeTab, setActiveTab] = useState('dashboard');

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
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="mb-6 bg-white p-4 rounded-2xl shadow">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">FRA Atlas WebGIS DSS</h1>
        <p className="text-gray-600">AI-powered Forest Rights Act monitoring and analytics</p>
        {error && (
          <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 rounded text-yellow-700">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6 bg-white p-4 rounded-2xl shadow">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'dashboard'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('ocr')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'ocr'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Document OCR
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <>
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
      <div className="mb-6 bg-white p-4 rounded-2xl shadow">
        <h2 className="text-xl font-bold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select className="p-2 border rounded">
            <option>All States</option>
          </select>
          <select className="p-2 border rounded">
            <option>2025</option>
          </select>
          <select className="p-2 border rounded">
            <option>All Claim Types</option>
          </select>
        </div>
      </div>

{/* Charts */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
  {/* Bar Chart - State/District wise */}
  <div className="bg-white p-6 rounded-2xl shadow h-80">
    <h2 className="text-lg font-semibold mb-4">State-wise Approvals</h2>
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data.claims}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="state" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="approved" fill="#22c55e" />
      </BarChart>
    </ResponsiveContainer>
  </div>

  {/* Line Chart - Yearly Trends */}
  <div className="bg-white p-6 rounded-2xl shadow h-80">
    <h2 className="text-lg font-semibold mb-4">Yearly Trends</h2>
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data.claims}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="year" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="approved" stroke="#3b82f6" />
        <Line type="monotone" dataKey="pending" stroke="#eab308" />
        <Line type="monotone" dataKey="rejected" stroke="#ef4444" />
      </LineChart>
    </ResponsiveContainer>
  </div>

  {/* Pie Chart - Individual vs Community */}
  <div className="bg-white p-6 rounded-2xl shadow h-80">
    <h2 className="text-lg font-semibold mb-4">Claim Type Distribution</h2>
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={[
            {
              name: "Individual",
              value: data.claims.filter((d) => d.type === "individual").length
            },
            {
              name: "Community",
              value: data.claims.filter((d) => d.type === "community").length
            }
          ]}
          cx="50%"
          cy="50%"
          outerRadius={80}
          label
          dataKey="value"
        >
          <Cell fill="#3b82f6" />
          <Cell fill="#22c55e" />
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  </div>
</div>
<div className="bg-white p-6 rounded-2xl shadow mt-6" style={{ height: "500px" }}>
  <h2 className="text-lg font-semibold mb-4">Map View</h2>
  <div style={{ height: "100%", width: "100%" }}>
    <MapView />
  </div>
</div>
        </>
      )}

      {/* OCR Tab Content */}
      {activeTab === 'ocr' && (
        <OCRUpload />
      )}

    </div>
  );
}

