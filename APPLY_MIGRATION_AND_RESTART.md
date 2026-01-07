# Apply Migration and Restart Backend

## Quick Steps

### 1. SSH into EC2
```bash
ssh -i your-key.pem ec2-user@34.246.3.141
```

### 2. Navigate to Backend Directory
```bash
cd ~/milo/backend/Milo.API
# or wherever the backend is deployed
```

### 3. Create Migration (if not done)
```bash
dotnet ef migrations add AddTaskTypeAndRelationships --output-dir Data/Migrations
```

### 4. Apply Migration
The backend automatically applies migrations on startup, OR manually:
```bash
dotnet ef database update
```

### 5. Restart Backend Service
```bash
sudo systemctl restart milo-api.service
sudo systemctl status milo-api.service
```

### 6. Verify Backend is Running
```bash
curl http://localhost:5001/api/health
curl http://api.codingeverest.com/api/health
```

## Alternative: Use SSM (if available)

```bash
aws ssm send-command \
  --instance-ids i-06bc5b2218c041802 \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["cd ~/milo/backend/Milo.API && dotnet ef database update && sudo systemctl restart milo-api.service"]' \
  --region us-east-1
```

## What the Migration Adds

- **TaskType** column: Epic, Task, Bug, Story
- **StartDate** column: For roadmap timeline
- **ParentTaskId** column: For epic/task relationships
- **TaskLinks** table: For linked tasks

## Expected Result

After migration and restart:
- Backend responds to `/api/health`
- Tasks API includes `taskType`, `startDate`, `parentTaskId` fields
- Roadmap can filter by Epic/Task/Bug
- Tasks can be linked and organized in hierarchies

