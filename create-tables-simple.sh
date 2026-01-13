#!/bin/bash
set -e

echo "========================================="
echo "Creating Tables - Direct Execution"
echo "========================================="
echo ""

# Stop API
echo "1. Stopping API..."
sudo systemctl stop milo-api 2>/dev/null || true
sleep 2

# Delete and recreate appsettings.json
echo "2. Updating appsettings.json..."
sudo rm -f /home/ec2-user/milo-backend-publish/appsettings.json
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
echo "appsettings.json updated"
echo ""

# Create tables using individual commands
echo "3. Creating tables (this may take a minute)..."
docker exec milo_postgres psql -U postgres -d milo -c "CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, email VARCHAR(255) NOT NULL, password_hash VARCHAR(255) NOT NULL, requires_password_change BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), is_active BOOLEAN NOT NULL DEFAULT TRUE);" 2>&1
docker exec milo_postgres psql -U postgres -d milo -c "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email);" 2>&1

docker exec milo_postgres psql -U postgres -d milo -c "CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, description VARCHAR(500), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());" 2>&1

docker exec milo_postgres psql -U postgres -d milo -c "CREATE TABLE IF NOT EXISTS projects (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, description VARCHAR(1000), key VARCHAR(50), status VARCHAR(50) NOT NULL, owner_id INTEGER NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ, CONSTRAINT fk_projects_users_owner_id FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE RESTRICT);" 2>&1
docker exec milo_postgres psql -U postgres -d milo -c "CREATE INDEX IF NOT EXISTS ix_projects_key ON projects (key);" 2>&1
docker exec milo_postgres psql -U postgres -d milo -c "CREATE INDEX IF NOT EXISTS ix_projects_name ON projects (name);" 2>&1

docker exec milo_postgres psql -U postgres -d milo -c "CREATE TABLE IF NOT EXISTS project_invitations (\"Id\" SERIAL PRIMARY KEY, \"ProjectId\" INTEGER NOT NULL, \"Email\" VARCHAR(255) NOT NULL, \"Name\" VARCHAR(255), \"Status\" VARCHAR(50) NOT NULL, \"Token\" VARCHAR(100) NOT NULL, \"InvitedById\" INTEGER NOT NULL, \"CreatedAt\" TIMESTAMPTZ NOT NULL DEFAULT NOW(), \"AcceptedAt\" TIMESTAMPTZ, \"ExpiresAt\" TIMESTAMPTZ, CONSTRAINT \"FK_project_invitations_projects_project_id\" FOREIGN KEY (\"ProjectId\") REFERENCES projects (\"Id\") ON DELETE CASCADE, CONSTRAINT \"FK_project_invitations_users_invited_by_id\" FOREIGN KEY (\"InvitedById\") REFERENCES users (\"Id\") ON DELETE RESTRICT);" 2>&1

docker exec milo_postgres psql -U postgres -d milo -c "CREATE TABLE IF NOT EXISTS project_members (\"Id\" SERIAL PRIMARY KEY, \"ProjectId\" INTEGER NOT NULL, \"UserId\" INTEGER NOT NULL, \"Role\" VARCHAR(50) NOT NULL, \"JoinedAt\" TIMESTAMPTZ NOT NULL DEFAULT NOW(), CONSTRAINT \"FK_project_members_projects_project_id\" FOREIGN KEY (\"ProjectId\") REFERENCES projects (\"Id\") ON DELETE CASCADE, CONSTRAINT \"FK_project_members_users_user_id\" FOREIGN KEY (\"UserId\") REFERENCES users (\"Id\") ON DELETE CASCADE);" 2>&1
docker exec milo_postgres psql -U postgres -d milo -c "CREATE UNIQUE INDEX IF NOT EXISTS \"IX_project_members_project_id_user_id\" ON project_members (\"ProjectId\", \"UserId\");" 2>&1

