#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

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

// Component configurations
const components = {
  backend: {
    name: 'Backend API',
    path: path.join(__dirname, '..', 'fra-backend-express-complete'),
    command: 'npm',
    args: ['run', 'dev'],
    port: 8080,
    color: colors.blue
  },
  dashboard: {
    name: 'Dashboard',
    path: path.join(__dirname, '..', 'fra-dashboard'),
    command: 'npm',
    args: ['start'],
    port: 3000,
    color: colors.green
  },
  map: {
    name: 'Map Component',
    path: path.join(__dirname, '..', 'TINA', 'fra-map'),
    command: 'npm',
    args: ['run', 'dev'],
    port: 5173,
    color: colors.magenta
  }
};

// Forest alerts server
const alertsServer = {
  name: 'Forest Alerts',
  path: path.join(__dirname, '..', 'forest-alert'),
  command: 'python3',
  args: ['-m', 'http.server', '3001'],
  port: 3001,
  color: colors.red
};

class DevServer {
  constructor() {
    this.processes = new Map();
    this.isShuttingDown = false;
  }

  log(component, message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const color = component.color || colors.reset;
    const prefix = `[${timestamp}] ${color}${component.name}${colors.reset}`;
    
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

  async startComponent(component) {
    return new Promise((resolve, reject) => {
      this.log(component, `Starting ${component.name}...`);
      
      // Check if directory exists
      if (!fs.existsSync(component.path)) {
        this.log(component, `Directory not found: ${component.path}`, 'error');
        reject(new Error(`Directory not found: ${component.path}`));
        return;
      }

      // Check if package.json exists
      const packageJsonPath = path.join(component.path, 'package.json');
      if (!fs.existsSync(packageJsonPath) && component.command === 'npm') {
        this.log(component, `package.json not found in ${component.path}`, 'error');
        reject(new Error(`package.json not found in ${component.path}`));
        return;
      }

      const process = spawn(component.command, component.args, {
        cwd: component.path,
        stdio: 'pipe',
        shell: true
      });

      this.processes.set(component.name, process);

      process.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          this.log(component, output);
        }
      });

      process.stderr.on('data', (data) => {
        const output = data.toString().trim();
        if (!output) return;
        // Python's http.server logs to stderr; don't mark as error for alerts unless it's a real stack/error
        if (component.name === 'Forest Alerts') {
          const isSevere = /Traceback|Error|Exception|CRITICAL/i.test(output);
          this.log(component, output, isSevere ? 'error' : 'info');
          return;
        }
        if (!output.includes('warning')) {
          this.log(component, output, 'error');
        }
      });

      process.on('close', (code) => {
        if (!this.isShuttingDown) {
          this.log(component, `Process exited with code ${code}`, code === 0 ? 'success' : 'error');
        }
        this.processes.delete(component.name);
      });

      process.on('error', (error) => {
        this.log(component, `Failed to start: ${error.message}`, 'error');
        reject(error);
      });

      // Wait a bit for the process to start
      setTimeout(() => {
        this.log(component, `Started successfully on port ${component.port}`, 'success');
        resolve();
      }, 2000);
    });
  }

  async startAll() {
    console.log(`${colors.bright}${colors.cyan}🌲 Starting FRA Atlas WebGIS DSS Development Server${colors.reset}\n`);

    try {
      // Start backend first
      await this.startComponent(components.backend);
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for backend to fully start

      // Start other components in parallel
      await Promise.all([
        this.startComponent(components.dashboard),
        this.startComponent(components.map),
        this.startComponent(alertsServer)
      ]);

      console.log(`\n${colors.bright}${colors.green}🎉 All services started successfully!${colors.reset}`);
      console.log(`\n${colors.bright}Available services:${colors.reset}`);
      console.log(`${colors.blue}• Backend API:${colors.reset} http://localhost:8080`);
      console.log(`${colors.green}• Dashboard:${colors.reset} http://localhost:3000`);
      console.log(`${colors.magenta}• Map Component:${colors.reset} http://localhost:5173`);
      console.log(`${colors.red}• Forest Alerts:${colors.reset} http://localhost:3001`);
      console.log(`${colors.cyan}• Navigation:${colors.reset} file://${path.join(__dirname, '..', 'navigation.html')}`);
      console.log(`\n${colors.yellow}Press Ctrl+C to stop all services${colors.reset}`);

    } catch (error) {
      console.error(`${colors.red}❌ Failed to start services: ${error.message}${colors.reset}`);
      this.shutdown();
      process.exit(1);
    }
  }

  shutdown() {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    console.log(`\n${colors.yellow}🛑 Shutting down all services...${colors.reset}`);

    for (const [name, process] of this.processes) {
      try {
        process.kill('SIGTERM');
        console.log(`${colors.green}✅ Stopped ${name}${colors.reset}`);
      } catch (error) {
        console.log(`${colors.red}❌ Failed to stop ${name}: ${error.message}${colors.reset}`);
      }
    }

    setTimeout(() => {
      console.log(`${colors.green}👋 All services stopped. Goodbye!${colors.reset}`);
      process.exit(0);
    }, 2000);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  const devServer = new DevServer();
  devServer.shutdown();
});

process.on('SIGTERM', () => {
  const devServer = new DevServer();
  devServer.shutdown();
});

// Start the development server
const devServer = new DevServer();
devServer.startAll().catch(console.error);
