# Migrating from RDS to Supabase

## Steps to Complete Migration

1. **Create Supabase Project** (if not already done)
   - Go to https://supabase.com
   - Create a new project
   - Note the connection details

2. **Get Supabase Connection String**
   - Go to Project Settings > Database
   - Find "Connection string" section
   - Use "URI" format or build from connection parameters:
     - Host: `db.xxxxx.supabase.co`
     - Database: `postgres` (or your database name)
     - Port: `5432` (or `6543` for connection pooling)
     - Username: `postgres`
     - Password: (your database password)

3. **Update appsettings.json**
   - Replace the connection string with your Supabase details
   - Format: `Host=db.xxxxx.supabase.co;Database=postgres;Username=postgres;Password=YOUR_PASSWORD;Port=5432;SSL Mode=Require;Trust Server Certificate=true`

4. **Export Data from RDS** (if needed)
   - Use `pg_dump` to export your current database
   - Command: `pg_dump -h codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com -U postgres -d MiloDB > milo_backup.sql`

5. **Import Data to Supabase** (if needed)
   - Use Supabase SQL Editor or `psql` to import
   - Or use Supabase dashboard to run SQL scripts

6. **Deploy Updated Configuration**
   - After updating appsettings.json, deploy the backend
   - The application will automatically run migrations on startup

## Connection String Format

```
Host=YOUR_SUPABASE_HOST;Database=postgres;Username=postgres;Password=YOUR_PASSWORD;Port=5432;SSL Mode=Require;Trust Server Certificate=true
```

## Important Notes

- Supabase requires SSL connections (hence `SSL Mode=Require`)
- The database name is typically `postgres` in Supabase
- Make sure to update the connection string in `appsettings.json` before deploying
- All existing EF Core migrations will work the same way
