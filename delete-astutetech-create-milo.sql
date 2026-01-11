-- Terminate connections to astutetech database
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'astutetech'
  AND pid <> pg_backend_pid();

-- Drop astutetech database
DROP DATABASE IF EXISTS astutetech;

-- Terminate connections to milo database (if exists)
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'milo'
  AND pid <> pg_backend_pid();

-- Drop milo database if exists
DROP DATABASE IF EXISTS milo;

-- Create new milo database
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
