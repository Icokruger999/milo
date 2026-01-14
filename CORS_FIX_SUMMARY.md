# CORS and 502 Bad Gateway Fix

## Issues Identified

1. **502 Bad Gateway**: Backend was not running on port 8080
2. **CORS Error**: Health endpoint didn't have CORS requirement

## Fixes Applied

### 1. CORS Configuration Fix
- **File**: `backend/Milo.API/Program.cs`
- **Change**: Added `.RequireCors("AllowFrontend")` to the health endpoint
- **Before**: 
  ```csharp
  app.MapGet("/api/health", () => new { status = "ok", message = "Milo API is running" });
  ```
- **After**:
  ```csharp
  app.MapGet("/api/health", () => new { status = "ok", message = "Milo API is running" }).RequireCors("AllowFrontend");
  ```

### 2. Backend Deployment
- Deployed latest backend code from GitHub to EC2
- Service file configured for port 8080
- Service restarted

## Current CORS Configuration

The CORS policy is configured in `Program.cs`:

```csharp
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

// CORS middleware is FIRST in pipeline
app.UseCors("AllowFrontend");
```

## Verification Steps

After deployment, verify:

1. **Backend is running**:
   ```bash
   sudo systemctl status milo-backend.service
   curl http://localhost:8080/api/health
   ```

2. **CORS headers present**:
   ```bash
   curl -v -H 'Origin: https://www.codingeverest.com' http://localhost:8080/api/health
   ```
   Should see: `Access-Control-Allow-Origin: https://www.codingeverest.com`

3. **Via Nginx**:
   ```bash
   curl -v -H 'Origin: https://www.codingeverest.com' https://api.codingeverest.com/api/health
   ```
   Should NOT see 502 Bad Gateway

## Expected Behavior

- ✅ Frontend at `https://www.codingeverest.com` can call `https://api.codingeverest.com/api/*`
- ✅ CORS headers are present in all responses
- ✅ Preflight OPTIONS requests are handled correctly
- ✅ No 502 Bad Gateway errors

## If Still Getting 502

1. Check if backend is running:
   ```bash
   sudo systemctl status milo-backend.service
   ```

2. Check if port 8080 is listening:
   ```bash
   sudo netstat -tlnp | grep 8080
   ```

3. Check error logs:
   ```bash
   sudo tail -n 50 /home/ec2-user/milo-backend-error.log
   ```

4. Restart service:
   ```bash
   sudo systemctl restart milo-backend.service
   ```
