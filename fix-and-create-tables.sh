#!/bin/bash
set -e

echo "========================================="
echo "Fixing Connection String and Creating Tables"
echo "========================================="
echo ""

echo "1. Stopping API service..."
sudo systemctl stop milo-api
sleep 2
echo ""

echo "2. Deleting old appsettings.json..."
sudo rm -f /home/ec2-user/milo-backend-publish/appsettings.json
echo "Old file deleted"
echo ""

echo "3. Creating new appsettings.json with PgBouncer connection..."
cat > /tmp/appsettings.json << 'EOF'
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=6432;Database=milo;Username=postgres;Password=Milo_PgBouncer_2024!Secure#Key"
  },
  "Cors": {
    "AllowedOrigins": [
      "https://www.codingeverest.com",
      "https://codingeverest.com",
      "http://www.codingeverest.com",
      "http://codingeverest.com"
    ]
  },
  "EC2": {
    "InstanceId": "i-06bc5b2218c041802",
    "PublicIp": "34.246.3.141",
    "PrivateIp": "172.31.30.186",
    "Region": "eu-west-1"
  },
  "Email": {
    "SmtpHost": "mail.privateemail.com",
    "SmtpPort": "587",
    "SmtpUser": "info@streamyo.net",
    "SmtpPassword": "Stacey@1122",
    "FromEmail": "info@streamyo.net",
    "FromName": "Milo"
  }
}
EOF

sudo cp /tmp/appsettings.json /home/ec2-user/milo-backend-publish/appsettings.json
sudo chown ec2-user:ec2-user /home/ec2-user/milo-backend-publish/appsettings.json
echo "New appsettings.json created"
echo ""

echo "4. Verifying connection string..."
grep -A 1 "DefaultConnection" /home/ec2-user/milo-backend-publish/appsettings.json
echo ""

