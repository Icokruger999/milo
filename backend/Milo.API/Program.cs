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
    options.UseNpgsql(connectionString));

// Add email service
builder.Services.AddScoped<Milo.API.Services.EmailService>();

// Configure CORS for frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(origin => 
              {
                  // Production-only: Allow specific production domains
                  if (string.IsNullOrEmpty(origin)) return false;
                  
                  // Production domains
                  var allowedOrigins = new[]
                  {
                      "https://www.codingeverest.com",
                      "https://codingeverest.com",
                      "http://www.codingeverest.com",
                      "http://codingeverest.com"
                  };
                  
                  if (allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
                      return true;
                  
                  // Allow any Amplify app domain (for frontend hosting)
                  if (origin.Contains("amplifyapp.com", StringComparison.OrdinalIgnoreCase))
                      return true;
                  
                  return false;
              })
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
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

app.UseCors("AllowFrontend");
app.UseAuthorization();
app.MapControllers();

app.MapGet("/api/health", () => new { status = "ok", message = "Milo API is running" });

app.Run();

