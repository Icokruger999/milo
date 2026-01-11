# Supabase Milo Database Setup

## New Supabase Project Details
- **Project URL**: https://ffrtlelsqhnxjfwwnazf.supabase.co
- **Project Reference**: ffrtlelsqhnxjfwwnazf
- **Database Host**: db.ffrtlelsqhnxjfwwnazf.supabase.co
- **Service Role Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmcnRsZWxzcWhueGpmd3duYXpmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODEzNDc2OSwiZXhwIjoyMDgzNzEwNzY5fQ.D0rzamjQ90JUTIUg_ipB0xBkinB6Fm9yrVJCBsBb0g4
- **Publishable Key**: sb_publishable_mkNb299thxA-xbYP1aM1ag_LUdHSVKx

## Connection String Template
```
Host=db.ffrtlelsqhnxjfwwnazf.supabase.co;Database=postgres;Username=postgres;Password=YOUR_PASSWORD;Port=5432;SSL Mode=Require
```

## Next Steps

1. **Get Database Password:**
   - Go to: https://ffrtlelsqhnxjfwwnazf.supabase.co
   - Navigate to **Settings** → **Database**
   - Find your database password in the **Connection string** section

2. **Update appsettings.json:**
   - Replace `YOUR_DATABASE_PASSWORD` with your actual database password

3. **Deploy Backend:**
   - EF Core migrations will automatically create all tables on startup
   - All tables defined in `MiloDbContext` will be created with proper indexes

## Tables That Will Be Created

The following tables will be automatically created by EF Core migrations:
- Users
- Tasks
- Products
- Projects
- ProjectMembers
- ProjectInvitations
- Labels
- TaskComments
- TaskLinks
- Flakes
- Teams
- TeamMembers
- Incidents
- ReportRecipients
- IncidentAssignees
- IncidentRequesters
- IncidentGroups
- RoadmapItems
- TimelineEvents

All tables will include:
- Proper indexes for performance
- Foreign key relationships
- Required constraints
