import { Pool } from 'pg';
import dotenv from 'dotenv';
import dns from 'node:dns';
dotenv.config();

// Prefer IPv4 to avoid ENETUNREACH issues on some networks
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

// Use fallback database configuration if DATABASE_URL is not set
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/fra_atlas';

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_URL?.includes('supabase')
    ? { rejectUnauthorized: false }
    : undefined,
  // Connection pool optimization for better performance

  max: 20,
  min: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  console.log('⚠️  Database error - OCR will continue to work');
  // Don't exit the process, let OCR work without database
});

// Test the connection on startup
pool.connect()
  .then(client => {
    console.log('✅ Database connected successfully');
    client.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err);
    console.log('⚠️  Continuing without database - OCR will work but data won\'t be saved');
    // Don't exit the process, let OCR work without database
  });

