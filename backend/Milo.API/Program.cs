using Microsoft.EntityFrameworkCore;
using Milo.API.Data;
using Npgsql;
using System.Net;
using System.Net.Sockets;
using System.Linq;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure Entity Framework with PostgreSQL
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrEmpty(connectionString))
{
    throw new InvalidOperationException("DefaultConnection connection string is required in appsettings.json");
}

// Handle Supabase connection string - decode if base64 encoded or convert URI format
if (!string.IsNullOrEmpty(connectionString))
{
    try
    {
        string processedConnectionString = connectionString;
        
        // Try to decode as base64 first (for encrypted/encoded Supabase strings)
        if (connectionString.EndsWith("==") || connectionString.EndsWith("="))
        {
            try
            {
                var decoded = System.Text.Encoding.UTF8.GetString(System.Convert.FromBase64String(connectionString));
                if (decoded.Contains("postgresql://") || decoded.Contains("postgres://") || 
                    decoded.Contains("Host=") || decoded.Contains("host="))
                {
                    processedConnectionString = decoded;
                }
            }
            catch
            {
                // Not base64, use as-is
            }
        }
        
        // Parse and configure connection string
        var connBuilder = new NpgsqlConnectionStringBuilder(processedConnectionString);
        
        // Resolve hostname to IPv4 address to avoid IPv6 DNS resolution issues
        // Skip resolution for pooler hostnames (they should already be IPv4 compatible)
        if (!string.IsNullOrEmpty(connBuilder.Host) && !IPAddress.TryParse(connBuilder.Host, out _) && !connBuilder.Host.Contains("pooler"))
        {
            try
            {
                var addresses = Dns.GetHostAddresses(connBuilder.Host);
                var ipv4Address = addresses.FirstOrDefault(ip => ip.AddressFamily == AddressFamily.InterNetwork);
                
                if (ipv4Address != null)
                {
                    // Use IPv4 address instead of hostname to force IPv4 connection
                    connBuilder.Host = ipv4Address.ToString();
                }
                else
                {
                    // If only IPv6 is available, try using Supabase connection pooler instead
                    // The pooler typically has IPv4 support
                    if (connBuilder.Host.Contains("supabase.co") && !connBuilder.Host.Contains("pooler"))
                    {
                        // Extract project ref from hostname (e.g., db.ffrtlelsqhnxjfwwnazf.supabase.co -> ffrrtlelsqhnxjfwwnazf)
                        var parts = connBuilder.Host.Split('.');
                        if (parts.Length >= 2)
                        {
                            var projectRef = parts[1]; // ffrrtlelsqhnxjfwwnazf
                            // Use transaction pooler on port 5432 (IPv4 supported)
                            connBuilder.Host = $"{projectRef}.pooler.supabase.com";
                            // Update username to pooler format: postgres.[project-ref]
                            if (connBuilder.Username == "postgres" || string.IsNullOrEmpty(connBuilder.Username))
                            {
                                connBuilder.Username = $"postgres.{projectRef}";
                            }
                            // Keep original port (5432) for session mode
                            // Note: Pooler supports both session (5432) and transaction (6543) modes
                        }
                    }
                }
            }
            catch
            {
                // If DNS resolution fails, keep the original hostname
                // Npgsql will try to resolve it
            }
        }
        
        // Ensure SSL is enabled for Supabase (required)
        connBuilder.SslMode = SslMode.Require;
        // Note: When using IP address, SSL certificate validation might check the hostname
        // Supabase should handle this, but if issues occur, we may need to adjust validation
        
        connectionString = connBuilder.ConnectionString;
    }
    catch
    {
        // If parsing fails, use as-is - Npgsql will try to handle it
    }
}

builder.Services.AddDbContext<MiloDbContext>(options =>
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.CommandTimeout(30); // 30 second timeout
    })
    .EnableSensitiveDataLogging(false)); // Disable for performance in production

// Add email service
builder.Services.AddScoped<Milo.API.Services.IEmailService, Milo.API.Services.EmailService>();

// Configure CORS for frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "https://www.codingeverest.com",
                "https://codingeverest.com",
                "http://www.codingeverest.com",
                "http://codingeverest.com"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()
            .SetPreflightMaxAge(TimeSpan.FromSeconds(86400)); // Cache preflight for 24 hours
    });
});

var app = builder.Build();

// Apply database migrations to create all tables (non-blocking)
_ = Task.Run(async () =>
{
    await Task.Delay(2000); // Wait 2 seconds for app to start
    using (var scope = app.Services.CreateScope())
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<MiloDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        try
        {
            // Use Migrate() instead of EnsureCreated() to properly run migrations
            // This will create all tables defined in the InitialCreate migration
            dbContext.Database.Migrate();
            logger.LogInformation("Database migrations applied successfully.");
        }
        catch (Exception ex)
        {
            // Log error but don't fail startup - database might not be configured yet
            logger.LogWarning(ex, "Database migration failed. Ensure RDS connection string is configured. Error: {Error}", ex.Message);
        }
    }
});

// Configure the HTTP request pipeline for production
// Swagger disabled in production for security
// HTTPS redirection handled by reverse proxy (if configured)

// Add error handling middleware
app.UseExceptionHandler("/api/error");

// CORS must be early in the pipeline, before UseAuthorization
app.UseCors("AllowFrontend");

// Add cache control headers to prevent caching for API responses
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("Cache-Control", "no-cache, no-store, must-revalidate");
    context.Response.Headers.Append("Pragma", "no-cache");
    context.Response.Headers.Append("Expires", "0");
    await next();
});

app.UseAuthorization();

app.MapControllers().RequireCors("AllowFrontend");

app.MapGet("/api/health", () => new { status = "ok", message = "Milo API is running" });

app.Run();

