-- FRA Atlas WebGIS DSS - Database Initialization Script
-- Run this script in your Supabase SQL editor to set up the database schema

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create enum types (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'claim_status') THEN
        CREATE TYPE claim_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_severity') THEN
        CREATE TYPE alert_severity AS ENUM ('Low', 'Medium', 'High');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_source') THEN
        CREATE TYPE alert_source AS ENUM ('IoT sensor', 'MODIS', 'VIIRS', 'Drone', 'Citizen report');
    END IF;
END$$;

-- Create villages table
CREATE TABLE IF NOT EXISTS villages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  district TEXT,
  state TEXT,
  region TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Ensure expected columns exist on villages
ALTER TABLE villages ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE villages ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE villages ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE villages ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE villages ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE villages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create claims table
CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  village_id INTEGER REFERENCES villages(id),
  claimant_name TEXT NOT NULL,
  status claim_status DEFAULT 'pending',
  geom GEOMETRY(POLYGON, 4326),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Ensure expected columns exist on claims
ALTER TABLE claims ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE claims ADD COLUMN IF NOT EXISTS village_id INTEGER;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS claimant_name TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS status claim_status DEFAULT 'pending';
ALTER TABLE claims ADD COLUMN IF NOT EXISTS geom GEOMETRY(POLYGON, 4326);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE claims ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create forests table (optional - for protected areas)
CREATE TABLE IF NOT EXISTS forests (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  geom GEOMETRY(POLYGON, 4326),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Ensure expected columns exist on forests
ALTER TABLE forests ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS geom GEOMETRY(POLYGON, 4326);
ALTER TABLE forests ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create forest_alerts table
CREATE TABLE IF NOT EXISTS forest_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lon DECIMAL(11, 8) NOT NULL,
  severity alert_severity NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cause TEXT NOT NULL,
  source alert_source NOT NULL,
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create spatial indexes for better performance
CREATE INDEX IF NOT EXISTS idx_claims_geom ON claims USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_forests_geom ON forests USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_alerts_location ON forest_alerts USING GIST (ST_Point(lon, lat));

-- Create other useful indexes
CREATE INDEX IF NOT EXISTS idx_claims_village_id ON claims (village_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims (status);
CREATE INDEX IF NOT EXISTS idx_alerts_state ON forest_alerts (state);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON forest_alerts (severity);
CREATE INDEX IF NOT EXISTS idx_alerts_date ON forest_alerts (date);

-- Insert sample villages data
INSERT INTO villages (name, district, state, region) VALUES
('Demo Village A', 'Mandla', 'Madhya Pradesh', 'Central'),
('Demo Village B', 'Khammam', 'Telangana', 'South'),
('Sample Village C', 'Cuttack', 'Odisha', 'East'),
('Test Village D', 'Agartala', 'Tripura', 'Northeast')
ON CONFLICT DO NOTHING;

-- Insert sample forest data (optional)
INSERT INTO forests (name, type, geom) VALUES
('Sample Forest Reserve', 'Protected', ST_GeomFromText('POLYGON((80.0 22.8, 80.2 22.8, 80.2 23.0, 80.0 23.0, 80.0 22.8))', 4326))
ON CONFLICT DO NOTHING;

-- Insert sample claims data (ensure closed rings)
INSERT INTO claims (claimant_name, village_id, status, geom) VALUES
('John Doe', 1, 'approved', ST_GeomFromText('POLYGON((80.0 22.8, 80.1 22.8, 80.1 22.9, 80.0 22.9, 80.0 22.8))', 4326)),
('Jane Smith', 2, 'pending', ST_GeomFromText('POLYGON((80.3 17.2, 80.4 17.2, 80.4 17.3, 80.3 17.3, 80.3 17.2))', 4326)),
('Bob Johnson', 1, 'rejected', ST_GeomFromText('POLYGON((80.2 22.7, 80.3 22.7, 80.3 22.8, 80.2 22.8, 80.2 22.7))', 4326))
ON CONFLICT DO NOTHING;

-- Insert sample forest alerts data
INSERT INTO forest_alerts (state, lat, lon, severity, cause, source, confidence, notes) VALUES
('Telangana', 18.16588, 77.12005, 'Low', 'Burn scar', 'IoT sensor', 65, 'Within known dry zone.'),
('Madhya Pradesh', 22.9734, 78.6569, 'Medium', 'Tree cover loss', 'Drone', 75, 'Nearby settlement reported smoke.'),
('Odisha', 20.9517, 85.0985, 'High', 'Thermal anomaly', 'VIIRS', 85, 'Proximity to protected area boundary.'),
('Tripura', 23.9408, 91.9882, 'Low', 'Lightning strike', 'MODIS', 70, 'Windy conditions forecasted.')
ON CONFLICT DO NOTHING;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Ensure triggers exist (drop if exists then create)
DROP TRIGGER IF EXISTS update_villages_updated_at ON villages;
CREATE TRIGGER update_villages_updated_at BEFORE UPDATE ON villages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_claims_updated_at ON claims;
CREATE TRIGGER update_claims_updated_at BEFORE UPDATE ON claims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a view for claims with village information
CREATE OR REPLACE VIEW claims_with_villages AS
SELECT 
    c.id,
    c.claimant_name,
    c.status,
    c.created_at,
    c.updated_at,
    v.name as village_name,
    v.district,
    v.state,
    v.region,
    ST_AsGeoJSON(c.geom) as geometry
FROM claims c
LEFT JOIN villages v ON c.village_id = v.id;

-- Create a view for alert statistics
CREATE OR REPLACE VIEW alert_statistics AS
SELECT 
    state,
    severity,
    COUNT(*) as count,
    AVG(confidence) as avg_confidence,
    MAX(date) as latest_alert
FROM forest_alerts
GROUP BY state, severity;

-- Display success message
DO $$
BEGIN
    RAISE NOTICE 'FRA Atlas WebGIS DSS database schema initialized successfully!';
    RAISE NOTICE 'Tables created: villages, claims, forests, forest_alerts';
    RAISE NOTICE 'Indexes created for optimal spatial query performance';
    RAISE NOTICE 'Sample data inserted for testing';
END $$;
