# Update EC2 Backend - Manual Instructions

## Changes Made

1. ✅ **Flakes** - Confluence-like wiki/documentation page
2. ✅ **Incidents** - Replaces "Issues" throughout the app
3. ✅ **Navigation** - Updated in board, roadmap, and sidebar
4. ✅ **Backend API** - FlakesController and Flake model added

## Manual Update Steps (SSH into EC2)

### Step 1: SSH into EC2
```bash
ssh -i your-key.pem ec2-user@34.246.3.141
```

### Step 2: Pull Latest Code
```bash
cd ~/milo
# or
cd /home/ec2-user/milo

git pull origin main
```

### Step 3: Create Migration (if needed)
```bash
cd backend/Milo.API
dotnet ef migrations add AddFlakesAndTaskType --output-dir Data/Migrations
```

### Step 4: Restart Backend Service
```bash
sudo systemctl restart milo-api.service
```

### Step 5: Verify Backend is Running
```bash
sudo systemctl status milo-api.service
curl http://localhost:5001/api/health
```

### Step 6: Test Flakes API
```bash
curl http://localhost:5001/api/flakes
```

## What Gets Updated

### Frontend (Auto-deploys via Amplify)
- ✅ `milo-flakes.html` - New Flakes page
- ✅ `milo-incidents.html` - New Incidents page  
- ✅ `js/flakes.js` - Flakes functionality
- ✅ Navigation updated in board and roadmap

### Backend (Manual update required)
- ✅ `FlakesController.cs` - New API controller
- ✅ `Flake.cs` - New model
- ✅ `MiloDbContext.cs` - Updated with Flakes DbSet
- ✅ Migration will create `Flakes` table

## Expected Result

After update:
- ✅ Flakes page accessible at `/milo-flakes.html`
- ✅ Incidents page accessible at `/milo-incidents.html`
- ✅ Navigation shows "Flakes" and "Incidents" instead of "Issues"
- ✅ Backend API supports `/api/flakes` endpoints

## Quick One-Liner

```bash
cd ~/milo && git pull origin main && cd backend/Milo.API && dotnet ef migrations add AddFlakesAndTaskType --output-dir Data/Migrations && sudo systemctl restart milo-api.service && sleep 5 && curl http://localhost:5001/api/health
```

