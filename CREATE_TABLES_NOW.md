# Create Tables in Supabase Milo Database

## Connection Details
- **Host**: db.ffrtlelsqhnxjfwwnazf.supabase.co
- **Database**: postgres (default Supabase database)
- **Username**: postgres
- **Port**: 5432
- **SSL**: Required

## To Create Tables

### Option 1: Automatic via EF Core Migrations (Recommended)

1. **Get your database password:**
   - Go to: https://ffrtlelsqhnxjfwwnazf.supabase.co
   - Navigate to **Settings** → **Database**
   - Copy your database password from the connection string

2. **Update appsettings.json:**
   - Replace `YOUR_DATABASE_PASSWORD` with your actual password

3. **Deploy backend:**
   - EF Core migrations will automatically run on startup
   - All tables will be created with proper indexes

### Option 2: Manual SQL (if needed)

If you want to create tables manually, the migrations are in:
- `backend/Milo.API/Migrations/InitialCreate.cs`
- `backend/Milo.API/Migrations/AddFlakesTable.cs`
- `backend/Milo.API/Migrations/AddLabels.cs`
- `backend/Milo.API/Migrations/AddTeamsAndTeamMembers.cs`

## Tables That Will Be Created

All tables from `MiloDbContext`:
- Users
- Tasks (with indexes for performance)
- Products
- Projects (with indexes)
- ProjectMembers
- ProjectInvitations
- Labels
- TaskComments
- TaskLinks
- Flakes
- Teams
- TeamMembers
- Incidents (with comprehensive indexes)
- ReportRecipients
- IncidentAssignees
- IncidentRequesters
- IncidentGroups
- RoadmapItems
- TimelineEvents

All tables include:
- Primary keys
- Foreign key relationships
- Performance indexes
- Required constraints
