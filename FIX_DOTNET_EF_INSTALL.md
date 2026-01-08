# Fix dotnet-ef Installation on EC2

## Issue
`dotnet tool install --global dotnet-ef` fails with:
```
The settings file in the tool's NuGet package is invalid: Settings file 'DotnetToolSettings.xml' was not found in the package.
Tool 'dotnet-ef' failed to install.
```

## Solutions

### Option 1: Install Specific Version (Recommended)
```bash
dotnet tool install --global dotnet-ef --version 8.0.0
```

### Option 2: Update .NET SDK First
```bash
# Check current .NET version
dotnet --version

# If needed, update .NET SDK
sudo yum update dotnet

# Then try installing dotnet-ef
dotnet tool install --global dotnet-ef
```

### Option 3: Use Local Tools Instead
```bash
cd backend/Milo.API

# Add as local tool (no global install needed)
dotnet new tool-manifest
dotnet tool install dotnet-ef

# Use it with:
dotnet ef migrations add AddFlakesAndTaskType --output-dir Data/Migrations
```

### Option 4: Skip Migration (Auto-migration on startup)
If the backend auto-applies migrations, just restart:
```bash
cd ~/milo
git pull origin main
sudo systemctl restart milo-api.service
```

## Quick Fix Command
```bash
cd ~/milo
git pull origin main
dotnet tool install --global dotnet-ef --version 8.0.0 || dotnet tool install --global dotnet-ef --version 7.0.0
export PATH="$PATH:$HOME/.dotnet/tools"
cd backend/Milo.API
dotnet ef migrations add AddFlakesAndTaskType --output-dir Data/Migrations || echo 'Migration may already exist'
sudo systemctl restart milo-api.service
```

