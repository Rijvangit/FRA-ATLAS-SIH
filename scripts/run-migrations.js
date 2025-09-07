#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
// Load env from project root
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (_) {}
const { Client } = require('pg');

(async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('postgresql://postgres:7AuvNk4d3CA94jho@db.ejtunzuvrzabpelswgtt.supabase.co:5432/postgres');
    process.exit(1);
  }

  const sqlPath = path.join(__dirname, 'init-database.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error(`SQL file not found: ${sqlPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ Database initialized successfully.');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
