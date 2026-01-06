var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

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

