# RDS Connection String Configuration

## Update appsettings.json

Replace the connection string in `backend/Milo.API/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=YOUR_RDS_ENDPOINT;Database=MiloDB;Username=YOUR_USERNAME;Password=YOUR_PASSWORD;Port=5432"
  }
}
```

## Example Connection Strings

### AWS RDS PostgreSQL
```
Host=milo-db.xxxxx.us-east-1.rds.amazonaws.com;Database=MiloDB;Username=postgres;Password=YourSecurePassword123;Port=5432
```

### Local PostgreSQL (for testing)
```
Host=localhost;Database=MiloDB;Username=postgres;Password=postgres;Port=5432
```

## Security Group Configuration

Ensure your RDS security group allows inbound connections from your EC2 instance:
- **Type:** PostgreSQL
- **Port:** 5432
- **Source:** EC2 Security Group ID or EC2 Private IP

## Database Creation

The database will be automatically created on first run. If you need to create it manually:

```sql
CREATE DATABASE "MiloDB";
```

## Tables Created Automatically

- Users
- Tasks
- Products
- RoadmapItems
- TimelineEvents

All tables are created automatically using Entity Framework's `EnsureCreated()` method.

