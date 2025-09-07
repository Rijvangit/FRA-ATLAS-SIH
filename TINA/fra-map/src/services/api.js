// API service for FRA Map component
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Claims API
  async getClaims() {
    return this.request('/api/claims');
  }

  async createClaim(claimData) {
    return this.request('/api/claims', {
      method: 'POST',
      body: JSON.stringify(claimData),
    });
  }

  // Alerts API
  async getAlerts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/api/alerts?${queryString}` : '/api/alerts';
    return this.request(endpoint);
  }

  async getAlertsGeoJSON(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/api/alerts/geojson?${queryString}` : '/api/alerts/geojson';
    return this.request(endpoint);
  }

  // Health check
  async getHealth() {
    return this.request('/api/health');
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;