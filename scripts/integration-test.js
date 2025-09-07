#!/usr/bin/env node

const http = require('http');
const https = require('https');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class IntegrationTester {
  constructor() {
    this.baseUrl = 'http://localhost:8080';
    this.results = [];
    this.testData = {
      claim: {
        claimant_name: 'Integration Test User',
        village_id: 1,
        geom: {
          type: 'Polygon',
          coordinates: [[[80.0, 22.8], [80.1, 22.8], [80.1, 22.9], [80.0, 22.9], [80.0, 22.8]]]
        }
      },
      alert: {
        state: 'Test State',
        lat: 22.9734,
        lon: 78.6569,
        severity: 'Low',
        cause: 'Integration test',
        source: 'Test source',
        confidence: 85,
        notes: 'This is a test alert created during integration testing'
      }
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}]`;
    
    switch (type) {
      case 'error':
        console.log(`${prefix} ${colors.red}❌ ${message}${colors.reset}`);
        break;
      case 'success':
        console.log(`${prefix} ${colors.green}✅ ${message}${colors.reset}`);
        break;
      case 'warning':
        console.log(`${prefix} ${colors.yellow}⚠️  ${message}${colors.reset}`);
        break;
      case 'test':
        console.log(`${prefix} ${colors.cyan}🧪 ${message}${colors.reset}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }

  async makeRequest(method, endpoint, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.baseUrl);
      const options = {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const jsonData = responseData ? JSON.parse(responseData) : {};
            resolve({
              status: res.statusCode,
              data: jsonData,
              headers: res.headers
            });
          } catch (error) {
            resolve({
              status: res.statusCode,
              data: responseData,
              headers: res.headers
            });
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  async testHealthCheck() {
    this.log('Testing health check endpoint...', 'test');
    
    try {
      const response = await this.makeRequest('GET', '/api/health');
      
      if (response.status === 200 && response.data.status === 'healthy') {
        this.log('Health check passed', 'success');
        return { test: 'Health Check', passed: true };
      } else {
        this.log(`Health check failed: ${response.status}`, 'error');
        return { test: 'Health Check', passed: false, error: `Status: ${response.status}` };
      }
    } catch (error) {
      this.log(`Health check error: ${error.message}`, 'error');
      return { test: 'Health Check', passed: false, error: error.message };
    }
  }

  async testClaimsAPI() {
    this.log('Testing claims API...', 'test');
    const results = [];

    try {
      // Test GET /api/claims
      const getResponse = await this.makeRequest('GET', '/api/claims');
      if (getResponse.status === 200 && getResponse.data.success) {
        this.log('GET /api/claims passed', 'success');
        results.push({ test: 'GET Claims', passed: true });
      } else {
        this.log(`GET /api/claims failed: ${getResponse.status}`, 'error');
        results.push({ test: 'GET Claims', passed: false, error: `Status: ${getResponse.status}` });
      }

      // Test POST /api/claims
      const postResponse = await this.makeRequest('POST', '/api/claims', this.testData.claim);
      if (postResponse.status === 201) {
        this.log('POST /api/claims passed', 'success');
        results.push({ test: 'POST Claims', passed: true });
        
        // Store created claim ID for cleanup
        if (postResponse.data.id) {
          this.createdClaimId = postResponse.data.id;
        }
      } else {
        this.log(`POST /api/claims failed: ${postResponse.status}`, 'error');
        results.push({ test: 'POST Claims', passed: false, error: `Status: ${postResponse.status}` });
      }

    } catch (error) {
      this.log(`Claims API error: ${error.message}`, 'error');
      results.push({ test: 'Claims API', passed: false, error: error.message });
    }

    return results;
  }

  async testAlertsAPI() {
    this.log('Testing alerts API...', 'test');
    const results = [];

    try {
      // Test GET /api/alerts
      const getResponse = await this.makeRequest('GET', '/api/alerts');
      if (getResponse.status === 200 && getResponse.data.success) {
        this.log('GET /api/alerts passed', 'success');
        results.push({ test: 'GET Alerts', passed: true });
      } else {
        this.log(`GET /api/alerts failed: ${getResponse.status}`, 'error');
        results.push({ test: 'GET Alerts', passed: false, error: `Status: ${getResponse.status}` });
      }

      // Test POST /api/alerts
      const postResponse = await this.makeRequest('POST', '/api/alerts', this.testData.alert);
      if (postResponse.status === 201) {
        this.log('POST /api/alerts passed', 'success');
        results.push({ test: 'POST Alerts', passed: true });
        
        // Store created alert ID for cleanup
        if (postResponse.data.alert && postResponse.data.alert.id) {
          this.createdAlertId = postResponse.data.alert.id;
        }
      } else {
        this.log(`POST /api/alerts failed: ${postResponse.status}`, 'error');
        results.push({ test: 'POST Alerts', passed: false, error: `Status: ${postResponse.status}` });
      }

      // Test GET /api/alerts/stats
      const statsResponse = await this.makeRequest('GET', '/api/alerts/stats');
      if (statsResponse.status === 200 && statsResponse.data.success) {
        this.log('GET /api/alerts/stats passed', 'success');
        results.push({ test: 'GET Alert Stats', passed: true });
      } else {
        this.log(`GET /api/alerts/stats failed: ${statsResponse.status}`, 'error');
        results.push({ test: 'GET Alert Stats', passed: false, error: `Status: ${statsResponse.status}` });
      }

      // Test GET /api/alerts/geojson
      const geojsonResponse = await this.makeRequest('GET', '/api/alerts/geojson');
      if (geojsonResponse.status === 200 && geojsonResponse.data.type === 'FeatureCollection') {
        this.log('GET /api/alerts/geojson passed', 'success');
        results.push({ test: 'GET Alerts GeoJSON', passed: true });
      } else {
        this.log(`GET /api/alerts/geojson failed: ${geojsonResponse.status}`, 'error');
        results.push({ test: 'GET Alerts GeoJSON', passed: false, error: `Status: ${geojsonResponse.status}` });
      }

    } catch (error) {
      this.log(`Alerts API error: ${error.message}`, 'error');
      results.push({ test: 'Alerts API', passed: false, error: error.message });
    }

    return results;
  }

  async testAnalyticsAPI() {
    this.log('Testing analytics API...', 'test');
    
    try {
      const response = await this.makeRequest('GET', '/api/analytics');
      
      if (response.status === 200 && response.data.totalClaims !== undefined) {
        this.log('Analytics API passed', 'success');
        return { test: 'Analytics API', passed: true };
      } else {
        this.log(`Analytics API failed: ${response.status}`, 'error');
        return { test: 'Analytics API', passed: false, error: `Status: ${response.status}` };
      }
    } catch (error) {
      this.log(`Analytics API error: ${error.message}`, 'error');
      return { test: 'Analytics API', passed: false, error: error.message };
    }
  }

  async testFrontendComponents() {
    this.log('Testing frontend components...', 'test');
    const results = [];

    const frontendUrls = [
      { name: 'Dashboard', url: 'http://localhost:3000' },
      { name: 'Map Component', url: 'http://localhost:5173' },
      { name: 'Forest Alerts', url: 'http://localhost:3001' }
    ];

    for (const component of frontendUrls) {
      try {
        const response = await this.makeRequest('GET', component.url);
        if (response.status === 200) {
          this.log(`${component.name} is accessible`, 'success');
          results.push({ test: component.name, passed: true });
        } else {
          this.log(`${component.name} failed: ${response.status}`, 'error');
          results.push({ test: component.name, passed: false, error: `Status: ${response.status}` });
        }
      } catch (error) {
        this.log(`${component.name} error: ${error.message}`, 'error');
        results.push({ test: component.name, passed: false, error: error.message });
      }
    }

    return results;
  }

  async runAllTests() {
    console.log(`${colors.bright}${colors.cyan}🧪 FRA Atlas WebGIS DSS - Integration Tests${colors.reset}\n`);

    const startTime = Date.now();

    // Run all tests
    const healthResult = await this.testHealthCheck();
    const claimsResults = await this.testClaimsAPI();
    const alertsResults = await this.testAlertsAPI();
    const analyticsResult = await this.testAnalyticsAPI();
    const frontendResults = await this.testFrontendComponents();

    // Collect all results
    this.results = [
      healthResult,
      ...claimsResults,
      ...alertsResults,
      analyticsResult,
      ...frontendResults
    ];

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Print summary
    this.printSummary(duration);

    // Cleanup test data
    await this.cleanupTestData();

    return this.results;
  }

  printSummary(duration) {
    console.log(`\n${colors.bright}📊 Integration Test Summary${colors.reset}`);

    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = this.results.filter(r => !r.passed).length;

    console.log(`${colors.green}✅ Passed: ${passedTests}${colors.reset}`);
    console.log(`${colors.red}❌ Failed: ${failedTests}${colors.reset}`);
    console.log(`${colors.blue}⏱️  Duration: ${duration}s${colors.reset}`);

    if (failedTests > 0) {
      console.log(`\n${colors.yellow}⚠️  Failed Tests:${colors.reset}`);
      this.results
        .filter(r => !r.passed)
        .forEach(result => {
          console.log(`${colors.red}• ${result.test}: ${result.error}${colors.reset}`);
        });
    }

    if (failedTests === 0) {
      console.log(`\n${colors.bright}${colors.green}🎉 All integration tests passed!${colors.reset}`);
      console.log(`\n${colors.cyan}System is ready for use:${colors.reset}`);
      console.log(`${colors.blue}• Backend API:${colors.reset} http://localhost:8080`);
      console.log(`${colors.green}• Dashboard:${colors.reset} http://localhost:3000`);
      console.log(`${colors.magenta}• Map Component:${colors.reset} http://localhost:5173`);
      console.log(`${colors.red}• Forest Alerts:${colors.reset} http://localhost:3001`);
      console.log(`${colors.cyan}• Navigation:${colors.reset} file://${require('path').join(__dirname, '..', 'navigation.html')}`);
    } else {
      console.log(`\n${colors.red}❌ Some tests failed. Please check the system configuration.${colors.reset}`);
    }
  }

  async cleanupTestData() {
    this.log('Cleaning up test data...', 'test');
    
    // Note: In a real implementation, you would delete the test data
    // For now, we'll just log what would be cleaned up
    if (this.createdClaimId) {
      this.log(`Would delete test claim: ${this.createdClaimId}`, 'warning');
    }
    
    if (this.createdAlertId) {
      this.log(`Would delete test alert: ${this.createdAlertId}`, 'warning');
    }
  }
}

// Run integration tests
const tester = new IntegrationTester();
tester.runAllTests()
  .then(results => {
    const failedTests = results.filter(r => !r.passed).length;
    process.exit(failedTests > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error(`${colors.red}❌ Integration test failed: ${error.message}${colors.reset}`);
    process.exit(1);
  });