docker exec milo_postgres psql -U postgres -d milo -c "CREATE TABLE IF NOT EXISTS tasks (\"Id\" SERIAL PRIMARY KEY, \"Title\" VARCHAR(500) NOT NULL, \"Description\" VARCHAR(2000), \"Status\" VARCHAR(50) NOT NULL, \"Label\" VARCHAR(50), \"TaskId\" VARCHAR(20), \"TaskType\" VARCHAR(20) DEFAULT 'Task', \"AssigneeId\" INTEGER, \"CreatorId\" INTEGER, \"ProductId\" INTEGER, \"ProjectId\" INTEGER, \"Priority\" INTEGER NOT NULL DEFAULT 0, \"DueDate\" TIMESTAMPTZ, \"StartDate\" TIMESTAMPTZ, \"CreatedAt\" TIMESTAMPTZ NOT NULL DEFAULT NOW(), \"UpdatedAt\" TIMESTAMPTZ, \"IsDeleted\" BOOLEAN NOT NULL DEFAULT FALSE, \"ParentTaskId\" INTEGER, \"Checklist\" TEXT, CONSTRAINT \"FK_tasks_users_assignee_id\" FOREIGN KEY (\"AssigneeId\") REFERENCES users (\"Id\") ON DELETE SET NULL, CONSTRAINT \"FK_tasks_users_creator_id\" FOREIGN KEY (\"CreatorId\") REFERENCES users (\"Id\") ON DELETE SET NULL, CONSTRAINT \"FK_tasks_products_product_id\" FOREIGN KEY (\"ProductId\") REFERENCES products (\"Id\") ON DELETE SET NULL, CONSTRAINT \"FK_tasks_projects_project_id\" FOREIGN KEY (\"ProjectId\") REFERENCES projects (\"Id\") ON DELETE SET NULL, CONSTRAINT \"FK_tasks_parent_task_id\" FOREIGN KEY (\"ParentTaskId\") REFERENCES tasks (\"Id\") ON DELETE SET NULL);" 2>&1

docker exec milo_postgres psql -U postgres -d milo -c "CREATE TABLE IF NOT EXISTS labels (\"Id\" SERIAL PRIMARY KEY, \"Name\" VARCHAR(100) NOT NULL, \"Color\" VARCHAR(7), \"Description\" VARCHAR(500), \"ProjectId\" INTEGER, \"CreatedAt\" TIMESTAMPTZ NOT NULL DEFAULT NOW(), \"UpdatedAt\" TIMESTAMPTZ, \"IsDeleted\" BOOLEAN NOT NULL DEFAULT FALSE, CONSTRAINT \"FK_labels_projects_project_id\" FOREIGN KEY (\"ProjectId\") REFERENCES projects (\"Id\") ON DELETE CASCADE);" 2>&1

docker exec milo_postgres psql -U postgres -d milo -c "CREATE TABLE IF NOT EXISTS teams (\"Id\" SERIAL PRIMARY KEY, \"Name\" VARCHAR(200) NOT NULL, \"Description\" VARCHAR(1000), \"Avatar\" VARCHAR(50), \"ProjectId\" INTEGER, \"CreatedById\" INTEGER NOT NULL, \"CreatedAt\" TIMESTAMPTZ NOT NULL DEFAULT NOW(), \"UpdatedAt\" TIMESTAMPTZ, \"IsDeleted\" BOOLEAN NOT NULL DEFAULT FALSE, CONSTRAINT \"FK_teams_projects_project_id\" FOREIGN KEY (\"ProjectId\") REFERENCES projects (\"Id\") ON DELETE SET NULL, CONSTRAINT \"FK_teams_users_created_by_id\" FOREIGN KEY (\"CreatedById\") REFERENCES users (\"Id\") ON DELETE RESTRICT);" 2>&1

docker exec milo_postgres psql -U postgres -d milo -c "CREATE TABLE IF NOT EXISTS team_members (\"Id\" SERIAL PRIMARY KEY, \"TeamId\" INTEGER NOT NULL, \"UserId\" INTEGER NOT NULL, \"Title\" VARCHAR(100), \"Role\" VARCHAR(50) NOT NULL DEFAULT 'member', \"JoinedAt\" TIMESTAMPTZ NOT NULL DEFAULT NOW(), \"IsActive\" BOOLEAN NOT NULL DEFAULT TRUE, CONSTRAINT \"FK_team_members_teams_team_id\" FOREIGN KEY (\"TeamId\") REFERENCES teams (\"Id\") ON DELETE CASCADE, CONSTRAINT \"FK_team_members_users_user_id\" FOREIGN KEY (\"UserId\") REFERENCES users (\"Id\") ON DELETE CASCADE);" 2>&1

docker exec milo_postgres psql -U postgres -d milo -c "CREATE TABLE IF NOT EXISTS flakes (\"Id\" SERIAL PRIMARY KEY, \"Title\" VARCHAR(500) NOT NULL, \"Content\" TEXT, \"ProjectId\" INTEGER, \"AuthorId\" INTEGER NOT NULL, \"CreatedAt\" TIMESTAMPTZ NOT NULL DEFAULT NOW(), \"UpdatedAt\" TIMESTAMPTZ, \"IsDeleted\" BOOLEAN NOT NULL DEFAULT FALSE, CONSTRAINT \"FK_flakes_projects_project_id\" FOREIGN KEY (\"ProjectId\") REFERENCES projects (\"Id\") ON DELETE SET NULL, CONSTRAINT \"FK_flakes_users_author_id\" FOREIGN KEY (\"AuthorId\") REFERENCES users (\"Id\") ON DELETE RESTRICT);" 2>&1

