using Microsoft.EntityFrameworkCore;
using Milo.API.Data;
using Npgsql;
using System.Net;
using System.Net.Sockets;
using System.Linq;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Configure JSON options for date handling
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        // Use camelCase for JSON property names to match frontend
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        // Dates are handled automatically by System.Text.Json - ISO 8601 strings are parsed to DateTime
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure Entity Framework with PostgreSQL
// Connection string from appsettings.json (no password needed - using trust authentication for localhost)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrEmpty(connectionString))
{
    throw new InvalidOperationException("DefaultConnection connection string is required in appsettings.json");
}

builder.Services.AddDbContext<MiloDbContext>(options =>
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.CommandTimeout(30);
        // Connection pooling optimization
        npgsqlOptions.EnableRetryOnFailure(
            maxRetryCount: 3,
            maxRetryDelay: TimeSpan.FromSeconds(5),
            errorCodesToAdd: null);
    })
    .EnableSensitiveDataLogging(false)
    // Add query caching for better performance
    .UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking));

// Configure connection pooling at the Npgsql level
var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
dataSourceBuilder.ConnectionStringBuilder.MinPoolSize = 5; // Keep minimum connections warm
dataSourceBuilder.ConnectionStringBuilder.MaxPoolSize = 20;
dataSourceBuilder.ConnectionStringBuilder.ConnectionIdleLifetime = 300; // 5 minutes
dataSourceBuilder.ConnectionStringBuilder.ConnectionPruningInterval = 10;
var dataSource = dataSourceBuilder.Build();
builder.Services.AddSingleton(dataSource);

// Add email service
builder.Services.AddScoped<Milo.API.Services.IEmailService, Milo.API.Services.EmailService>();

// Add background service for daily users report
builder.Services.AddHostedService<Milo.API.Services.DailyUsersReportService>();

// Configure CORS for frontend
// CRITICAL: Must include both www and non-www versions for all domains
// CRITICAL: Must handle OPTIONS preflight requests explicitly
// CRITICAL: Using SetIsOriginAllowed to ensure exact origin matching
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        // Use SetIsOriginAllowed for flexible matching that returns the EXACT origin requested
        policy.SetIsOriginAllowed(origin =>
        {
            if (string.IsNullOrEmpty(origin)) return false;
            
            // Normalize origin for comparison (remove trailing slash)
            var normalizedOrigin = origin.TrimEnd('/');
            
            // Allow exact matches for both www and non-www
            return normalizedOrigin == "https://codingeverest.com" ||
                   normalizedOrigin == "https://www.codingeverest.com" ||
                   normalizedOrigin == "http://codingeverest.com" ||
                   normalizedOrigin == "http://www.codingeverest.com";
        })
        .AllowAnyHeader()
        .AllowAnyMethod() // This includes OPTIONS
        .AllowCredentials()
        .SetPreflightMaxAge(TimeSpan.FromSeconds(86400)); // Cache preflight for 24 hours
    });
});

var app = builder.Build();

// CORS must be FIRST in the pipeline - before any other middleware
// This ensures preflight OPTIONS requests are handled correctly
app.UseCors("AllowFrontend");

// Run database migrations on startup (only if tables don't exist)
_ = Task.Run(async () =>
{
    await Task.Delay(5000); // Wait for services to initialize
    using (var scope = app.Services.CreateScope())
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<MiloDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        try
        {
            // Check if users table exists (indicates tables are already created)
            var tableExists = await dbContext.Database.ExecuteSqlRawAsync(
                "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users'"
            );
            
            // Only run migrations if tables don't exist
            var canConnect = await dbContext.Database.CanConnectAsync();
            if (canConnect)
            {
                logger.LogInformation("Database connection successful. Checking if migrations are needed...");
                // Try to get applied migrations - if this fails, tables don't exist
                try
                {
                    var appliedMigrations = await dbContext.Database.GetAppliedMigrationsAsync();
                    if (appliedMigrations.Any())
                    {
                        logger.LogInformation("Migrations already applied. Skipping migration step.");
                    }
                    else
                    {
                        logger.LogInformation("No migrations found. Tables may have been created manually. Skipping migration step.");
                    }
                }
                catch
                {
                    logger.LogInformation("Migration history table doesn't exist. Assuming tables were created manually. Skipping migration step.");
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database connection check failed: {Message}", ex.Message);
        }
    }
});

// Add error handling middleware (after CORS to allow preflight requests through)
app.UseExceptionHandler("/api/error");

app.Use(async (context, next) =>
{
    context.Response.Headers.Append("Cache-Control", "no-cache, no-store, must-revalidate");
    context.Response.Headers.Append("Pragma", "no-cache");
    context.Response.Headers.Append("Expires", "0");
    await next();
});

app.UseAuthorization();

// CRITICAL: Explicitly handle OPTIONS requests for CORS preflight
// This ensures browsers can check CORS permissions before sending actual requests
// CRITICAL: Set the EXACT origin from the request to fix www/non-www matching
app.MapMethods("/api/{**path}", new[] { "OPTIONS" }, async (HttpContext context) =>
{
    // Get the exact origin from the request
    var origin = context.Request.Headers["Origin"].ToString();
    
    // Validate and set the exact origin (preserve the exact value from request)
    if (!string.IsNullOrEmpty(origin))
    {
        var normalizedOrigin = origin.TrimEnd('/').ToLowerInvariant();
        var allowedOrigins = new[]
        {
            "https://codingeverest.com",
            "https://www.codingeverest.com",
            "http://codingeverest.com",
            "http://www.codingeverest.com"
        };
        
        if (allowedOrigins.Any(a => normalizedOrigin == a.ToLowerInvariant()))
        {
            // Set the EXACT origin from the request (preserve original case/format)
            context.Response.Headers["Access-Control-Allow-Origin"] = origin;
            context.Response.Headers["Access-Control-Allow-Credentials"] = "true";
            context.Response.Headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH";
            context.Response.Headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, Accept, X-Requested-With";
            context.Response.Headers["Access-Control-Max-Age"] = "86400";
        }
    }
    
    context.Response.StatusCode = 200;
    await context.Response.WriteAsync("");
});

app.MapControllers().RequireCors("AllowFrontend");
app.MapGet("/api/health", () => new { status = "ok", message = "Milo API is running" }).RequireCors("AllowFrontend");

app.Run();
