#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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

class Cleaner {
  constructor() {
    this.cleanedFiles = [];
    this.cleanedDirs = [];
    this.errors = [];
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

  removeFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.cleanedFiles.push(filePath);
        this.log(`Removed file: ${filePath}`, 'success');
        return true;
      }
      return false;
    } catch (error) {
      this.errors.push(`Failed to remove file ${filePath}: ${error.message}`);
      this.log(`Failed to remove file ${filePath}: ${error.message}`, 'error');
      return false;
    }
  }

  removeDirectory(dirPath) {
    try {
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
        this.cleanedDirs.push(dirPath);
        this.log(`Removed directory: ${dirPath}`, 'success');
        return true;
      }
      return false;
    } catch (error) {
      this.errors.push(`Failed to remove directory ${dirPath}: ${error.message}`);
      this.log(`Failed to remove directory ${dirPath}: ${error.message}`, 'error');
      return false;
    }
  }

  cleanComponent(componentName, componentPath) {
    this.log(`Cleaning ${componentName}...`);
    
    const pathsToClean = [
      // Node modules
      path.join(componentPath, 'node_modules'),
      // Build outputs
      path.join(componentPath, 'dist'),
      path.join(componentPath, 'build'),
      // Cache directories
      path.join(componentPath, '.cache'),
      path.join(componentPath, '.vite'),
      path.join(componentPath, '.next'),
      // Log files
      path.join(componentPath, '*.log'),
      path.join(componentPath, 'npm-debug.log*'),
      path.join(componentPath, 'yarn-debug.log*'),
      path.join(componentPath, 'yarn-error.log*'),
      // OS generated files
      path.join(componentPath, '.DS_Store'),
      path.join(componentPath, 'Thumbs.db'),
      // IDE files
      path.join(componentPath, '.vscode'),
      path.join(componentPath, '.idea'),
      // Temporary files
      path.join(componentPath, '*.tmp'),
      path.join(componentPath, '*.temp')
    ];

    for (const cleanPath of pathsToClean) {
      if (cleanPath.includes('*')) {
        // Handle glob patterns
        const dir = path.dirname(cleanPath);
        const pattern = path.basename(cleanPath);
        
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          const matchingFiles = files.filter(file => {
            if (pattern.startsWith('*')) {
              return file.endsWith(pattern.substring(1));
            }
            return false;
          });
          
          matchingFiles.forEach(file => {
            this.removeFile(path.join(dir, file));
          });
        }
      } else {
        // Handle specific paths
        if (fs.existsSync(cleanPath)) {
          const stat = fs.statSync(cleanPath);
          if (stat.isDirectory()) {
            this.removeDirectory(cleanPath);
          } else {
            this.removeFile(cleanPath);
          }
        }
      }
    }
  }

  async cleanAll() {
    console.log(`${colors.bright}${colors.cyan}🧹 FRA Atlas WebGIS DSS - Cleanup${colors.reset}\n`);

    const startTime = Date.now();

    // Components to clean
    const components = [
      {
        name: 'Root',
        path: path.join(__dirname, '..')
      },
      {
        name: 'Backend',
        path: path.join(__dirname, '..', 'fra-backend-express-complete')
      },
      {
        name: 'Dashboard',
        path: path.join(__dirname, '..', 'fra-dashboard')
      },
      {
        name: 'Map Component',
        path: path.join(__dirname, '..', 'TINA', 'fra-map')
      }
    ];

    // Clean each component
    for (const component of components) {
      if (fs.existsSync(component.path)) {
        this.cleanComponent(component.name, component.path);
      } else {
        this.log(`Component path not found: ${component.path}`, 'warning');
      }
    }

    // Clean root level files
    const rootPath = path.join(__dirname, '..');
    const rootFilesToClean = [
      '.env',
      '.env.local',
      '.env.development.local',
      '.env.test.local',
      '.env.production.local',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml'
    ];

    this.log('Cleaning root level files...');
    for (const file of rootFilesToClean) {
      this.removeFile(path.join(rootPath, file));
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Summary
    console.log(`\n${colors.bright}📊 Cleanup Summary${colors.reset}`);
    console.log(`${colors.green}✅ Files removed: ${this.cleanedFiles.length}${colors.reset}`);
    console.log(`${colors.green}✅ Directories removed: ${this.cleanedDirs.length}${colors.reset}`);
    console.log(`${colors.red}❌ Errors: ${this.errors.length}${colors.reset}`);
    console.log(`${colors.blue}⏱️  Total time: ${duration}s${colors.reset}`);

    if (this.errors.length > 0) {
      console.log(`\n${colors.yellow}⚠️  Errors encountered:${colors.reset}`);
      this.errors.forEach(error => {
        console.log(`${colors.red}• ${error}${colors.reset}`);
      });
    }

    if (this.cleanedFiles.length > 0 || this.cleanedDirs.length > 0) {
      console.log(`\n${colors.bright}${colors.green}🎉 Cleanup completed successfully!${colors.reset}`);
      console.log(`\n${colors.yellow}Next steps:${colors.reset}`);
      console.log(`${colors.cyan}• Run 'npm run install:all' to reinstall dependencies${colors.reset}`);
      console.log(`${colors.cyan}• Run 'npm run setup:env' to reconfigure environment${colors.reset}`);
    } else {
      console.log(`\n${colors.yellow}ℹ️  No files or directories were cleaned.${colors.reset}`);
    }

    // Exit with appropriate code
    if (this.errors.length === 0) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  }
}

// Run cleanup
const cleaner = new Cleaner();
cleaner.cleanAll().catch(console.error);
