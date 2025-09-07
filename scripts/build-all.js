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

// Component configurations for building
const components = [
  {
    name: 'Backend API',
    path: path.join(__dirname, '..', 'fra-backend-express-complete'),
    command: 'npm',
    args: ['run', 'build'],
    color: colors.blue
  },
  {
    name: 'Dashboard',
    path: path.join(__dirname, '..', 'fra-dashboard'),
    command: 'npm',
    args: ['run', 'build'],
    color: colors.green
  },
  {
    name: 'Map Component',
    path: path.join(__dirname, '..', 'TINA', 'fra-map'),
    command: 'npm',
    args: ['run', 'build'],
    color: colors.magenta
  }
];

class BuildManager {
  constructor() {
    this.results = [];
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

  async buildComponent(component) {
    return new Promise((resolve, reject) => {
      this.log(component, `Building ${component.name}...`);
      
      // Check if directory exists
      if (!fs.existsSync(component.path)) {
        const error = `Directory not found: ${component.path}`;
        this.log(component, error, 'error');
        this.results.push({ component: component.name, success: false, error });
        reject(new Error(error));
        return;
      }

      // Check if package.json exists
      const packageJsonPath = path.join(component.path, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        const error = `package.json not found in ${component.path}`;
        this.log(component, error, 'error');
        this.results.push({ component: component.name, success: false, error });
        reject(new Error(error));
        return;
      }

      const process = spawn(component.command, component.args, {
        cwd: component.path,
        stdio: 'pipe',
        shell: true
      });

      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        // Only log important messages
        if (text.includes('error') || text.includes('warning') || text.includes('built')) {
          this.log(component, text.trim());
        }
      });

      process.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        if (text.includes('error')) {
          this.log(component, text.trim(), 'error');
        }
      });

      process.on('close', (code) => {
        if (code === 0) {
          this.log(component, `Build completed successfully`, 'success');
          this.results.push({ component: component.name, success: true });
          resolve();
        } else {
          const error = `Build failed with exit code ${code}`;
          this.log(component, error, 'error');
          this.results.push({ component: component.name, success: false, error, output, errorOutput });
          reject(new Error(error));
        }
      });

      process.on('error', (error) => {
        const errorMsg = `Failed to start build process: ${error.message}`;
        this.log(component, errorMsg, 'error');
        this.results.push({ component: component.name, success: false, error: errorMsg });
        reject(error);
      });
    });
  }

  async buildAll() {
    console.log(`${colors.bright}${colors.cyan}🏗️  Building FRA Atlas WebGIS DSS for Production${colors.reset}\n`);

    const startTime = Date.now();
    let successCount = 0;
    let failureCount = 0;

    for (const component of components) {
      try {
        await this.buildComponent(component);
        successCount++;
      } catch (error) {
        failureCount++;
        // Continue with other components even if one fails
      }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Print summary
    console.log(`\n${colors.bright}${colors.cyan}📊 Build Summary${colors.reset}`);
    console.log(`${colors.green}✅ Successful builds: ${successCount}${colors.reset}`);
    console.log(`${colors.red}❌ Failed builds: ${failureCount}${colors.reset}`);
    console.log(`${colors.blue}⏱️  Total time: ${duration}s${colors.reset}`);

    if (failureCount > 0) {
      console.log(`\n${colors.yellow}⚠️  Failed builds:${colors.reset}`);
      this.results
        .filter(result => !result.success)
        .forEach(result => {
          console.log(`${colors.red}• ${result.component}: ${result.error}${colors.reset}`);
        });
    }

    if (successCount === components.length) {
      console.log(`\n${colors.bright}${colors.green}🎉 All components built successfully!${colors.reset}`);
      console.log(`\n${colors.bright}Production build locations:${colors.reset}`);
      console.log(`${colors.blue}• Backend:${colors.reset} fra-backend-express-complete/dist/`);
      console.log(`${colors.green}• Dashboard:${colors.reset} fra-dashboard/build/`);
      console.log(`${colors.magenta}• Map Component:${colors.reset} TINA/fra-map/dist/`);
      console.log(`${colors.red}• Forest Alerts:${colors.reset} forest-alert/ (static files)`);
      
      console.log(`\n${colors.yellow}To start production server:${colors.reset}`);
      console.log(`${colors.cyan}cd fra-backend-express-complete && npm start${colors.reset}`);
    } else {
      console.log(`\n${colors.red}❌ Build completed with errors. Please check the logs above.${colors.reset}`);
      process.exit(1);
    }
  }

  // Copy static files for production
  async copyStaticFiles() {
    console.log(`\n${colors.cyan}📁 Copying static files...${colors.reset}`);
    
    const staticFiles = [
      {
        src: path.join(__dirname, '..', 'forest-alert'),
        dest: path.join(__dirname, '..', 'dist', 'alerts'),
        name: 'Forest Alerts'
      },
      {
        src: path.join(__dirname, '..', 'navigation.html'),
        dest: path.join(__dirname, '..', 'dist', 'navigation.html'),
        name: 'Navigation'
      }
    ];

    for (const file of staticFiles) {
      try {
        if (fs.existsSync(file.src)) {
          // Create destination directory if it doesn't exist
          const destDir = path.dirname(file.dest);
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
          }

          // Copy file or directory
          if (fs.statSync(file.src).isDirectory()) {
            this.copyDirectory(file.src, file.dest);
          } else {
            fs.copyFileSync(file.src, file.dest);
          }
          
          console.log(`${colors.green}✅ Copied ${file.name}${colors.reset}`);
        } else {
          console.log(`${colors.yellow}⚠️  ${file.name} not found at ${file.src}${colors.reset}`);
        }
      } catch (error) {
        console.log(`${colors.red}❌ Failed to copy ${file.name}: ${error.message}${colors.reset}`);
      }
    }
  }

  copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

// Main execution
async function main() {
  const buildManager = new BuildManager();
  
  try {
    await buildManager.buildAll();
    await buildManager.copyStaticFiles();
  } catch (error) {
    console.error(`${colors.red}❌ Build process failed: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = BuildManager;
