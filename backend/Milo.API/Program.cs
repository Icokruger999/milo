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
        // CRITICAL: Connection pooling settings for PgBouncer
        // PgBouncer handles pooling, so we use minimal pooling here
        npgsqlOptions.EnableRetryOnFailure(
            maxRetryCount: 3,
            maxRetryDelay: TimeSpan.FromSeconds(5),
            errorCodesToAdd: null);
    })
    .EnableSensitiveDataLogging(false));

// Add email service
builder.Services.AddScoped<Milo.API.Services.IEmailService, Milo.API.Services.EmailService>();

// Add background service for daily users report
builder.Services.AddHostedService<Milo.API.Services.DailyUsersReportService>();

// Configure CORS for frontend
// CRITICAL: Must include both www and non-www versions for all domains
// CRITICAL: Must handle OPTIONS preflight requests explicitly
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "https://codingeverest.com",
                "https://www.codingeverest.com",
                "http://codingeverest.com",
                "http://www.codingeverest.com"
            )
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
app.MapMethods("/api/{**path}", new[] { "OPTIONS" }, async (HttpContext context) =>
{
    context.Response.StatusCode = 200;
    await context.Response.WriteAsync("");
}).RequireCors("AllowFrontend");

app.MapControllers().RequireCors("AllowFrontend");
app.MapGet("/api/health", () => new { status = "ok", message = "Milo API is running" }).RequireCors("AllowFrontend");

app.Run();
