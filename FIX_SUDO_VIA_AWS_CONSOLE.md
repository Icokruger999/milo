# Fix Sudo via AWS Console - Step by Step

## The Problem
- `sudo` is broken (wrong permissions)
- Can't use `sudo` to fix `sudo` (circular dependency)
- Regular user can't fix system files

## Solution: Use AWS Systems Manager Run Command

SSM Run Command runs as **root** by default, so we can fix sudo without needing sudo.

## Steps in AWS Console

1. **Go to AWS Console → Systems Manager → Run Command**

2. **Click "Run command"**

3. **Select Document:** `AWS-RunShellScript`

4. **Command parameters:**
   - **Commands:** (paste these one per line)
     ```
     chown root:root /usr/bin/sudo
     chmod 4755 /usr/bin/sudo
     ls -l /usr/bin/sudo
     ```

5. **Targets:**
   - Select: **Specify instance IDs**
   - Enter: `i-06bc5b2218c041802`

6. **Click "Run"**

7. **Wait for completion** (should take 10-30 seconds)

8. **Check output:**
   - Should show: `-rwsr-xr-x 1 root root` (note the 's')

## Verify Fix

After the command completes, go back to Session Manager and test:

```bash
sudo whoami
```

Should return: `root`

## Then Restart Backend

```bash
sudo systemctl restart milo-api
sudo systemctl status milo-api
curl http://localhost:5001/api/health
```

## Alternative: Use EC2 Instance Connect

If your instance supports EC2 Instance Connect:

1. Go to EC2 Console → Select instance
2. Click "Connect" → "EC2 Instance Connect"
3. This may give you root access or different permissions
4. Try: `chown root:root /usr/bin/sudo && chmod 4755 /usr/bin/sudo`

## If Nothing Works

Contact AWS Support or consider:
- Creating a new EC2 instance
- Using a different AMI
- Restoring from a backup/snapshot

