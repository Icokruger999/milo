# Creating Tables in Supabase

You want to create tables directly in Supabase, not run the API locally.

## Quick Solution: Run Migrations in Supabase

You have a script ready to create all tables in Supabase. Just stop the local API first (if it's running), then run:

```powershell
.\run-supabase-migrations.ps1
```

This will:
- Connect directly to your Supabase database
- Run all Entity Framework migrations
- Create all tables (Users, Projects, Tasks, Labels, Teams, Incidents, etc.)

## Steps:

1. **Stop the local API** (if running):
   - Find the terminal/process running the API
   - Press `Ctrl+C` to stop it

2. **Run migrations:**
   ```powershell
   cd c:\milo
   .\run-supabase-migrations.ps1
   ```

3. **Done!** All tables will be created in Supabase.

## Alternative: Tables Created Automatically

Your API (`Program.cs`) is configured to automatically run migrations when it starts. So if you:
- Deploy the API to production (EC2)
- Or run the API locally while connected to Supabase

The tables will be created automatically on first run.

## Why the localhost:5000 test?

The `test-db-connection.ps1` script tests your local API health endpoint - this is just a diagnostic tool. It doesn't create tables. To create tables in Supabase, use the migration script above.