echo "5. Creating database tables manually..."
docker exec milo_postgres psql -U postgres -d milo << 'SQL'
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(100) NOT NULL,
    "Email" VARCHAR(255) NOT NULL,
    "PasswordHash" VARCHAR(255) NOT NULL,
    "RequiresPasswordChange" BOOLEAN NOT NULL DEFAULT FALSE,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS "IX_users_email" ON users ("Email");

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(500),
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(255) NOT NULL,
    "Description" VARCHAR(1000),
    "Key" VARCHAR(50),
    "Status" VARCHAR(50) NOT NULL,
    "OwnerId" INTEGER NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMPTZ,
    CONSTRAINT "FK_projects_users_owner_id" FOREIGN KEY ("OwnerId") 
        REFERENCES users ("Id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "IX_projects_key" ON projects ("Key");
CREATE INDEX IF NOT EXISTS "IX_projects_name" ON projects ("Name");

-- Create project_invitations table
CREATE TABLE IF NOT EXISTS project_invitations (
    "Id" SERIAL PRIMARY KEY,
    "ProjectId" INTEGER NOT NULL,
    "Email" VARCHAR(255) NOT NULL,
    "Name" VARCHAR(255),
    "Status" VARCHAR(50) NOT NULL,
    "Token" VARCHAR(100) NOT NULL,
    "InvitedById" INTEGER NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "AcceptedAt" TIMESTAMPTZ,
    "ExpiresAt" TIMESTAMPTZ,
    CONSTRAINT "FK_project_invitations_projects_project_id" FOREIGN KEY ("ProjectId") 
        REFERENCES projects ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_project_invitations_users_invited_by_id" FOREIGN KEY ("InvitedById") 
        REFERENCES users ("Id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "IX_project_invitations_email" ON project_invitations ("Email");
CREATE INDEX IF NOT EXISTS "IX_project_invitations_project_id" ON project_invitations ("ProjectId");
CREATE UNIQUE INDEX IF NOT EXISTS "IX_project_invitations_token" ON project_invitations ("Token");

-- Create project_members table
CREATE TABLE IF NOT EXISTS project_members (
    "Id" SERIAL PRIMARY KEY,
    "ProjectId" INTEGER NOT NULL,
    "UserId" INTEGER NOT NULL,
    "Role" VARCHAR(50) NOT NULL,
    "JoinedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_project_members_projects_project_id" FOREIGN KEY ("ProjectId") 
        REFERENCES projects ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_project_members_users_user_id" FOREIGN KEY ("UserId") 
        REFERENCES users ("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_project_members_project_id" ON project_members ("ProjectId");
CREATE INDEX IF NOT EXISTS "IX_project_members_user_id" ON project_members ("UserId");
CREATE UNIQUE INDEX IF NOT EXISTS "IX_project_members_project_id_user_id" ON project_members ("ProjectId", "UserId");

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    "Id" SERIAL PRIMARY KEY,
    "Title" VARCHAR(500) NOT NULL,
    "Description" VARCHAR(2000),
    "Status" VARCHAR(50) NOT NULL,
    "Label" VARCHAR(50),
    "TaskId" VARCHAR(20),
    "TaskType" VARCHAR(20) DEFAULT 'Task',
    "AssigneeId" INTEGER,
    "CreatorId" INTEGER,
    "ProductId" INTEGER,
    "ProjectId" INTEGER,
    "Priority" INTEGER NOT NULL DEFAULT 0,
    "DueDate" TIMESTAMPTZ,
    "StartDate" TIMESTAMPTZ,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMPTZ,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
    "ParentTaskId" INTEGER,
    "Checklist" TEXT,
    CONSTRAINT "FK_tasks_users_assignee_id" FOREIGN KEY ("AssigneeId") 
        REFERENCES users ("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_tasks_users_creator_id" FOREIGN KEY ("CreatorId") 
        REFERENCES users ("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_tasks_products_product_id" FOREIGN KEY ("ProductId") 
        REFERENCES products ("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_tasks_projects_project_id" FOREIGN KEY ("ProjectId") 
        REFERENCES projects ("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_tasks_parent_task_id" FOREIGN KEY ("ParentTaskId") 
        REFERENCES tasks ("Id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "IX_tasks_assignee_id" ON tasks ("AssigneeId");
CREATE INDEX IF NOT EXISTS "IX_tasks_creator_id" ON tasks ("CreatorId");
CREATE INDEX IF NOT EXISTS "IX_tasks_product_id" ON tasks ("ProductId");
CREATE INDEX IF NOT EXISTS "IX_tasks_project_id" ON tasks ("ProjectId");
CREATE INDEX IF NOT EXISTS "IX_tasks_status" ON tasks ("Status");
CREATE INDEX IF NOT EXISTS "IX_tasks_task_id" ON tasks ("TaskId");

-- Create roadmap_items table
CREATE TABLE IF NOT EXISTS roadmap_items (
    "Id" SERIAL PRIMARY KEY,
    "Title" VARCHAR(200) NOT NULL,
    "Description" VARCHAR(1000),
    "StartDate" TIMESTAMPTZ NOT NULL,
    "EndDate" TIMESTAMPTZ NOT NULL,
    "TargetDate" TIMESTAMPTZ,
    "Status" VARCHAR(50) NOT NULL,
    "Category" VARCHAR(50),
    "Priority" VARCHAR(50),
    "ProductId" INTEGER NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_roadmap_items_products_product_id" FOREIGN KEY ("ProductId") 
        REFERENCES products ("Id") ON DELETE CASCADE
);

-- Create timeline_events table
CREATE TABLE IF NOT EXISTS timeline_events (
    "Id" SERIAL PRIMARY KEY,
    "Title" VARCHAR(200) NOT NULL,
    "Description" VARCHAR(1000),
    "EventDate" TIMESTAMPTZ NOT NULL,
    "EventType" VARCHAR(50) NOT NULL,
    "ProductId" INTEGER NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_timeline_events_products_product_id" FOREIGN KEY ("ProductId") 
        REFERENCES products ("Id") ON DELETE CASCADE
);

-- Create labels table
CREATE TABLE IF NOT EXISTS labels (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(100) NOT NULL,
    "Color" VARCHAR(7),
    "Description" VARCHAR(500),
    "ProjectId" INTEGER,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMPTZ,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT "FK_labels_projects_project_id" FOREIGN KEY ("ProjectId") 
        REFERENCES projects ("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_labels_name" ON labels ("Name");
CREATE INDEX IF NOT EXISTS "IX_labels_project_id" ON labels ("ProjectId");

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(200) NOT NULL,
    "Description" VARCHAR(1000),
    "Avatar" VARCHAR(50),
    "ProjectId" INTEGER,
    "CreatedById" INTEGER NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMPTZ,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT "FK_teams_projects_project_id" FOREIGN KEY ("ProjectId") 
        REFERENCES projects ("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_teams_users_created_by_id" FOREIGN KEY ("CreatedById") 
        REFERENCES users ("Id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "IX_teams_name" ON teams ("Name");
CREATE INDEX IF NOT EXISTS "IX_teams_project_id" ON teams ("ProjectId");
CREATE INDEX IF NOT EXISTS "IX_teams_created_by_id" ON teams ("CreatedById");

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
    "Id" SERIAL PRIMARY KEY,
    "TeamId" INTEGER NOT NULL,
    "UserId" INTEGER NOT NULL,
    "Title" VARCHAR(100),
    "Role" VARCHAR(50) NOT NULL DEFAULT 'member',
    "JoinedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT "FK_team_members_teams_team_id" FOREIGN KEY ("TeamId") 
        REFERENCES teams ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_team_members_users_user_id" FOREIGN KEY ("UserId") 
        REFERENCES users ("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_team_members_team_id" ON team_members ("TeamId");
CREATE INDEX IF NOT EXISTS "IX_team_members_user_id" ON team_members ("UserId");
CREATE UNIQUE INDEX IF NOT EXISTS "IX_team_members_team_id_user_id" ON team_members ("TeamId", "UserId");

-- Create flakes table
CREATE TABLE IF NOT EXISTS flakes (
    "Id" SERIAL PRIMARY KEY,
    "Title" VARCHAR(500) NOT NULL,
    "Content" TEXT,
    "ProjectId" INTEGER,
    "AuthorId" INTEGER NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMPTZ,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT "FK_flakes_projects_project_id" FOREIGN KEY ("ProjectId") 
        REFERENCES projects ("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_flakes_users_author_id" FOREIGN KEY ("AuthorId") 
        REFERENCES users ("Id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "IX_flakes_project_id" ON flakes ("ProjectId");
CREATE INDEX IF NOT EXISTS "IX_flakes_author_id" ON flakes ("AuthorId");

-- Create task_comments table
CREATE TABLE IF NOT EXISTS task_comments (
    "Id" SERIAL PRIMARY KEY,
    "TaskId" INTEGER NOT NULL,
    "UserId" INTEGER NOT NULL,
    "Content" TEXT NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMPTZ,
    CONSTRAINT "FK_task_comments_tasks_task_id" FOREIGN KEY ("TaskId") 
        REFERENCES tasks ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_task_comments_users_user_id" FOREIGN KEY ("UserId") 
        REFERENCES users ("Id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "IX_task_comments_task_id" ON task_comments ("TaskId");
CREATE INDEX IF NOT EXISTS "IX_task_comments_user_id" ON task_comments ("UserId");

-- Create task_links table
CREATE TABLE IF NOT EXISTS task_links (
    "Id" SERIAL PRIMARY KEY,
    "SourceTaskId" INTEGER NOT NULL,
    "TargetTaskId" INTEGER NOT NULL,
    "LinkType" VARCHAR(50) NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_task_links_tasks_source_task_id" FOREIGN KEY ("SourceTaskId") 
        REFERENCES tasks ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_task_links_tasks_target_task_id" FOREIGN KEY ("TargetTaskId") 
        REFERENCES tasks ("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_task_links_source_task_id" ON task_links ("SourceTaskId");
CREATE INDEX IF NOT EXISTS "IX_task_links_target_task_id" ON task_links ("TargetTaskId");

-- Create incidents table
CREATE TABLE IF NOT EXISTS incidents (
    "Id" SERIAL PRIMARY KEY,
    "IncidentNumber" VARCHAR(50) NOT NULL,
    "Subject" VARCHAR(200) NOT NULL,
    "Description" TEXT,
    "RequesterId" INTEGER NOT NULL,
    "AgentId" INTEGER,
    "GroupId" INTEGER,
    "Department" VARCHAR(100),
    "Status" VARCHAR(50) NOT NULL DEFAULT 'New',
    "Priority" VARCHAR(50) NOT NULL DEFAULT 'Low',
    "Urgency" VARCHAR(50),
    "Impact" VARCHAR(50),
    "Source" VARCHAR(50),
    "Category" VARCHAR(100),
    "SubCategory" VARCHAR(100),
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMPTZ,
    "ResolvedAt" TIMESTAMPTZ,
    "ClosedAt" TIMESTAMPTZ,
    "PlannedStartDate" TIMESTAMPTZ,
    "PlannedEndDate" TIMESTAMPTZ,
    "PlannedEffort" VARCHAR(50),
    "FirstResponseDue" TIMESTAMPTZ,
    "ResolutionDue" TIMESTAMPTZ,
    "FirstResponseAt" TIMESTAMPTZ,
    "Tags" VARCHAR(500),
    "AssociatedAssets" TEXT,
    "ProjectId" INTEGER,
    "Attachments" TEXT,
    "Resolution" TEXT,
    CONSTRAINT "FK_incidents_incident_requesters_requester_id" FOREIGN KEY ("RequesterId") 
        REFERENCES incident_requesters ("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_incidents_incident_assignees_agent_id" FOREIGN KEY ("AgentId") 
        REFERENCES incident_assignees ("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_incidents_incident_groups_group_id" FOREIGN KEY ("GroupId") 
        REFERENCES incident_groups ("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_incidents_projects_project_id" FOREIGN KEY ("ProjectId") 
        REFERENCES projects ("Id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "IX_incidents_incident_number" ON incidents ("IncidentNumber");
CREATE INDEX IF NOT EXISTS "IX_incidents_status" ON incidents ("Status");
CREATE INDEX IF NOT EXISTS "IX_incidents_project_id" ON incidents ("ProjectId");

-- Create incident_assignees table
CREATE TABLE IF NOT EXISTS incident_assignees (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS "IX_incident_assignees_email" ON incident_assignees ("email");
CREATE INDEX IF NOT EXISTS "IX_incident_assignees_is_active" ON incident_assignees ("is_active");

-- Create incident_requesters table
CREATE TABLE IF NOT EXISTS incident_requesters (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS "IX_incident_requesters_email" ON incident_requesters ("email");
CREATE INDEX IF NOT EXISTS "IX_incident_requesters_is_active" ON incident_requesters ("is_active");

-- Create incident_groups table
CREATE TABLE IF NOT EXISTS incident_groups (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS "IX_incident_groups_name" ON incident_groups ("name");
CREATE INDEX IF NOT EXISTS "IX_incident_groups_is_active" ON incident_groups ("is_active");

-- Create report_recipients table
CREATE TABLE IF NOT EXISTS report_recipients (
    "Id" SERIAL PRIMARY KEY,
    "Email" VARCHAR(255) NOT NULL,
    "ProjectId" INTEGER,
    "ReportType" VARCHAR(50) NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_report_recipients_projects_project_id" FOREIGN KEY ("ProjectId") 
        REFERENCES projects ("Id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "IX_report_recipients_email" ON report_recipients ("Email");
CREATE INDEX IF NOT EXISTS "IX_report_recipients_project_id" ON report_recipients ("ProjectId");
CREATE INDEX IF NOT EXISTS "IX_report_recipients_is_active" ON report_recipients ("IsActive");

-- Create EF Migrations History table
CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" VARCHAR(150) NOT NULL PRIMARY KEY,
    "ProductVersion" VARCHAR(32) NOT NULL
);

-- Insert migration records
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion") VALUES
('InitialCreate', '8.0.0'),
('AddLabels', '8.0.0'),
('AddFlakesTable', '8.0.0'),
('AddTeamsAndTeamMembers', '8.0.0')
ON CONFLICT ("MigrationId") DO NOTHING;

SQL

echo "Tables created successfully!"
echo ""

echo "6. Verifying tables were created..."
TABLE_COUNT=$(docker exec milo_postgres psql -U postgres -d milo -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name NOT LIKE '__%';" | tr -d ' ')
echo "Total tables created: $TABLE_COUNT"
echo ""

echo "7. Starting API service..."
sudo systemctl start milo-api
sleep 10
echo ""

echo "8. Checking service status..."
sudo systemctl status milo-api --no-pager | head -15
echo ""

echo "9. Testing API health..."
curl -s http://localhost:5001/api/health || echo "API not responding yet"
echo ""

echo "========================================="
echo "Setup Complete!"
echo "========================================="
