-- ============================================
-- Supabase Database Setup for Milo
-- ============================================
-- This script will:
-- 1. Drop any existing "milo" database (if it exists)
-- 2. Create a new "milo" database
-- 3. Note: EF Core migrations will create all tables automatically
-- ============================================

-- First, terminate any active connections to the milo database
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'milo'
  AND pid <> pg_backend_pid();

-- Drop the milo database if it exists
DROP DATABASE IF EXISTS milo;

-- Create the new milo database
CREATE DATABASE milo
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.utf8'
    LC_CTYPE = 'en_US.utf8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE milo TO postgres;

-- Note: After running this script, update your connection string to:
-- Host=db.xxxxx.supabase.co;Database=milo;Username=postgres;Password=YOUR_PASSWORD;Port=5432;SSL Mode=Require
