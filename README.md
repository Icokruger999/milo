# Milo - Project Management Application

A modern project management application built with C#, JavaScript, HTML, and CSS.

**Live Site**: [www.codingeverest.com](https://www.codingeverest.com)

## Project Structure

- `backend/` - C# ASP.NET Core API
- `frontend/` - HTML, CSS, JavaScript client
- `amplify.yml` - AWS Amplify build configuration

## Production Deployment

### Prerequisites
- **.NET SDK 8.0** (needed to BUILD the application - run `dotnet publish` to create deployable files)
- **AWS CLI** configured
- **EC2 Instance** with .NET Runtime 8.0 installed (needed to RUN the application on the server)

### Why .NET is Needed

**On your Windows machine (for building):**
- `.NET SDK` is needed to compile the C# code into a deployable application
- You run: `dotnet publish` which creates the files that get deployed

**On EC2 server (for running):**
- `.NET Runtime` is needed to execute the compiled application
- The server runs: `dotnet Milo.API.dll` to start the API

**Think of it like:**
- SDK = Compiler (builds the app) - needed locally
- Runtime = Engine (runs the app) - needed on EC2 server

## Deployment
- **Frontend**: AWS Amplify hosting at `www.codingeverest.com`
- **Backend**: EC2 instance (Coding Everest) for API
- **Domain**: Namecheap DNS configuration (see `DOMAIN_SETUP.md`)

## Quick Start - Deploy to Production

**See `NEXT_STEPS.md` for complete deployment instructions.**

Quick commands:
```powershell
# 1. Open port 5000
.\add-port-5000.ps1

# 2. Deploy backend
.\deploy-to-ec2.ps1

# 3. Test API
curl http://34.246.3.141:5000/api/health
```

## Domain Configuration
The application is configured to work with:
- `https://www.codingeverest.com` (Primary)
- `https://codingeverest.com`
- `http://www.codingeverest.com`
- `http://codingeverest.com`

See `DOMAIN_SETUP.md` for detailed DNS configuration instructions.

