// Forest Alert System Integration
// This script integrates the forest alert system with the main FRA Atlas backend

class ForestAlertIntegration {
  constructor(apiBaseUrl = 'http://localhost:8080') {
    this.apiBaseUrl = apiBaseUrl;
    this.alerts = [];
    this.isConnected = false;
  }

  // Initialize connection to backend
  async initialize() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/health`);
      if (response.ok) {
        this.isConnected = true;
        console.log('✅ Forest Alert System connected to FRA Atlas backend');
        await this.loadAlerts();
      } else {
        console.warn('⚠️ Backend not available, using local data only');
      }
    } catch (error) {
      console.warn('⚠️ Backend connection failed:', error.message);
    }
  }

  // Load alerts from backend API
  async loadAlerts() {
    if (!this.isConnected) return;

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/alerts?limit=1000`);
      const data = await response.json();
      
      if (data.success) {
        this.alerts = data.alerts;
        console.log(`📊 Loaded ${this.alerts.length} alerts from backend`);
        this.updateLocalStorage();
      }
    } catch (error) {
      console.error('Failed to load alerts from backend:', error);
    }
  }

  // Sync local alerts with backend
  async syncAlerts() {
    if (!this.isConnected) return;

    try {
      // Get local alerts from localStorage
      const localAlerts = this.getLocalAlerts();
      
      // Send new alerts to backend
      for (const alert of localAlerts) {
        if (!alert.synced) {
          await this.sendAlertToBackend(alert);
          alert.synced = true;
        }
      }
      
      this.updateLocalStorage();
      console.log('🔄 Alerts synchronized with backend');
    } catch (error) {
      console.error('Failed to sync alerts:', error);
    }
  }

  // Send alert to backend
  async sendAlertToBackend(alert) {
    if (!this.isConnected) return;

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          state: alert.state,
          lat: alert.lat,
          lon: alert.lon,
          severity: alert.severity,
          cause: alert.cause,
          source: alert.source,
          confidence: alert.confidence,
          notes: alert.notes
        })
      });

      if (response.ok) {
        console.log('✅ Alert sent to backend:', alert.id);
      }
    } catch (error) {
      console.error('Failed to send alert to backend:', error);
    }
  }

  // Get alerts from localStorage
  getLocalAlerts() {
    try {
      const stored = localStorage.getItem('forest_alerts');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get local alerts:', error);
      return [];
    }
  }

  // Update localStorage with current alerts
  updateLocalStorage() {
    try {
      localStorage.setItem('forest_alerts', JSON.stringify(this.alerts));
    } catch (error) {
      console.error('Failed to update localStorage:', error);
    }
  }

  // Get alerts for display (combine backend and local)
  getAllAlerts() {
    const localAlerts = this.getLocalAlerts();
    const backendAlerts = this.alerts || [];
    
    // Merge and deduplicate
    const allAlerts = [...backendAlerts];
    localAlerts.forEach(localAlert => {
      if (!allAlerts.find(alert => alert.id === localAlert.id)) {
        allAlerts.push(localAlert);
      }
    });
    
    return allAlerts;
  }

  // Get alert statistics
  getAlertStats() {
    const allAlerts = this.getAllAlerts();
    
    const stats = {
      total: allAlerts.length,
      bySeverity: {},
      byState: {},
      bySource: {},
      recent: 0
    };

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    allAlerts.forEach(alert => {
      // By severity
      stats.bySeverity[alert.severity] = (stats.bySeverity[alert.severity] || 0) + 1;
      
      // By state
      stats.byState[alert.state] = (stats.byState[alert.state] || 0) + 1;
      
      // By source
      stats.bySource[alert.source] = (stats.bySource[alert.source] || 0) + 1;
      
      // Recent alerts
      const alertDate = new Date(alert.date);
      if (alertDate >= sevenDaysAgo) {
        stats.recent++;
      }
    });

    return stats;
  }

  // Export alerts as GeoJSON
  exportAsGeoJSON() {
    const allAlerts = this.getAllAlerts();
    
    const geojson = {
      type: "FeatureCollection",
      features: allAlerts.map(alert => ({
        type: "Feature",
        properties: {
          id: alert.id,
          state: alert.state,
          severity: alert.severity,
          date: alert.date,
          cause: alert.cause,
          source: alert.source,
          confidence: alert.confidence,
          notes: alert.notes
        },
        geometry: {
          type: "Point",
          coordinates: [alert.lon, alert.lat]
        }
      }))
    };

    return geojson;
  }
}

// Initialize integration when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  window.forestAlertIntegration = new ForestAlertIntegration();
  await window.forestAlertIntegration.initialize();
  
  // Sync alerts every 5 minutes
  setInterval(() => {
    window.forestAlertIntegration.syncAlerts();
  }, 5 * 60 * 1000);
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ForestAlertIntegration;
}
