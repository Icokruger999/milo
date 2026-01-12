# 🚀 Get Milo Up and Running

Follow these steps to get Milo running locally.

## Prerequisites Check

✅ **Database**: Tables created in Supabase  
✅ **Connection String**: Configured in `backend/Milo.API/appsettings.json`

## Step 1: Start the Backend API

The backend API connects to Supabase and serves all API endpoints.

### Open a PowerShell/Terminal Window:

```powershell
cd backend\Milo.API
dotnet run
```

**What happens:**
- API connects to Supabase database
- Migrations are checked/applied (tables already exist, so this will skip)
- API starts on `http://localhost:5000` (HTTP) and `https://localhost:5001` (HTTPS)

**Keep this window open!** The API needs to keep running.

**Expected output:**
```
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:5000
      Now listening on: https://localhost:5001
```

### Verify Backend is Running

Open a new terminal/PowerShell window and test:

```powershell
# Test health endpoint
curl http://localhost:5000/api/health
```

You should see: `{"status":"ok","message":"Milo API is running"}`

## Step 2: Start the Frontend (Optional for Local Development)

The frontend is a static website that talks to the backend API.

### Option A: Using npm (Recommended)

**Open a NEW PowerShell/Terminal window** (keep the backend running):

```powershell
# From project root (c:\milo)
npm install
npm start
```

This will:
- Start a local web server on `http://localhost:3000`
- Automatically open your browser
- Serve the frontend files

### Option B: Using Python

```powershell
python -m http.server 3000 -d frontend
```

Then open: `http://localhost:3000`

### Option C: VS Code Live Server

1. Open `frontend/index.html` in VS Code
2. Right-click → "Open with Live Server"

### Option D: Use Production URL

If your frontend is deployed to AWS Amplify, you can use:
- `https://www.codingeverest.com`

The frontend will connect to your local API if configured, or to the production API.

## Step 3: Configure Frontend API Connection

If running locally, make sure the frontend knows where the API is.

**Check `frontend/js/config.js`:**

It should point to:
- Local development: `http://localhost:5000/api`
- Production: Your EC2 IP or domain

## Step 4: Create Your First User

You need to create a user account to use the application.

### Option A: Use the Signup API Endpoint

```powershell
# Using PowerShell (Invoke-RestMethod)
$body = @{
    name = "Your Name"
    email = "your.email@example.com"
    password = "YourPassword123!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/signup" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

### Option B: Use the Signup Page

If the frontend is running:
1. Navigate to the signup page (usually `/milo-signup.html` or similar)
2. Fill in the form
3. Submit

### Option C: Use Swagger UI (if enabled)

1. Go to: `https://localhost:5001/swagger`
2. Find the `POST /api/auth/signup` endpoint
3. Click "Try it out"
4. Fill in the request body
5. Execute

## Step 5: Test the Application

### Backend Health Check
```powershell
curl http://localhost:5000/api/health
```

### Login Test
Once you have a user account, test login:

```powershell
$body = @{
    email = "your.email@example.com"
    password = "YourPassword123!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

You should get back a token if login is successful.

### Access the Application

1. Open your browser
2. Go to the frontend URL (local: `http://localhost:3000` or production URL)
3. Login with your credentials
4. Start using Milo!

## Quick Command Reference

### Start Backend
```powershell
cd backend\Milo.API
dotnet run
```

### Start Frontend (new terminal)
```powershell
npm start
# OR
python -m http.server 3000 -d frontend
```

### Test Backend
```powershell
curl http://localhost:5000/api/health
```

## Troubleshooting

### Backend won't start
- ✅ Check .NET SDK is installed: `dotnet --version`
- ✅ Check connection string in `appsettings.json`
- ✅ Make sure port 5000 isn't in use
- ✅ Check if Supabase database is accessible

### Frontend can't connect to API
- ✅ Make sure backend is running
- ✅ Check `frontend/js/config.js` points to correct API URL
- ✅ Check CORS settings in backend (should allow localhost)
- ✅ Check browser console for errors

### Database connection errors
- ✅ Verify connection string is correct
- ✅ Check Supabase dashboard - is database accessible?
- ✅ Check SSL settings (Supabase requires SSL)

### Can't create user
- ✅ Check backend logs for errors
- ✅ Verify email format is valid
- ✅ Check password requirements (if any)
- ✅ Check database tables exist (Users table)

## What's Next?

Once Milo is running:

1. ✅ **Create your first project**
2. ✅ **Add tasks**
3. ✅ **Invite team members**
4. ✅ **Explore features** (Board, Backlog, Roadmap, Incidents, etc.)

## Production Deployment

If you want to deploy to production (AWS):

1. **Backend**: Deploy to EC2 using `.\deploy-to-ec2.ps1`
2. **Frontend**: Already deployed to AWS Amplify at `www.codingeverest.com`

See `README.md` for production deployment details.

---

**You're ready to go!** 🎉

Start with Step 1 (Backend API) and work through the steps.
