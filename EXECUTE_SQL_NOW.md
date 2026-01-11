# Execute SQL in Supabase NOW

## Quick Steps

1. **Open Supabase SQL Editor:**
   - Go to: https://vaugklgudfvmtscoxacc.supabase.co
   - Click **SQL Editor** in the left sidebar
   - Click **New Query**

2. **Copy and Paste this SQL:**

```sql
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        RAISE NOTICE 'Dropped table: %', r.tablename;
    END LOOP;
    
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public')
    LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequence_name) || ' CASCADE';
        RAISE NOTICE 'Dropped sequence: %', r.sequence_name;
    END LOOP;
END $$;

SELECT COUNT(*) AS remaining_tables FROM pg_tables WHERE schemaname = 'public';
```

3. **Click "Run" (or press Ctrl+Enter)**

4. **Verify:** You should see "remaining_tables: 0"

## After Execution

Once tables are dropped:
- The backend will automatically run EF Core migrations on next startup
- All tables will be recreated with proper schema and indexes
- Database will be ready for use
