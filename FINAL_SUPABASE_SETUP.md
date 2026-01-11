# Final Supabase Database Setup

## SQL Script Created
The SQL script `delete-astutetech-create-milo.sql` has been created to:
1. Delete the "astutetech" database
2. Create the "milo" database

## How to Execute

### Option 1: Supabase SQL Editor (Recommended - No password needed)
1. Go to: https://vaugklgudfvmtscoxacc.supabase.co
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the entire contents of `delete-astutetech-create-milo.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)

### Option 2: Using psql (if you have PostgreSQL client installed)
```bash
psql -h db.vaugklgudfvmtscoxacc.supabase.co -U postgres -d postgres -f delete-astutetech-create-milo.sql
```
(You'll be prompted for the database password)

## After Database Creation

Once the "milo" database is created:
1. Get your database password from: Supabase Dashboard → Settings → Database → Connection string
2. Update `backend/Milo.API/appsettings.json` with the password
3. Deploy the backend
4. EF Core migrations will automatically create all tables

## Connection String Format
```
Host=db.vaugklgudfvmtscoxacc.supabase.co;Database=milo;Username=postgres;Password=YOUR_PASSWORD;Port=5432;SSL Mode=Require
```