docker exec milo_postgres psql -U postgres -d milo -c "CREATE TABLE IF NOT EXISTS task_comments (\"Id\" SERIAL PRIMARY KEY, \"TaskId\" INTEGER NOT NULL, \"UserId\" INTEGER NOT NULL, \"Content\" TEXT NOT NULL, \"CreatedAt\" TIMESTAMPTZ NOT NULL DEFAULT NOW(), \"UpdatedAt\" TIMESTAMPTZ, CONSTRAINT \"FK_task_comments_tasks_task_id\" FOREIGN KEY (\"TaskId\") REFERENCES tasks (\"Id\") ON DELETE CASCADE, CONSTRAINT \"FK_task_comments_users_user_id\" FOREIGN KEY (\"UserId\") REFERENCES users (\"Id\") ON DELETE RESTRICT);" 2>&1

docker exec milo_postgres psql -U postgres -d milo -c "CREATE TABLE IF NOT EXISTS task_links (\"Id\" SERIAL PRIMARY KEY, \"SourceTaskId\" INTEGER NOT NULL, \"TargetTaskId\" INTEGER NOT NULL, \"LinkType\" VARCHAR(50) NOT NULL, \"CreatedAt\" TIMESTAMPTZ NOT NULL DEFAULT NOW(), CONSTRAINT \"FK_task_links_tasks_source_task_id\" FOREIGN KEY (\"SourceTaskId\") REFERENCES tasks (\"Id\") ON DELETE CASCADE, CONSTRAINT \"FK_task_links_tasks_target_task_id\" FOREIGN KEY (\"TargetTaskId\") REFERENCES tasks (\"Id\") ON DELETE CASCADE);" 2>&1

docker exec milo_postgres psql -U postgres -d milo -c "CREATE TABLE IF NOT EXISTS incident_assignees (\"id\" SERIAL PRIMARY KEY, \"name\" VARCHAR(255) NOT NULL, \"email\" VARCHAR(255) NOT NULL, \"created_at\" TIMESTAMPTZ NOT NULL DEFAULT NOW(), \"updated_at\" TIMESTAMPTZ, \"is_active\" BOOLEAN NOT NULL DEFAULT TRUE);" 2>&1

docker exec milo_postgres psql -U postgres -d milo -c "CREATE TABLE IF NOT EXISTS incident_requesters (\"id\" SERIAL PRIMARY KEY, \"name\" VARCHAR(255) NOT NULL, \"email\" VARCHAR(255) NOT NULL, \"created_at\" TIMESTAMPTZ NOT NULL DEFAULT NOW(), \"updated_at\" TIMESTAMPTZ, \"is_active\" BOOLEAN NOT NULL DEFAULT TRUE);" 2>&1

docker exec milo_postgres psql -U postgres -d milo -c "CREATE TABLE IF NOT EXISTS incident_groups (\"id\" SERIAL PRIMARY KEY, \"name\" VARCHAR(255) NOT NULL, \"description\" TEXT, \"created_at\" TIMESTAMPTZ NOT NULL DEFAULT NOW(), \"updated_at\" TIMESTAMPTZ, \"is_active\" BOOLEAN NOT NULL DEFAULT TRUE);" 2>&1

docker exec milo_postgres psql -U postgres -d milo -c "CREATE TABLE IF NOT EXISTS incidents (\"Id\" SERIAL PRIMARY KEY, \"IncidentNumber\" VARCHAR(50) NOT NULL, \"Subject\" VARCHAR(200) NOT NULL, \"Description\" TEXT, \"RequesterId\" INTEGER NOT NULL, \"AgentId\" INTEGER, \"GroupId\" INTEGER, \"Department\" VARCHAR(100), \"Status\" VARCHAR(50) NOT NULL DEFAULT 'New', \"Priority\" VARCHAR(50) NOT NULL DEFAULT 'Low', \"Urgency\" VARCHAR(50), \"Impact\" VARCHAR(50), \"Source\" VARCHAR(50), \"Category\" VARCHAR(100), \"SubCategory\" VARCHAR(100), \"CreatedAt\" TIMESTAMPTZ NOT NULL DEFAULT NOW(), \"UpdatedAt\" TIMESTAMPTZ, \"ResolvedAt\" TIMESTAMPTZ, \"ClosedAt\" TIMESTAMPTZ, \"PlannedStartDate\" TIMESTAMPTZ, \"PlannedEndDate\" TIMESTAMPTZ, \"PlannedEffort\" VARCHAR(50), \"FirstResponseDue\" TIMESTAMPTZ, \"ResolutionDue\" TIMESTAMPTZ, \"FirstResponseAt\" TIMESTAMPTZ, \"Tags\" VARCHAR(500), \"AssociatedAssets\" TEXT, \"ProjectId\" INTEGER, \"Attachments\" TEXT, \"Resolution\" TEXT, CONSTRAINT \"FK_incidents_incident_requesters_requester_id\" FOREIGN KEY (\"RequesterId\") REFERENCES incident_requesters (\"id\") ON DELETE RESTRICT, CONSTRAINT \"FK_incidents_incident_assignees_agent_id\" FOREIGN KEY (\"AgentId\") REFERENCES incident_assignees (\"id\") ON DELETE SET NULL, CONSTRAINT \"FK_incidents_incident_groups_group_id\" FOREIGN KEY (\"GroupId\") REFERENCES incident_groups (\"id\") ON DELETE SET NULL, CONSTRAINT \"FK_incidents_projects_project_id\" FOREIGN KEY (\"ProjectId\") REFERENCES projects (\"Id\") ON DELETE SET NULL);" 2>&1

