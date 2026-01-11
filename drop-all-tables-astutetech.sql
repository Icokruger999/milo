-- ============================================
-- Drop All Tables in astutetech Database
-- ============================================
-- This script will drop all existing tables
-- EF Core migrations will recreate them automatically
-- ============================================

-- Drop all tables with CASCADE to handle foreign key constraints
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Drop all tables in public schema
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        RAISE NOTICE 'Dropped table: %', r.tablename;
    END LOOP;
    
    -- Drop all sequences
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public')
    LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequence_name) || ' CASCADE';
        RAISE NOTICE 'Dropped sequence: %', r.sequence_name;
    END LOOP;
END $$;

-- Verify tables are dropped
SELECT COUNT(*) AS remaining_tables FROM pg_tables WHERE schemaname = 'public';
