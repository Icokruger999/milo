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

// We are now using a Direct Connection string in appsettings.json
// To avoid "Tenant" errors, we use the connection string exactly as provided.
builder.Services.AddDbContext<MiloDbContext>(options =>
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.CommandTimeout(30);
    })
    .EnableSensitiveDataLogging(false));

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
            .SetPreflightMaxAge(TimeSpan.FromSeconds(86400));
    });
});

var app = builder.Build();

// Run database migrations on startup
_ = Task.Run(async () =>
{
    await Task.Delay(2000); // Wait for services to initialize
    using (var scope = app.Services.CreateScope())
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<MiloDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        try
        {
            logger.LogInformation("Applying database migrations...");
            dbContext.Database.Migrate();
            logger.LogInformation("Database migrations applied successfully.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database migration failed.");
        }
    }
});

// Add error handling middleware
app.UseExceptionHandler("/api/error");

// CORS must be early in the pipeline
app.UseCors("AllowFrontend");

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
