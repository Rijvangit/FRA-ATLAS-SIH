// API service for FRA Atlas WebGIS DSS
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

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

  // Analytics API
  async getAnalytics() {
    return this.request('/api/analytics');
  }

  // Alerts API
  async getAlerts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/api/alerts?${queryString}` : '/api/alerts';
    return this.request(endpoint);
  }

  async getAlertStats() {
    return this.request('/api/alerts/stats');
  }

  async getAlertsGeoJSON(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/api/alerts/geojson?${queryString}` : '/api/alerts/geojson';
    return this.request(endpoint);
  }

  async createAlert(alertData) {
    return this.request('/api/alerts', {
      method: 'POST',
      body: JSON.stringify(alertData),
    });
  }

  // Health check
  async getHealth() {
    return this.request('/api/health');
  }

  // Get API info
  async getApiInfo() {
    return this.request('/');
  }

  // OCR API
  async processOCR(data) {
    return this.request('/api/ocr/save', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async processFRADocument(data) {
    return this.request('/api/ocr/process-fra-document', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getOCRResults(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/api/ocr/results?${queryString}` : '/api/ocr/results';
    return this.request(endpoint);
  }

  async getOCRResult(id) {
    return this.request(`/api/ocr/results/${id}`);
  }

  // Enhanced OCR API methods
  async processImage(formData) {
    return this.request('/api/ocr/process-image', {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type, let browser set it with boundary
      }
    });
  }

  async processFRAImage(formData) {
    return this.request('/api/ocr/process-fra-image', {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type, let browser set it with boundary
      }
    });
  }

  async getOCRHealth() {
    return this.request('/api/ocr/health');
  }

  // Handwritten document processing
  async processHandwritten(formData) {
    return this.request('/api/ocr/process-handwritten', {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type, let browser set it with boundary
      }
    });
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;
