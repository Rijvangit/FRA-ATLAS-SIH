#!/usr/bin/env node

/**
 * Validation script for FRA Atlas WebGIS DSS
 * Checks for common setup issues and configuration problems
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SetupValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.success = [];
  }

  log(message, type = 'info') {
    const colors = {
      reset: '\x1b[0m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m'
    };

    const prefix = `[${new Date().toISOString()}]`;
    
    switch (type) {
      case 'error':
        console.log(`${prefix} ${colors.red}❌ ${message}${colors.reset}`);
        this.errors.push(message);
        break;
      case 'warning':
        console.log(`${prefix} ${colors.yellow}⚠️  ${message}${colors.reset}`);
        this.warnings.push(message);
        break;
      case 'success':
        console.log(`${prefix} ${colors.green}✅ ${message}${colors.reset}`);
        this.success.push(message);
        break;
      case 'info':
      default:
        console.log(`${prefix} ${colors.blue}ℹ️  ${message}${colors.reset}`);
        break;
    }
  }

  checkFileExists(filePath, description) {
    if (fs.existsSync(filePath)) {
      this.log(`${description} exists`, 'success');
      return true;
    } else {
      this.log(`${description} missing: ${filePath}`, 'error');
      return false;
    }
  }

  checkDirectoryExists(dirPath, description) {
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      this.log(`${description} exists`, 'success');
      return true;
    } else {
      this.log(`${description} missing: ${dirPath}`, 'error');
      return false;
    }
  }

  checkPackageJson(componentPath, componentName) {
    const packageJsonPath = path.join(componentPath, 'package.json');
    
    if (!this.checkFileExists(packageJsonPath, `${componentName} package.json`)) {
      return false;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Check for required dependencies
      const requiredDeps = {
        'fra-backend-express-complete': ['express', 'pg', 'cors', 'helmet', 'morgan'],
        'fra-dashboard': ['react', 'react-dom', 'leaflet', 'react-leaflet', 'recharts'],
        'TINA 2/fra-map': ['react', 'react-dom', 'leaflet', 'react-leaflet']
      };

      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      const missingDeps = [];

      if (requiredDeps[componentName]) {
        requiredDeps[componentName].forEach(dep => {
          if (!deps[dep]) {
            missingDeps.push(dep);
          }
        });
      }

      if (missingDeps.length > 0) {
        this.log(`${componentName} missing dependencies: ${missingDeps.join(', ')}`, 'warning');
      } else {
        this.log(`${componentName} dependencies OK`, 'success');
      }

      return true;
    } catch (error) {
      this.log(`${componentName} package.json invalid: ${error.message}`, 'error');
      return false;
    }
  }

  checkEnvironmentFile() {
    const envPath = path.join(process.cwd(), '.env');
    const envExamplePath = path.join(process.cwd(), 'env.example');
    
    if (this.checkFileExists(envExamplePath, 'Environment example file')) {
      this.log('Environment example file found', 'success');
    }

    if (this.checkFileExists(envPath, 'Environment file')) {
      try {
        const envContent = fs.readFileSync(envPath, 'utf8');
        
        // Check for required environment variables
        // Accept either PORT or BACKEND_PORT for flexibility
        const requiredVars = ['DATABASE_URL'];
        const missingVars = [];

        requiredVars.forEach(varName => {
          if (!envContent.includes(`${varName}=`)) {
            missingVars.push(varName);
          }
        });
        // Special handling for PORT/BACKEND_PORT
        const hasPort = envContent.includes('PORT=') || envContent.includes('BACKEND_PORT=');
        if (!hasPort) {
          missingVars.push('PORT (or BACKEND_PORT)');
        }

        if (missingVars.length > 0) {
          this.log(`Missing environment variables: ${missingVars.join(', ')}`, 'warning');
        } else {
          this.log('Environment variables OK', 'success');
        }

        return true;
      } catch (error) {
        this.log(`Environment file error: ${error.message}`, 'error');
        return false;
      }
    } else {
      this.log('Environment file missing - copy env.example to .env and configure', 'warning');
      return false;
    }
  }

  checkNodeModules(componentPath, componentName) {
    const nodeModulesPath = path.join(componentPath, 'node_modules');
    
    if (fs.existsSync(nodeModulesPath)) {
      this.log(`${componentName} node_modules exists`, 'success');
      return true;
    } else {
      this.log(`${componentName} node_modules missing - run npm install`, 'warning');
      return false;
    }
  }

  checkDatabaseScript() {
    const dbScriptPath = path.join(process.cwd(), 'scripts', 'init-database.sql');
    
    if (this.checkFileExists(dbScriptPath, 'Database initialization script')) {
      try {
        const scriptContent = fs.readFileSync(dbScriptPath, 'utf8');
        
        // Check for required SQL elements
        const requiredElements = [
          'CREATE EXTENSION IF NOT EXISTS postgis',
          'CREATE TABLE IF NOT EXISTS villages',
          'CREATE TABLE IF NOT EXISTS claims',
          'CREATE TABLE IF NOT EXISTS forest_alerts'
        ];

        const missingElements = [];
        requiredElements.forEach(element => {
          if (!scriptContent.includes(element)) {
            missingElements.push(element);
          }
        });

        if (missingElements.length > 0) {
          this.log(`Database script missing elements: ${missingElements.join(', ')}`, 'warning');
        } else {
          this.log('Database script OK', 'success');
        }

        return true;
      } catch (error) {
        this.log(`Database script error: ${error.message}`, 'error');
        return false;
      }
    }
    return false;
  }

  checkTypeScriptConfig() {
    const tsConfigPath = path.join(process.cwd(), 'fra-backend-express-complete', 'tsconfig.json');
    
    if (this.checkFileExists(tsConfigPath, 'TypeScript configuration')) {
      try {
        const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));
        
        // Check for required TypeScript options
        const requiredOptions = ['target', 'module', 'outDir', 'strict'];
        const missingOptions = [];

        requiredOptions.forEach(option => {
          if (!tsConfig.compilerOptions[option]) {
            missingOptions.push(option);
          }
        });

        if (missingOptions.length > 0) {
          this.log(`TypeScript config missing options: ${missingOptions.join(', ')}`, 'warning');
        } else {
          this.log('TypeScript configuration OK', 'success');
        }

        return true;
      } catch (error) {
        this.log(`TypeScript config error: ${error.message}`, 'error');
        return false;
      }
    }
    return false;
  }

  checkPortAvailability() {
    const net = require('net');
    
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(8080, () => {
        server.once('close', () => {
          this.log('Port 8080 available', 'success');
          resolve(true);
        });
        server.close();
      });
      
      server.on('error', () => {
        this.log('Port 8080 already in use', 'warning');
        resolve(false);
      });
    });
  }

  async validateAll() {
    this.log('Starting FRA Atlas WebGIS DSS validation...', 'info');
    this.log('='.repeat(60), 'info');

    // Check project structure
    this.log('Checking project structure...', 'info');
    this.checkDirectoryExists('fra-backend-express-complete', 'Backend directory');
    this.checkDirectoryExists('fra-dashboard', 'Dashboard directory');
    this.checkDirectoryExists('TINA 2/fra-map', 'Map component directory');
    this.checkDirectoryExists('forest-alert', 'Forest alert directory');
    this.checkDirectoryExists('scripts', 'Scripts directory');

    // Check package.json files
    this.log('Checking package.json files...', 'info');
    this.checkPackageJson('fra-backend-express-complete', 'fra-backend-express-complete');
    this.checkPackageJson('fra-dashboard', 'fra-dashboard');
    this.checkPackageJson('TINA 2/fra-map', 'TINA 2/fra-map');

    // Check node_modules
    this.log('Checking dependencies...', 'info');
    this.checkNodeModules('fra-backend-express-complete', 'Backend');
    this.checkNodeModules('fra-dashboard', 'Dashboard');
    this.checkNodeModules('TINA 2/fra-map', 'Map component');

    // Check environment configuration
    this.log('Checking environment configuration...', 'info');
    this.checkEnvironmentFile();

    // Check database script
    this.log('Checking database setup...', 'info');
    this.checkDatabaseScript();

    // Check TypeScript configuration
    this.log('Checking TypeScript configuration...', 'info');
    this.checkTypeScriptConfig();

    // Check port availability
    this.log('Checking port availability...', 'info');
    await this.checkPortAvailability();

    // Check critical files
    this.log('Checking critical files...', 'info');
    this.checkFileExists('fra-backend-express-complete/src/app.ts', 'Backend app.ts');
    this.checkFileExists('fra-backend-express-complete/src/db/pool.ts', 'Database pool');
    this.checkFileExists('fra-dashboard/src/App.js', 'Dashboard App.js');
    this.checkFileExists('TINA 2/fra-map/src/App.jsx', 'Map App.jsx');
    this.checkFileExists('package.json', 'Root package.json');

    // Summary
    this.log('='.repeat(60), 'info');
    this.log('Validation Summary:', 'info');
    this.log(`✅ Success: ${this.success.length}`, 'success');
    this.log(`⚠️  Warnings: ${this.warnings.length}`, 'warning');
    this.log(`❌ Errors: ${this.errors.length}`, 'error');

    if (this.errors.length > 0) {
      this.log('', 'info');
      this.log('Errors that need to be fixed:', 'error');
      this.errors.forEach(error => this.log(`  • ${error}`, 'error'));
    }

    if (this.warnings.length > 0) {
      this.log('', 'info');
      this.log('Warnings to consider:', 'warning');
      this.warnings.forEach(warning => this.log(`  • ${warning}`, 'warning'));
    }

    if (this.errors.length === 0) {
      this.log('', 'info');
      this.log('🎉 Setup validation passed! Your system is ready to run.', 'success');
      this.log('Run "npm run dev" to start all services.', 'info');
    } else {
      this.log('', 'info');
      this.log('❌ Setup validation failed. Please fix the errors above.', 'error');
    }

    return this.errors.length === 0;
  }
}

// Run validation
const validator = new SetupValidator();
validator.validateAll()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
