# Milo - Project Management Application

## Overview
A Jira-type project management application with a static frontend and a .NET 8 backend API.

**Current Setup**: Frontend only (static HTML/CSS/JS served via http-server on port 5000)

## Project Structure
- `frontend/` - Static HTML, CSS, JavaScript client
- `backend/` - C# ASP.NET Core API (not running in Replit, uses external production API)
- `package.json` - Node.js configuration for serving frontend

## Configuration
- **Frontend Port**: 5000 (bound to 0.0.0.0)
- **API Backend**: External at https://api.codingeverest.com/api
- **Deployment**: Static hosting from `frontend/` directory

## Development
Run the frontend with:
```bash
npm start
```

## Notes
- The backend API runs on an external EC2 instance
- Frontend connects to the production API at api.codingeverest.com
- This Replit setup is for frontend development only
