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
        
        // For Supabase direct connections, try to get IPv4 address
        // EC2's DNS might only return IPv6, so we need to work around this
        if (!string.IsNullOrEmpty(connBuilder.Host) && !IPAddress.TryParse(connBuilder.Host, out _) && connBuilder.Host.Contains("supabase.co") && !connBuilder.Host.Contains("pooler"))
        {
            try
            {
                // Try to get all addresses
                var allAddresses = Dns.GetHostAddresses(connBuilder.Host);
                var ipv4Address = allAddresses.FirstOrDefault(ip => ip.AddressFamily == AddressFamily.InterNetwork);
                
                if (ipv4Address != null)
                {
                    // Found IPv4 address, use it directly
                    connBuilder.Host = ipv4Address.ToString();
                }
                else if (allAddresses.Length > 0 && allAddresses[0].AddressFamily == AddressFamily.InterNetworkV6)
                {
                    // Only IPv6 available from local DNS
                    // Try using Google DNS (8.8.8.8) to get IPv4 - but this requires external tool
                    // For now, we'll configure Npgsql connection string to handle this
                    // Add a parameter to prefer IPv4 if possible
                    // Note: This is a known issue with Supabase and EC2 IPv6-only DNS
                    // The connection will fail, but we've tried our best
                    // Alternative: Use Supabase connection pooler with correct hostname format
                }
            }
            catch (System.Net.Sockets.SocketException ex) when (ex.SocketErrorCode == System.Net.Sockets.SocketError.HostNotFound)
            {
                // Host not found - keep original hostname
            }
            catch
            {
                // Any other error - keep original hostname, let Npgsql try
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

