# Supabase Migration Steps

## Current Status
- Connection string in `appsettings.json` contains a JWT secret (not a database connection string)
- Need to get the actual database connection string from Supabase

## Steps to Complete Migration

### Step 1: Get Supabase Database Connection String

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Database**
3. Find the **Connection string** section
4. You'll see:
   - **URI format**: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`
   - **Connection parameters**:
     - Host: `db.xxxxx.supabase.co`
     - Database: `postgres` (default)
     - Port: `5432`
     - User: `postgres`
     - Password: (your database password - shown in Settings → Database)

### Step 2: Create "milo" Database

**Option A: Using Supabase SQL Editor (Recommended)**

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy and paste the contents of `setup-supabase-milo-database.sql`
3. Run the script
4. This will create the "milo" database

**Option B: Using psql (if you have access)**

```bash
psql -h db.xxxxx.supabase.co -U postgres -d postgres -c "CREATE DATABASE milo;"
```

### Step 3: Update Connection String

After creating the "milo" database, update `backend/Milo.API/appsettings.json`:

```json
"ConnectionStrings": {
  "DefaultConnection": "Host=db.xxxxx.supabase.co;Database=milo;Username=postgres;Password=YOUR_PASSWORD;Port=5432;SSL Mode=Require"
}
```

Replace:
- `db.xxxxx.supabase.co` with your actual Supabase database host
- `YOUR_PASSWORD` with your database password

### Step 4: Deploy and Run Migrations

Once the connection string is updated:
1. Deploy the backend
2. EF Core migrations will automatically run on startup
3. All tables will be created in the "milo" database

## Important Notes

- **JWT Secret vs Database Connection**: The JWT secret you provided is for authentication, not database access. We need the database connection string.
- **Single Database per Project**: Supabase provides one PostgreSQL database per project. Creating a separate "milo" database is possible but typically you'd use schemas within the default database.
- **SSL Required**: Supabase requires SSL connections, which is already configured in `Program.cs`.

## What I Need From You

Please provide:
1. **Supabase Project URL**: `https://xxxxx.supabase.co`
2. **Database Host**: `db.xxxxx.supabase.co` (from Settings → Database)
3. **Database Password**: (from Settings → Database → Connection string)

Once I have these, I'll:
1. Update `appsettings.json` with the correct connection string
2. Deploy the changes
3. Verify the connection and table creation
