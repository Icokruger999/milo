# Fix Git Pull Conflict on EC2

You have local changes that conflict with the incoming changes. Here are the commands to fix it:

## Option 1: Stash Local Changes (Safest - Keeps Your Changes)

```bash
cd /home/ec2-user/milo-repo
git stash
git pull origin main
```

If you need your stashed changes later, you can restore them with:
```bash
git stash pop
```

## Option 2: Discard Local Changes (If You Don't Need Them)

```bash
cd /home/ec2-user/milo-repo
git reset --hard HEAD
git pull origin main
```

**⚠️ Warning:** This will permanently delete your local changes!

## Option 3: Force Pull (Overwrite Local Changes)

```bash
cd /home/ec2-user/milo-repo
git fetch origin
git reset --hard origin/main
```

## Recommended: Use Option 1 (Stash)

Since you're deploying from GitHub, the local changes are likely just old versions. Stash them, then pull:

```bash
cd /home/ec2-user/milo-repo
git stash
git pull origin main
cd backend/Milo.API
export HOME=/home/ec2-user
export DOTNET_CLI_HOME=/home/ec2-user/.dotnet
dotnet restore
dotnet publish -c Release -o /var/www/milo-api
sudo systemctl restart milo-api
```

