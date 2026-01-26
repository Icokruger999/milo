# ⚡ QUICK DEPLOYMENT REFERENCE

## 🚀 Backend Deployment (No DB Changes)

```powershell
# 1. Validate
.\scripts\pre-deploy-validate.ps1

# 2. Commit & Push
git add . && git commit -m "message" && git push

# 3. Deploy on EC2
cd /home/ec2-user && \
git clone https://github.com/YOUR_REPO/milo.git temp-milo && \
cd temp-milo/milo/backend/Milo.API && \
dotnet publish -c Release -o publish && \
cp -rf publish/* /home/ec2-user/milo-backend-publish/ && \
sudo systemctl restart milo-backend

# 4. Test
.\scripts\post-deploy-test.ps1

# 5. User refresh (Ctrl+Shift+R)
```

---

## 🗄️ Backend Deployment (WITH DB Changes)

```powershell
# 1. Verify column DOESN'T exist
.\scripts\verify-database-column.ps1 -TableName "tasks" -ColumnName "new_column"

# 2. Create & apply migration SQL
# ALTER TABLE tasks ADD COLUMN new_column INTEGER;

# 3. Verify column NOW exists
.\scripts\verify-database-column.ps1 -TableName "tasks" -ColumnName "new_column"

# 4. Add code that uses column

# 5. Validate
.\scripts\pre-deploy-validate.ps1

# 6. Commit & Push
git add . && git commit -m "message" && git push

# 7. Deploy on EC2 (same as above)

# 8. Test
.\scripts\post-deploy-test.ps1 -TestEndpoint "/tasks?projectId=1"

# 9. User refresh (Ctrl+Shift+R)
```

---

## 🎨 Frontend Deployment

```powershell
# 1. Commit & Push
git add . && git commit -m "message" && git push

# 2. Wait 2-3 minutes for Amplify

# 3. User clear cache (Ctrl+Shift+R)
```

---

## 🚨 NEVER DO THIS

- ❌ Touch appsettings.json
- ❌ Touch nginx configs
- ❌ Delete production files
- ❌ Add code before database column
- ❌ Deploy without testing
- ❌ Skip validation scripts

---

## ✅ ALWAYS DO THIS

- ✅ Run pre-deploy-validate.ps1
- ✅ Database changes BEFORE code
- ✅ Run post-deploy-test.ps1
- ✅ Test endpoints after deploy
- ✅ Get user confirmation

---

## 🆘 Emergency Rollback

```bash
# On EC2
sudo systemctl stop milo-backend
cp /path/to/backup/Milo.API.dll /home/ec2-user/milo-backend-publish/
sudo systemctl start milo-backend
curl http://localhost:8080/api/health
```

---

## 📞 Quick Commands

```bash
# Check service
sudo systemctl status milo-backend --no-pager

# Check logs
sudo journalctl -u milo-backend -n 50

# Test health
curl http://localhost:8080/api/health

# Test endpoint
curl http://localhost:8080/api/tasks?projectId=1 | head -100

# Restart service
sudo systemctl restart milo-backend
```

---

## 📚 Full Documentation

- **DEPLOYMENT_RULES.md** - Golden rules
- **PRE_DEPLOYMENT_CHECKLIST.md** - Full checklist
- **DEPLOYMENT_SAFETY_SYSTEM.md** - Complete system overview
- **scripts/README.md** - Script usage guide
