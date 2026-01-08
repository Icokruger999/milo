# Fix dotnet ef Command on EC2

## Issue
The `dotnet ef` command is not found because Entity Framework Core tools are not installed.

## Solution

### Option 1: Install dotnet-ef globally (Recommended)
```bash
dotnet tool install --global dotnet-ef
export PATH="$PATH:$HOME/.dotnet/tools"
```

### Option 2: Use dotnet-ef from project
```bash
cd backend/Milo.API
dotnet tool restore
dotnet ef migrations add AddFlakesAndTaskType --output-dir Data/Migrations
```

### Option 3: Skip migration (if auto-migration is enabled)
The backend may auto-apply migrations on startup. Just restart:
```bash
cd ~/milo
git pull origin main
sudo systemctl restart milo-api.service
```

## Full Update Command
```bash
cd ~/milo
git pull origin main
dotnet tool install --global dotnet-ef
export PATH="$PATH:$HOME/.dotnet/tools"
cd backend/Milo.API
dotnet ef migrations add AddFlakesAndTaskType --output-dir Data/Migrations
sudo systemctl restart milo-api.service
```

