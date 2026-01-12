# Setting Up Supabase Database

## What We Need

To create the "milo" database in Supabase, I need:

1. **Supabase Project URL**: `https://xxxxx.supabase.co` (found in your Supabase dashboard)
2. **Database Password**: The password for the `postgres` user (found in Settings → Database)
3. **Database Host**: Usually `db.xxxxx.supabase.co` (found in Settings → Database → Connection string)

## Steps to Create "milo" Database

### Option 1: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Run this SQL:

```sql
-- Drop existing milo database if it exists (if migrating from RDS)
-- Note: In Supabase, you typically work with schemas, not separate databases
-- But we can create a separate database if needed

-- First, disconnect any active connections
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'milo'
  AND pid <> pg_backend_pid();

-- Drop database if exists
DROP DATABASE IF EXISTS milo;

-- Create new milo database
CREATE DATABASE milo;
```

4. After creating the database, get the connection string:
   - Go to **Settings → Database**
   - Copy the connection string
   - Replace `Database=postgres` with `Database=milo`

### Option 2: Using psql Command Line

If you have `psql` installed, you can run:

```bash
psql -h db.xxxxx.supabase.co -U postgres -d postgres -c "CREATE DATABASE milo;"
```

## After Database Creation

Once the "milo" database is created, I'll:
1. Update `appsettings.json` with the correct connection string
2. Deploy the backend
3. EF Core migrations will automatically create all tables in the new database

## Important Note

The JWT secret you provided is for **authentication**, not database management. To manage databases, we need:
- Database connection string (with password)
- Or Supabase project URL + API key + database password

Please provide:
1. Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
2. Your database password (from Settings → Database)
