#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setupEnvironment() {
  console.log('🌲 FRA Atlas WebGIS DSS - Environment Setup\n');
  
  const envPath = path.join(__dirname, '..', '.env');
  const envExamplePath = path.join(__dirname, '..', 'env.example');
  
  // Check if .env already exists
  if (fs.existsSync(envPath)) {
    const overwrite = await question('⚠️  .env file already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('✅ Setup cancelled. Using existing .env file.');
      rl.close();
      return;
    }
  }
  
  console.log('📝 Please provide the following configuration details:\n');
  
  // Database Configuration
  console.log('🗄️  Database Configuration (Supabase):');
  const databaseUrl = await question('Database URL (postgresql://...): ');
  const supabaseUrl = await question('Supabase URL (https://...): ');
  const supabaseAnonKey = await question('Supabase Anon Key: ');
  const supabaseServiceKey = await question('Supabase Service Role Key: ');
  
  // Backend Configuration
  console.log('\n⚙️  Backend Configuration:');
  const backendPort = await question('Backend Port (8080): ') || '8080';
  const nodeEnv = await question('Node Environment (development): ') || 'development';
  
  // Frontend Configuration
  console.log('\n🖥️  Frontend Configuration:');
  const apiUrl = await question('API URL (http://localhost:8080): ') || 'http://localhost:8080';
  const mapApiUrl = await question('Map API URL (http://localhost:5173): ') || 'http://localhost:5173';
  const alertsUrl = await question('Alerts URL (http://localhost:3000): ') || 'http://localhost:3000';
  
  // AI/ML Configuration
  console.log('\n🤖 AI/ML Configuration:');
  const aiEndpoint = await question('AI Model Endpoint (optional): ');
  const aiApiKey = await question('AI API Key (optional): ');
  
  // Security
  console.log('\n🔒 Security Configuration:');
  const jwtSecret = await question('JWT Secret (generate random): ') || generateRandomSecret();
  
  // Map Configuration
  console.log('\n🗺️  Map Configuration:');
  const mapboxToken = await question('Mapbox Access Token (optional): ');
  
  // Generate .env content
  const envContent = `# FRA Atlas WebGIS DSS - Environment Configuration
# Generated on ${new Date().toISOString()}

# Database Configuration (Supabase)
DATABASE_URL=${databaseUrl}
SUPABASE_URL=${supabaseUrl}
SUPABASE_ANON_KEY=${supabaseAnonKey}
SUPABASE_SERVICE_ROLE_KEY=${supabaseServiceKey}

# Backend Configuration
BACKEND_PORT=${backendPort}
BACKEND_HOST=localhost
NODE_ENV=${nodeEnv}

# Frontend Configuration
REACT_APP_API_URL=${apiUrl}
REACT_APP_MAP_API_URL=${mapApiUrl}
REACT_APP_ALERTS_URL=${alertsUrl}

# AI/ML Configuration
AI_MODEL_ENDPOINT=${aiEndpoint}
AI_API_KEY=${aiApiKey}

# Security
JWT_SECRET=${jwtSecret}
CORS_ORIGIN=${apiUrl},${mapApiUrl}

# Monitoring
LOG_LEVEL=info
ENABLE_ANALYTICS=true

# Map Configuration
MAPBOX_ACCESS_TOKEN=${mapboxToken}
LEAFLET_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png

# File Upload
MAX_FILE_SIZE=10MB
UPLOAD_PATH=./uploads

# Cache Configuration
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600
`;

  // Write .env file
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ Environment configuration saved to .env');
    
    // Copy to backend directory
    const backendEnvPath = path.join(__dirname, '..', 'fra-backend-express-complete', '.env');
    fs.writeFileSync(backendEnvPath, envContent);
    console.log('✅ Environment configuration copied to backend directory');
    
    console.log('\n🚀 Setup complete! You can now run:');
    console.log('   npm run dev     # Start all development servers');
    console.log('   npm run build   # Build for production');
    
  } catch (error) {
    console.error('❌ Error writing .env file:', error.message);
  }
  
  rl.close();
}

function generateRandomSecret() {
  return require('crypto').randomBytes(64).toString('hex');
}

// Run setup
setupEnvironment().catch(console.error);
