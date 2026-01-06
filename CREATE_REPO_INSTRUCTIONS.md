# Create GitHub Repository - Quick Guide

## Step-by-Step Instructions

### 1. Create the Repository

**Click this link to create the repository:**
👉 **https://github.com/new**

**Fill in the form:**
- **Owner**: `Icokruger999` (should be pre-selected)
- **Repository name**: `Milo`
- **Description**: `Jira-type project management application`
- **Visibility**: Choose **Public** or **Private** (your choice)
- **IMPORTANT**: Leave these UNCHECKED:
  - ❌ Add a README file
  - ❌ Add .gitignore  
  - ❌ Choose a license

**Click the green "Create repository" button**

### 2. After Creating, Come Back Here

Once you've created the repository, run this command to push your code:

```powershell
git push -u origin main
```

**If prompted for credentials:**
- **Username**: `Icokruger999`
- **Password**: You'll need a [Personal Access Token](https://github.com/settings/tokens)
  - Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
  - Generate new token (classic)
  - Select scope: `repo` (full control of private repositories)
  - Copy the token and use it as your password

### 3. Verify

After pushing, visit: **https://github.com/Icokruger999/Milo**

You should see all your files there!

---

## Alternative: Use the Script

You can also run:
```powershell
.\create-and-push-repo.ps1
```

This will guide you through the process interactively.