docker exec milo_postgres psql -U postgres -d milo -c "CREATE TABLE IF NOT EXISTS report_recipients (\"Id\" SERIAL PRIMARY KEY, \"Email\" VARCHAR(255) NOT NULL, \"ProjectId\" INTEGER, \"ReportType\" VARCHAR(50) NOT NULL, \"IsActive\" BOOLEAN NOT NULL DEFAULT TRUE, \"CreatedAt\" TIMESTAMPTZ NOT NULL DEFAULT NOW(), CONSTRAINT \"FK_report_recipients_projects_project_id\" FOREIGN KEY (\"ProjectId\") REFERENCES projects (\"Id\") ON DELETE SET NULL);" 2>&1

docker exec milo_postgres psql -U postgres -d milo -c "CREATE TABLE IF NOT EXISTS roadmap_items (\"Id\" SERIAL PRIMARY KEY, \"Title\" VARCHAR(200) NOT NULL, \"Description\" VARCHAR(1000), \"StartDate\" TIMESTAMPTZ NOT NULL, \"EndDate\" TIMESTAMPTZ NOT NULL, \"TargetDate\" TIMESTAMPTZ, \"Status\" VARCHAR(50) NOT NULL, \"Category\" VARCHAR(50), \"Priority\" VARCHAR(50), \"ProductId\" INTEGER NOT NULL, \"CreatedAt\" TIMESTAMPTZ NOT NULL DEFAULT NOW(), CONSTRAINT \"FK_roadmap_items_products_product_id\" FOREIGN KEY (\"ProductId\") REFERENCES products (\"Id\") ON DELETE CASCADE);" 2>&1

docker exec milo_postgres psql -U postgres -d milo -c "CREATE TABLE IF NOT EXISTS timeline_events (\"Id\" SERIAL PRIMARY KEY, \"Title\" VARCHAR(200) NOT NULL, \"Description\" VARCHAR(1000), \"EventDate\" TIMESTAMPTZ NOT NULL, \"EventType\" VARCHAR(50) NOT NULL, \"ProductId\" INTEGER NOT NULL, \"CreatedAt\" TIMESTAMPTZ NOT NULL DEFAULT NOW(), CONSTRAINT \"FK_timeline_events_products_product_id\" FOREIGN KEY (\"ProductId\") REFERENCES products (\"Id\") ON DELETE CASCADE);" 2>&1

# Create migration history
docker exec milo_postgres psql -U postgres -d milo -c "CREATE TABLE IF NOT EXISTS \"__EFMigrationsHistory\" (\"MigrationId\" VARCHAR(150) NOT NULL PRIMARY KEY, \"ProductVersion\" VARCHAR(32) NOT NULL);" 2>&1
docker exec milo_postgres psql -U postgres -d milo -c "INSERT INTO \"__EFMigrationsHistory\" (\"MigrationId\", \"ProductVersion\") VALUES ('InitialCreate', '8.0.0'), ('AddLabels', '8.0.0'), ('AddFlakesTable', '8.0.0'), ('AddTeamsAndTeamMembers', '8.0.0') ON CONFLICT (\"MigrationId\") DO NOTHING;" 2>&1

echo ""
echo "4. Verifying tables..."
TABLE_COUNT=$(docker exec milo_postgres psql -U postgres -d milo -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name NOT LIKE '__%';" 2>&1 | tr -d ' ' | head -1)
echo "Total tables: $TABLE_COUNT"
echo ""

echo "5. Starting API service..."
sudo systemctl start milo-api
sleep 15
echo ""

echo "6. Service status:"
sudo systemctl status milo-api --no-pager | head -10
echo ""

echo "========================================="
echo "Complete!"
echo "========================================="
