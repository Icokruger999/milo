using Npgsql;

var dbHost = "db.vaugklgudfvmtscoxacc.supabase.co";
var dbName = "astutetech";
var dbUser = "postgres";
var dbPassword = "FlVT6=Lps0E!l5cg";
var dbPort = "5432";

var connString = $"Host={dbHost};Port={dbPort};Database={dbName};Username={dbUser};Password={dbPassword};SSL Mode=Require";

try
{
    Console.WriteLine("=========================================");
    Console.WriteLine("Connecting to Supabase Database");
    Console.WriteLine("=========================================");
    Console.WriteLine($"Host: {dbHost}");
    Console.WriteLine($"Database: {dbName}");
    Console.WriteLine("");

    using var conn = new NpgsqlConnection(connString);
    conn.Open();
    Console.WriteLine("✓ Connected to Supabase successfully!");
    Console.WriteLine("");

    var sql = @"
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
";

    Console.WriteLine("Executing SQL to drop all tables...");
    Console.WriteLine("");

    using var cmd = new NpgsqlCommand(sql, conn);
    using var reader = cmd.ExecuteReader();
    
    while (reader.Read())
    {
        Console.WriteLine($"Remaining tables: {reader[0]}");
    }
    
    Console.WriteLine("");
    Console.WriteLine("✓ All tables dropped successfully!");
    Console.WriteLine("");
    Console.WriteLine("Next steps:");
    Console.WriteLine("1. Deploy the backend");
    Console.WriteLine("2. EF Core migrations will automatically create all tables");
}
catch (Exception ex)
{
    Console.WriteLine($"✗ Error: {ex.Message}");
    Console.WriteLine($"Stack trace: {ex.StackTrace}");
    Environment.Exit(1);
}
