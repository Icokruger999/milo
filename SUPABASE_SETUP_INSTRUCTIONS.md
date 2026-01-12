# Supabase Database Setup Instructions

## What You Need

The string you provided (`XKjjDjV71QW9qbIgWdVSwwsFwgZ/93pDpM5YA7YFU31jnlHSJ74B2YZm5C5NtNZfsVd+5wB0aX6vaTQ1LWK2IA==`) is a **JWT Secret** for authentication, not a database connection string.

## How to Get Your Supabase Database Connection String

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Database**
3. Scroll down to **Connection string** section
4. You'll see options:
   - **URI** format: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`
   - **Connection parameters**:
     - Host: `db.xxxxx.supabase.co`
     - Database: `postgres` (default)
     - Port: `5432`
     - User: `postgres`
     - Password: (your database password)

## Creating the "milo" Database

You have two options:

### Option 1: Use Supabase SQL Editor
1. Go to **SQL Editor** in your Supabase dashboard
2. Run this command:
   ```sql
   CREATE DATABASE milo;
   ```
3. Then use connection string with `Database=milo` instead of `Database=postgres`

### Option 2: Use the default "postgres" database
- We can create all tables in the default `postgres` database
- EF Core migrations will create all tables automatically

## Connection String Format

Once you have the connection details, the format should be:

**Parameter format:**
```
Host=db.xxxxx.supabase.co;Database=milo;Username=postgres;Password=YOUR_PASSWORD;Port=5432;SSL Mode=Require
```

**Or URI format:**
```
postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/milo
```

## Next Steps

1. Get your database connection string from Supabase Settings → Database
2. Share it with me (or update appsettings.json)
3. I'll update the configuration and deploy
4. EF Core migrations will automatically create all tables in the new database
