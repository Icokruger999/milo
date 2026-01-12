# Deploy Backend to EC2 via SSM and Connect to Supabase

## Status

✅ **Database**: Tables created in Supabase  
✅ **Connection String**: Configured in `appsettings.json`  
✅ **Deployment Script**: Ready to use  
✅ **Files Deployed**: Backend files are on EC2  

## Quick Deploy Command

```powershell
.\deploy-to-ec2-ssm.ps1
```

This will:
1. Build the .NET application
2. Package it with `appsettings.json` (includes Supabase connection string)
3. Upload to S3
4. Deploy to EC2 via SSM
5. Start the API service (connects to Supabase automatically)

## How It Connects to Supabase

The `appsettings.json` file (already in your project) contains:
```json
"ConnectionStrings": {
  "DefaultConnection": "Host=db.ffrtlelsqhnxjfwwnazf.supabase.co;Database=milo;Username=postgres;Password=FlVT6=Lps0E!l5cg;Port=5432;SSL Mode=Require"
}
```

When the API starts on EC2:
- Reads `appsettings.json` from `/var/www/milo-api/`
- Connects to Supabase using the connection string
- Runs migrations (tables already exist, so it skips)
- Ready to serve requests!

## Verification

After deployment, verify the service is running:

```powershell
.\check-api-status.ps1
```

Or test the API:
```powershell
Invoke-WebRequest -Uri "https://api.codingeverest.com/api/health" -UseBasicParsing
```

## Files

- `deploy-to-ec2-ssm.ps1` - Main deployment script
- `check-api-status.ps1` - Check service status and logs
- `verify-deployment.ps1` - Verify files are deployed

## Next Steps

1. Run `.\deploy-to-ec2-ssm.ps1`
2. Wait for deployment to complete
3. Visit `https://www.codingeverest.com`
4. Frontend will connect to backend API
5. Backend API connects to Supabase automatically

Everything is configured! Just deploy! 🚀
