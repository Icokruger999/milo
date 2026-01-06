# Milo Setup Guide

## Quick Start

### 1. View Landing Page Locally
```bash
# Option 1: Using http-server (if Node.js installed)
npm install
npm start

# Option 2: Using Python
python -m http.server 3000 -d frontend

# Option 3: Using VS Code Live Server extension
# Right-click on frontend/index.html > Open with Live Server
```

### 2. Run Backend API Locally
```bash
cd backend/Milo.API
dotnet restore
dotnet run
```

### 3. Connect to GitHub

#### Create Repository on GitHub
1. Go to https://github.com/new
2. Repository name: `Milo`
3. Choose public or private
4. **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click "Create repository"

#### Push to GitHub
```bash
# Add remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/Milo.git

# Or if using SSH
git remote add origin git@github.com:YOUR_USERNAME/Milo.git

# Stage and commit
git add .
git commit -m "Initial commit: Landing page and project structure"

# Push to GitHub
git branch -M main
git push -u origin main
```

### 4. Deploy to AWS Amplify

#### Using AWS Console (Recommended)
1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify)
2. Click "New app" > "Host web app"
3. Select "GitHub" as your source
4. Authorize GitHub if needed
5. Select repository: `Milo`
6. Select branch: `main`
7. Amplify will automatically detect `amplify.yml`
8. Review settings and click "Save and deploy"

#### Configure Custom Domain (www.codingeverest.com)
1. After initial deployment, go to App Settings → Domain Management
2. Click "Add domain"
3. Enter: `codingeverest.com`
4. Follow the DNS configuration instructions (see `DOMAIN_SETUP.md`)
5. Configure DNS records in Namecheap:
   - Add CNAME record: `www` → `xxxxx.amplifyapp.com`
   - Add ALIAS/A record for root domain
6. Amplify will automatically provision SSL certificate

#### Using AWS CLI
```bash
# Configure AWS CLI first
aws configure
# Enter Access Key: AKIASFECYFH62HKHHF5D
# Enter Secret Access Key
# Region: us-east-1 (or your preferred)

# Create Amplify app
aws amplify create-app \
  --name milo \
  --repository https://github.com/YOUR_USERNAME/Milo \
  --platform WEB \
  --environment-variables API_BASE_URL=https://your-ec2-instance.com/api
```

### 5. Connect to EC2 Instance

#### Update Backend Configuration
Edit `backend/Milo.API/appsettings.json`:
- Update `ConnectionStrings.DefaultConnection` with your EC2 database details
- Update `EC2.InstanceId` with your EC2 instance ID
- Update `EC2.Region` with your AWS region

#### Deploy Backend to EC2
```bash
# Build backend
cd backend/Milo.API
dotnet publish -c Release -o ./publish

# Copy to EC2 (replace with your details)
scp -r ./publish/* ec2-user@your-ec2-ip:/var/www/milo-api/

# SSH and start service
ssh ec2-user@your-ec2-ip
sudo systemctl start milo-api
```

## Project Structure
```
milo/
├── frontend/           # HTML, CSS, JavaScript
│   ├── index.html     # Landing page
│   ├── css/
│   └── js/
├── backend/            # C# ASP.NET Core API
│   └── Milo.API/
├── amplify.yml         # Amplify build configuration
└── README.md
```

## Next Steps
- [ ] Complete GitHub repository setup
- [ ] Deploy to AWS Amplify
- [ ] Configure EC2 connection
- [ ] Set up database
- [ ] Implement authentication
- [ ] Build project management features

