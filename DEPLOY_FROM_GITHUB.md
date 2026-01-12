# Deploy from GitHub (Recommended Approach)

You're absolutely right! If your code is in GitHub, we should deploy from there. This is the **recommended approach**.

## Why Deploy from GitHub?

✅ **Version Control** - Always deploy from a known commit/branch  
✅ **Standard Practice** - Industry standard CI/CD approach  
✅ **Easy Updates** - Just push to GitHub and redeploy  
✅ **No Local Build** - Build happens on the server  
✅ **Trackable** - Know exactly what version is deployed  

## Quick Deploy Command

```powershell
.\deploy-from-github-ssm.ps1
```

The script will:
1. Ask for your GitHub repository (or pass it as parameter)
2. Use SSM to connect to EC2
3. Clone/pull from GitHub
4. Build the application on EC2
5. Deploy and start the service
6. Connect to Supabase automatically (using appsettings.json from GitHub)

## Usage

### Option 1: Interactive (Recommended)
```powershell
.\deploy-from-github-ssm.ps1
```
It will ask for your GitHub repository URL.

### Option 2: With Parameters
```powershell
.\deploy-from-github-ssm.ps1 -GitHubRepo "username/Milo" -Branch "main"
```

Or with full URL:
```powershell
.\deploy-from-github-ssm.ps1 -GitHubRepo "https://github.com/username/Milo.git"
```

## How It Works

1. **SSM connects to EC2** - No SSH needed
2. **Clones from GitHub** - Gets latest code from your branch
3. **Builds on EC2** - Uses .NET SDK on the server
4. **Deploys** - Copies built files to `/var/www/milo-api`
5. **Starts service** - systemd service starts the API
6. **Connects to Supabase** - Uses connection string from appsettings.json in your repo

## Workflow

**To update your application:**
1. Make changes to your code
2. Commit and push to GitHub:
   ```powershell
   git add .
   git commit -m "Your changes"
   git push origin main
   ```
3. Deploy:
   ```powershell
   .\deploy-from-github-ssm.ps1
   ```

That's it! The script pulls from GitHub and deploys.

## Requirements

- ✅ GitHub repository (public or private - if private, EC2 needs SSH key or token)
- ✅ EC2 instance with SSM agent
- ✅ EC2 instance can access GitHub (internet access)
- ✅ .NET SDK will be installed on EC2 if not present

## Private Repositories

If your repository is private, you have two options:

1. **Use SSH Key** (recommended):
   - Add SSH key to EC2 instance
   - Use SSH URL: `git@github.com:username/Milo.git`

2. **Use Personal Access Token**:
   - Create GitHub Personal Access Token
   - Use HTTPS URL: `https://YOUR_TOKEN@github.com/username/Milo.git`
   - Store token securely (not in script!)

## Comparison

| Approach | Pros | Cons |
|----------|------|------|
| **GitHub (Recommended)** | Version controlled, standard, easy updates | Requires GitHub access from EC2 |
| **S3 (Current)** | No GitHub needed, works offline | Manual, not version controlled, builds locally |

## Next Steps

1. Make sure your code is in GitHub
2. Run: `.\deploy-from-github-ssm.ps1`
3. Enter your GitHub repository when prompted
4. Wait for deployment to complete
5. Visit `https://www.codingeverest.com`

---

**This is the right approach!** 🎯 GitHub-based deployment is the standard way to deploy applications.
