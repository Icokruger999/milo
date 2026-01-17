# Deploy SubProjects Feature - Step by Step

## Prerequisites
- Backend code updated with SubProject and Department models
- Frontend code updated to use API endpoints
- Database connection working (PgBouncer on port 6432)

## Deployment Steps

### Step 1: Rebuild Backend DLL

On your local machine:
```bash
cd backend/Milo.API
dotnet build -c Release
```

This creates the updated DLL with SubProject and Department models.

### Step 2: Deploy DLL to EC2

Copy the DLL to the EC2 instance:
```bash
# From your local machine
scp -i your-key.pem backend/Milo.API/bin/Release/net8.0/Milo.API.dll ec2-user@your-ec2-ip:/home/ec2-user/milo-backend-publish/
```

Or use AWS Systems Manager Session Manager:
```bash
# Upload via S3 or direct copy
aws s3 cp backend/Milo.API/bin/Release/net8.0/Milo.API.dll s3://your-bucket/milo-api.dll
```

### Step 3: Run Database Migration

SSH into EC2 instance:
```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
```

Run the migration:
```bash
cd /home/ec2-user/milo-backend-publish
dotnet Milo.API.dll --migrate
```

Or manually run the migration using a migration runner:
```bash
# If you have a migration runner
dotnet MigrationRunner.dll
```

### Step 4: Restart Backend Service

```bash
sudo systemctl restart milo-backend
```

Verify it's running:
```bash
sudo systemctl status milo-backend
```

### Step 5: Deploy Frontend

Commit and push frontend changes to GitHub:
```bash
git add frontend/milo-board.html
git commit -m "feat: integrate SubProjects API with timeline"
git push origin main
```

Amplify will automatically deploy the frontend changes.

### Step 6: Verify Deployment

1. **Check Backend API**
   ```bash
   curl http://localhost:8080/api/departments?projectId=1
   curl http://localhost:8080/api/subprojects?projectId=1
   ```

2. **Check Frontend**
   - Navigate to Timeline view
   - Should load departments and sub-projects from API
   - Create a new sub-project and verify it appears in the database

3. **Check Database**
   ```bash
   psql -h localhost -p 6432 -U postgres -d milo
   SELECT * FROM departments;
   SELECT * FROM sub_projects;
   ```

## Troubleshooting

### API Returns 404
- Verify controllers are compiled in the DLL
- Check that the DLL was properly deployed
- Restart the backend service

### Database Migration Fails
- Check that PgBouncer is running: `sudo systemctl status pgbouncer`
- Verify database connection: `psql -h localhost -p 6432 -U postgres -d milo`
- Check migration logs for specific errors

### Frontend Shows Empty Timeline
- Check browser console for API errors
- Verify backend is running: `curl http://localhost:8080/api/projects`
- Check that projects exist in the database

### Sub-Projects Not Saving
- Check browser console for API errors
- Verify backend service is running
- Check backend logs: `sudo journalctl -u milo-backend -f`

## Rollback Plan

If something goes wrong:

1. **Restore Previous DLL**
   ```bash
   # Copy the previous working DLL back
   cp /home/ec2-user/milo-backend-publish.backup/Milo.API.dll /home/ec2-user/milo-backend-publish/
   sudo systemctl restart milo-backend
   ```

2. **Revert Frontend**
   - Revert the commit in GitHub
   - Amplify will automatically redeploy the previous version

3. **Rollback Database**
   - If migration fails, the database should remain unchanged
   - If you need to rollback, restore from backup

## Verification Checklist

- [ ] Backend service is running
- [ ] API endpoints respond correctly
- [ ] Database tables created (departments, sub_projects)
- [ ] Frontend loads without errors
- [ ] Can create a new department
- [ ] Can create a new sub-project
- [ ] Sub-projects appear in timeline
- [ ] Can drag sub-projects onto timeline
- [ ] Can delete sub-projects
- [ ] Data persists after page refresh

## Performance Notes

- Departments and sub-projects are loaded once per timeline view
- Indexes are created on ProjectId and DepartmentId for fast queries
- Consider caching if you have many sub-projects (>1000)

## Security Notes

- All API endpoints should be protected with authentication
- Verify user has access to the project before returning data
- Validate all input data on the backend
- Use parameterized queries to prevent SQL injection

## Support

If you encounter issues:
1. Check the backend logs: `sudo journalctl -u milo-backend -f`
2. Check the browser console for frontend errors
3. Verify database connectivity: `psql -h localhost -p 6432 -U postgres -d milo`
4. Review the API response status codes
