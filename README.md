# Milo - Jira-Type Project Management Application

A modern project management application built with C#, JavaScript, HTML, and CSS.

**Live Site**: [www.codingeverest.com](https://www.codingeverest.com)

## Project Structure

- `backend/` - C# ASP.NET Core API
- `frontend/` - HTML, CSS, JavaScript client
- `amplify.yml` - AWS Amplify build configuration

## Getting Started

### Prerequisites
- .NET SDK 8.0 or later
- Node.js (for build tools)
- AWS CLI configured
- Namecheap domain: `www.codingeverest.com`

### Setup
1. Clone the repository
2. Navigate to `backend/Milo.API/` and run `dotnet restore`
3. Open `frontend/index.html` in a browser or use a local server

### Local Development
```bash
# Frontend
npm install
npm start
# Opens at http://localhost:3000

# Backend
cd backend/Milo.API
dotnet run
# API available at https://localhost:5001
```

## Deployment
- **Frontend**: AWS Amplify hosting at `www.codingeverest.com`
- **Backend**: EC2 instance (Coding Everest) for API
- **Domain**: Namecheap DNS configuration (see `DOMAIN_SETUP.md`)

## Domain Configuration
The application is configured to work with:
- `https://www.codingeverest.com` (Primary)
- `https://codingeverest.com`
- `http://www.codingeverest.com`
- `http://codingeverest.com`

See `DOMAIN_SETUP.md` for detailed DNS configuration instructions.

