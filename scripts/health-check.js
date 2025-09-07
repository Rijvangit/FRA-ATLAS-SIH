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

// Service configurations
const services = [
  {
    name: 'Backend API',
    url: 'http://localhost:8080/api/health',
    color: colors.blue,
    expected: { status: 'healthy' }
  },
  {
    name: 'Dashboard',
    url: 'http://localhost:3000',
    color: colors.green,
    expected: { status: 200 }
  },
  {
    name: 'Map Component',
    url: 'http://localhost:5173',
    color: colors.magenta,
    expected: { status: 200 }
  },
  {
    name: 'Forest Alerts',
    url: 'http://localhost:3001',
    color: colors.red,
    expected: { status: 200 }
  }
];

class HealthChecker {
  constructor() {
    this.results = [];
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
      default:
        console.log(`${prefix} ${message}`);
    }
  }

  async checkService(service) {
    return new Promise((resolve) => {
      const url = new URL(service.url);
      const client = url.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'GET',
        timeout: 5000
      };

      const req = client.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const result = {
            service: service.name,
            status: res.statusCode,
            responseTime: Date.now() - startTime,
            healthy: false,
            data: null
          };

          try {
            if (service.url.includes('/api/health')) {
              const jsonData = JSON.parse(data);
              result.data = jsonData;
              result.healthy = jsonData.status === 'healthy';
            } else {
              result.healthy = res.statusCode === 200;
            }
          } catch (error) {
            result.healthy = res.statusCode === 200;
          }

          this.results.push(result);
          resolve(result);
        });
      });

      const startTime = Date.now();

      req.on('error', (error) => {
        const result = {
          service: service.name,
          status: 'error',
          responseTime: Date.now() - startTime,
          healthy: false,
          error: error.message
        };
        
        this.results.push(result);
        resolve(result);
      });

      req.on('timeout', () => {
        req.destroy();
        const result = {
          service: service.name,
          status: 'timeout',
          responseTime: 5000,
          healthy: false,
          error: 'Request timeout'
        };
        
        this.results.push(result);
        resolve(result);
      });

      req.end();
    });
  }

  async checkAll() {
    console.log(`${colors.bright}${colors.cyan}🏥 FRA Atlas WebGIS DSS - Health Check${colors.reset}\n`);

    const startTime = Date.now();

    // Check all services in parallel
    const promises = services.map(service => this.checkService(service));
    await Promise.all(promises);

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Display results
    console.log(`${colors.bright}📊 Health Check Results${colors.reset}\n`);

    let healthyCount = 0;
    let unhealthyCount = 0;

    for (const result of this.results) {
      const service = services.find(s => s.name === result.service);
      const color = service.color;
      
      if (result.healthy) {
        this.log(`${color}${result.service}${colors.reset} - ${colors.green}HEALTHY${colors.reset} (${result.responseTime}ms)`, 'success');
        healthyCount++;
      } else {
        this.log(`${color}${result.service}${colors.reset} - ${colors.red}UNHEALTHY${colors.reset} (${result.error || result.status})`, 'error');
        unhealthyCount++;
      }
    }

    // Summary
    console.log(`\n${colors.bright}📈 Summary${colors.reset}`);
    console.log(`${colors.green}✅ Healthy services: ${healthyCount}${colors.reset}`);
    console.log(`${colors.red}❌ Unhealthy services: ${unhealthyCount}${colors.reset}`);
    console.log(`${colors.blue}⏱️  Total check time: ${totalTime}ms${colors.reset}`);

    // Detailed information for unhealthy services
    if (unhealthyCount > 0) {
      console.log(`\n${colors.yellow}🔍 Troubleshooting Tips:${colors.reset}`);
      
      for (const result of this.results) {
        if (!result.healthy) {
          console.log(`\n${colors.red}${result.service}:${colors.reset}`);
          
          if (result.error) {
            console.log(`  Error: ${result.error}`);
          }
          
          if (result.service === 'Backend API') {
            console.log(`  • Check if backend is running: npm run dev:backend`);
            console.log(`  • Verify database connection in .env file`);
            console.log(`  • Check if port 8080 is available`);
          } else if (result.service === 'Dashboard') {
            console.log(`  • Check if dashboard is running: npm run dev:dashboard`);
            console.log(`  • Verify React app is built and running`);
            console.log(`  • Check if port 3000 is available`);
          } else if (result.service === 'Map Component') {
            console.log(`  • Check if map component is running: npm run dev:map`);
            console.log(`  • Verify Vite dev server is running`);
            console.log(`  • Check if port 5173 is available`);
          } else if (result.service === 'Forest Alerts') {
            console.log(`  • Check if alerts server is running: npm run dev:alerts`);
            console.log(`  • Verify Python HTTP server is running`);
            console.log(`  • Check if port 3001 is available`);
          }
        }
      }
    }

    // Exit with appropriate code
    if (unhealthyCount === 0) {
      console.log(`\n${colors.bright}${colors.green}🎉 All services are healthy!${colors.reset}`);
      process.exit(0);
    } else {
      console.log(`\n${colors.red}❌ Some services are unhealthy. Please check the troubleshooting tips above.${colors.reset}`);
      process.exit(1);
    }
  }
}

// Run health check
const healthChecker = new HealthChecker();
healthChecker.checkAll().catch(console.error);
