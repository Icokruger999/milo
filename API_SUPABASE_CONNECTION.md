# How the API Connects to Supabase

## Connection Mechanism

Your API connects to Supabase using a **connection string** stored in `backend/Milo.API/appsettings.json`.

### Current Connection String

```json
"ConnectionStrings": {
  "DefaultConnection": "Host=db.ffrtlelsqhnxjfwwnazf.supabase.co;Database=milo;Username=postgres;Password=FlVT6=Lps0E!l5cg;Port=5432;SSL Mode=Require"
}
```

### How It Works

1. **API Startup** (`Program.cs` lines 15-90):
   - Reads the connection string from `appsettings.json`
   - Configures Entity Framework to use PostgreSQL (Npgsql)
   - Sets up SSL mode (required for Supabase)
   - Creates a `MiloDbContext` that uses this connection

2. **Automatic Migrations** (`Program.cs` lines 116-136):
   - When the API starts, it **automatically runs migrations**
   - This creates all tables if they don't exist
   - Uses Entity Framework's `Database.Migrate()` method

3. **Query Execution**:
   - All API controllers use `MiloDbContext` (injected via dependency injection)
   - Entity Framework translates C# LINQ queries to SQL
   - Queries run against your Supabase PostgreSQL database

## Two Ways to Create Tables

### Option 1: Let the API Create Tables Automatically (Recommended)

**How it works:**
- Deploy/run your API
- On startup, the API automatically runs migrations
- All tables are created automatically

**Steps:**
1. Make sure the `milo` database exists in Supabase (run `delete-astutetech-create-milo.sql` first)
2. Start your API: `cd backend/Milo.API && dotnet run`
3. Tables are created automatically!

### Option 2: Run Migrations Manually (Before Starting API)

**How it works:**
- Use the migration runner script to create tables
- Then start your API (migrations won't run again - they're already applied)

**Steps:**
1. Make sure the `milo` database exists in Supabase
2. Run: `.\run-supabase-migrations.ps1`
3. Start your API: `cd backend/Milo.API && dotnet run`

### Option 3: Use SQL Script Directly (Not Recommended)

**Why not recommended:**
- Entity Framework migrations are version-controlled and managed
- Manual SQL scripts can get out of sync with code
- Missing migrations won't be tracked

**But if you want SQL:**
- See the SQL script below (generated from migrations)
- Run it in Supabase SQL Editor
- Note: This doesn't create the `__EFMigrationsHistory` table, so EF will think no migrations ran

## Important Notes

1. **Database Must Exist First**: Run `delete-astutetech-create-milo.sql` in Supabase SQL Editor to create the `milo` database

2. **Connection String Security**: The connection string includes your password. In production, use environment variables or Azure Key Vault

3. **SSL Required**: Supabase requires SSL connections (`SSL Mode=Require`)

4. **Migration Tracking**: Entity Framework uses a `__EFMigrationsHistory` table to track which migrations have been applied. If you create tables manually via SQL, this table won't exist and EF will try to run all migrations again.

## Connection Flow Diagram

```
API Startup
    ↓
Read appsettings.json
    ↓
Parse Connection String
    ↓
Configure Npgsql (PostgreSQL driver)
    ↓
Create MiloDbContext
    ↓
Run Migrations (if pending)
    ↓
Create/Update Tables
    ↓
API Ready - Controllers can query database
```

## Testing the Connection

You can test if the API can connect by:
1. Starting the API: `cd backend/Milo.API && dotnet run`
2. Check the console output for migration messages
3. Visit `http://localhost:5000/api/health` to confirm API is running
