# Fix Sudo Permissions - CRITICAL

## The Problem
```
sudo: /usr/bin/sudo must be owned by uid 0 and have the setuid bit set
```

The `sudo` executable has incorrect permissions, preventing all administrative commands.

## Solution: Fix via AWS Systems Manager Run Command

Since `sudo` is broken, we need to use AWS SSM Run Command with root privileges to fix it.

### Option 1: Use SSM Run Command (Recommended)

Run this via AWS Console → Systems Manager → Run Command:

**Document:** `AWS-RunShellScript`  
**Command:**
```bash
chown root:root /usr/bin/sudo
chmod 4755 /usr/bin/sudo
ls -l /usr/bin/sudo
```

This will:
1. Set ownership to root:root
2. Set permissions to 4755 (setuid bit + rwxr-xr-x)
3. Verify the fix

### Option 2: Use EC2 Instance Connect (if available)

If your instance supports EC2 Instance Connect, you can connect and run:
```bash
sudo chown root:root /usr/bin/sudo
sudo chmod 4755 /usr/bin/sudo
```

But if sudo is broken, this won't work - use Option 1 instead.

### Option 3: Use Root User via SSM

If you can access root directly:
```bash
chown root:root /usr/bin/sudo
chmod 4755 /usr/bin/sudo
```

## After Fixing Sudo

Once sudo is fixed, you can then:

1. **Check backend status:**
   ```bash
   sudo systemctl status milo-api
   ```

2. **Restart backend:**
   ```bash
   sudo systemctl restart milo-api
   ```

3. **Check if backend responds:**
   ```bash
   curl http://localhost:5001/api/health
   ```

## Why This Happened

This usually occurs when:
- File permissions were accidentally changed
- A script ran `chmod` or `chown` incorrectly
- System update went wrong

## Prevention

After fixing, ensure scripts don't modify system binaries:
- Never run `chmod` or `chown` on `/usr/bin/sudo`
- Be careful with recursive permission changes
- Test scripts in a safe environment first

