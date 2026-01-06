# AWS Amplify Setup Instructions

## Prerequisites
- AWS CLI installed and configured
- AWS Access Key ID: AKIASFECYFH62HKHHF5D
- AWS Secret Access Key (you'll need to provide this)
- GitHub account with repository access

## Steps to Deploy

### 1. Create GitHub Repository
```bash
# Add remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/Milo.git

# Stage all files
git add .

# Commit
git commit -m "Initial commit: Landing page and project structure"

# Push to GitHub
git branch -M main
git push -u origin main
```

### 2. Configure AWS CLI
```bash
aws configure
# Enter your Access Key ID: AKIASFECYFH62HKHHF5D
# Enter your Secret Access Key
# Default region: us-east-1 (or your preferred region)
# Default output format: json
```

### 3. Create Amplify App
```bash
# Install Amplify CLI if not already installed
npm install -g @aws-amplify/cli

# Initialize Amplify (if needed)
amplify init

# Or create app via AWS Console:
# 1. Go to AWS Amplify Console
# 2. Click "New app" > "Host web app"
# 3. Connect to GitHub repository "Milo"
# 4. Select branch "main"
# 5. Build settings will use amplify.yml automatically
```

### 4. Connect to EC2 Instance (Coding Everest)
The backend API will need to connect to your EC2 instance. Update the following:

1. **EC2 Connection Details**: Update `backend/Milo.API/appsettings.json` with your EC2 instance details
2. **Environment Variables**: Set in Amplify Console under App settings > Environment variables

### 5. Environment Variables for Amplify
Set these in the Amplify Console:
- `API_BASE_URL`: Your EC2 instance API endpoint
- `AWS_REGION`: Your AWS region
- `EC2_INSTANCE_ID`: Your EC2 instance ID (if needed)

## Build Configuration
The `amplify.yml` file is already configured to:
- Serve static files from the `frontend/` directory
- No build step required for HTML/CSS/JS
- Deploy all files in the frontend directory

## Backend Deployment
The C# backend should be deployed separately to your EC2 instance. See `backend/README.md` for deployment instructions.

