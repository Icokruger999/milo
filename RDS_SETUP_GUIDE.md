# RDS Setup Guide for Milo

## Overview

Milo now uses **AWS RDS PostgreSQL** for persistent data storage. All user data, tasks, products, roadmaps, and timelines are stored in the database.

## Database Configuration

### 1. Update Connection String

Edit `backend/Milo.API/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=YOUR_RDS_ENDPOINT;Database=MiloDB;Username=YOUR_USERNAME;Password=YOUR_PASSWORD;Port=5432"
  }
}
```

**Example:**
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=milo-db.xxxxx.us-east-1.rds.amazonaws.com;Database=MiloDB;Username=postgres;Password=YourSecurePassword123;Port=5432"
  }
}
```

### 2. Database Models

The following tables are automatically created:
- **Users** - User accounts and authentication
- **Tasks** - Board tasks with assignees, products, status
- **Products** - Product definitions
- **RoadmapItems** - Product roadmap features
- **TimelineEvents** - Product timeline milestones

### 3. Database Initialization

The database is automatically created on first run using `EnsureCreated()`. For production, use migrations:

```bash
# On EC2 or local development machine
cd backend/Milo.API
dotnet ef migrations add InitialCreate
dotnet ef database update
```

## Features Implemented

### ✅ Database Integration
- Entity Framework Core with PostgreSQL
- Automatic database creation
- User authentication with database
- Task management with RDS
- Product management
- Roadmap and Timeline data

### ✅ Email Notifications
- Task assignment emails sent automatically
- Welcome emails on signup
- Temporary password emails

### ✅ Frontend Updates
- Modal forms instead of prompts
- Navigation between Board, Roadmap, Timeline
- Product selection in task creation
- User assignment in task creation

## API Endpoints

### Tasks
- `GET /api/tasks` - Get all tasks (with optional filters)
- `POST /api/tasks` - Create new task (sends email to assignee)
- `PUT /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create product
- `PUT /api/products/{id}` - Update product

### Roadmap
- `GET /api/roadmap` - Get roadmap items
- `POST /api/roadmap` - Create roadmap item
- `PUT /api/roadmap/{id}` - Update roadmap item

### Timeline
- `GET /api/timeline` - Get timeline events
- `POST /api/timeline` - Create timeline event
- `PUT /api/timeline/{id}` - Update timeline event

### Users
- `GET /api/auth/users` - Get all users (for assignment dropdowns)

## Next Steps

1. **Configure RDS Connection String** in `appsettings.json`
2. **Deploy Backend** to EC2
3. **Test Database Connection** - API will create tables automatically
4. **Create Initial Products** via API or frontend
5. **Start Creating Tasks** - emails will be sent automatically

## Security Notes

⚠️ **Important:** Currently passwords are stored in plain text. For production:
- Implement password hashing (BCrypt, Argon2, etc.)
- Use JWT tokens instead of GUID tokens
- Add proper authentication middleware
- Implement role-based access control

## Troubleshooting

**Database connection fails:**
- Check RDS security group allows connections from EC2
- Verify connection string format
- Ensure database exists and user has permissions

**Tables not created:**
- Check application logs for errors
- Verify Entity Framework is configured correctly
- Manually run migrations if needed

