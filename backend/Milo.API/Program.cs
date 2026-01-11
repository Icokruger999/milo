using Microsoft.EntityFrameworkCore;
using Milo.API.Data;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure Entity Framework with PostgreSQL
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrEmpty(connectionString))
{
    // Fallback for development
    connectionString = "Host=localhost;Database=MiloDB;Username=postgres;Password=postgres";
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

