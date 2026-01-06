# Milo API - Backend

ASP.NET Core 8.0 Web API for the Milo project management application.

## Prerequisites
- .NET SDK 8.0 or later
- Access to EC2 instance (Coding Everest)

## Local Development

```bash
cd Milo.API
dotnet restore
dotnet run
```

The API will be available at:
- HTTP: http://localhost:5000
- HTTPS: https://localhost:5001
- Swagger UI: https://localhost:5001/swagger

## Deployment to EC2

### Option 1: Direct Deployment
```bash
# Build the application
dotnet publish -c Release -o ./publish

# Copy to EC2 (replace with your EC2 details)
scp -r ./publish/* user@your-ec2-instance:/var/www/milo-api/

# SSH into EC2 and run
ssh user@your-ec2-instance
cd /var/www/milo-api
dotnet Milo.API.dll
```

### Option 2: Using Systemd Service
1. Create a systemd service file on EC2:
```ini
[Unit]
Description=Milo API
After=network.target

[Service]
Type=notify
ExecStart=/usr/bin/dotnet /var/www/milo-api/Milo.API.dll
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=milo-api
User=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production

[Install]
WantedBy=multi-user.target
```

2. Enable and start the service:
```bash
sudo systemctl enable milo-api
sudo systemctl start milo-api
```

## Configuration
Update `appsettings.json` or use environment variables:
- Database connection strings
- CORS origins (frontend URLs)
- API keys and secrets

## API Endpoints
- `GET /api/health` - Health check
- `GET /api/projects` - Get all projects
- `GET /api/projects/{id}` - Get project by ID
- `POST /api/projects` - Create new project

