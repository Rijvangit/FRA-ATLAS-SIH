#!/usr/bin/env node

const { execSync } = require("child_process");

function run(cmd, cwd) {
  console.log(`\n🏗️  [${cwd}] -> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd });
}

console.log("🚀 Building FRA Atlas WebGIS DSS for Production...");

// Backend
try {
  run("npm install", "fra-backend-express-complete");
  run("npm run build", "fra-backend-express-complete");
  console.log("✅ Backend built successfully");
} catch (err) {
  console.error("❌ Backend build failed");
  process.exit(1);
}

// Dashboard
try {
  run("npm install", "fra-dashboard");
  run("npm run build", "fra-dashboard");
  console.log("✅ Dashboard built successfully");
} catch (err) {
  console.error("❌ Dashboard build failed");
  process.exit(1);
}

// Map
try {
  run("npm install", "TINA 2/fra-map");
  run("npm run build", "TINA 2/fra-map");
  console.log("✅ Map built successfully");
} catch (err) {
  console.error("❌ Map build failed");
  process.exit(1);
}
