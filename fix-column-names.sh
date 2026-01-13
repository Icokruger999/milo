#!/bin/bash
# Fix column names: Drop and recreate tables with lowercase columns

echo "========================================="
echo "Fixing database column names..."
echo "========================================="
echo ""

# Drop all tables (in reverse dependency order)
echo "1. Dropping existing tables..."
docker exec milo_postgres psql -U postgres -d milo -c "
DROP TABLE IF EXISTS task_links CASCADE;
DROP TABLE IF EXISTS task_comments CASCADE;
DROP TABLE IF EXISTS flakes CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS labels CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS project_members CASCADE;
DROP TABLE IF EXISTS project_invitations CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS incident_assignees CASCADE;
DROP TABLE IF EXISTS incident_requesters CASCADE;
DROP TABLE IF EXISTS incident_groups CASCADE;
DROP TABLE IF EXISTS report_recipients CASCADE;
DROP TABLE IF EXISTS roadmap_items CASCADE;
DROP TABLE IF EXISTS timeline_events CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;
" 2>&1

echo ""
echo "2. Recreating tables with lowercase columns..."
echo ""

# Create users table
docker exec milo_postgres psql -U postgres -d milo -c "
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    requires_password_change BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE UNIQUE INDEX ix_users_email ON users (email);
" 2>&1

# Create products table
docker exec milo_postgres psql -U postgres -d milo -c "
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
" 2>&1

# Create projects table
docker exec milo_postgres psql -U postgres -d milo -c "
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    key VARCHAR(50),
    status VARCHAR(50) NOT NULL,
    owner_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    CONSTRAINT fk_projects_users_owner_id FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE RESTRICT
);
CREATE INDEX ix_projects_key ON projects (key);
CREATE INDEX ix_projects_name ON projects (name);
CREATE INDEX ix_projects_owner_id ON projects (owner_id);
CREATE INDEX ix_projects_status ON projects (status);
" 2>&1

# Create project_invitations table
docker exec milo_postgres psql -U postgres -d milo -c "
CREATE TABLE project_invitations (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    token VARCHAR(100) NOT NULL,
    invited_by_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    CONSTRAINT fk_project_invitations_projects_project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
    CONSTRAINT fk_project_invitations_users_invited_by_id FOREIGN KEY (invited_by_id) REFERENCES users (id) ON DELETE RESTRICT
);
" 2>&1

# Create project_members table
docker exec milo_postgres psql -U postgres -d milo -c "
CREATE TABLE project_members (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role VARCHAR(50) NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_project_members_projects_project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
    CONSTRAINT fk_project_members_users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX ix_project_members_project_id_user_id ON project_members (project_id, user_id);
" 2>&1

# Create tasks table
docker exec milo_postgres psql -U postgres -d milo -c "
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description VARCHAR(2000),
    status VARCHAR(50) NOT NULL,
    label VARCHAR(50),
    task_id VARCHAR(20),
    task_type VARCHAR(20) DEFAULT 'Task',
    assignee_id INTEGER,
    creator_id INTEGER,
    product_id INTEGER,
    project_id INTEGER,
    priority INTEGER NOT NULL DEFAULT 0,
    due_date TIMESTAMPTZ,
    start_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    parent_task_id INTEGER,
    checklist TEXT,
    CONSTRAINT fk_tasks_users_assignee_id FOREIGN KEY (assignee_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_tasks_users_creator_id FOREIGN KEY (creator_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_tasks_products_product_id FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL,
    CONSTRAINT fk_tasks_projects_project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL,
    CONSTRAINT fk_tasks_tasks_parent_task_id FOREIGN KEY (parent_task_id) REFERENCES tasks (id) ON DELETE SET NULL
);
" 2>&1

# Create labels table
docker exec milo_postgres psql -U postgres -d milo -c "
CREATE TABLE labels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7),
    description VARCHAR(500),
    project_id INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_labels_projects_project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
);
" 2>&1

# Create teams table
docker exec milo_postgres psql -U postgres -d milo -c "
CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description VARCHAR(1000),
    avatar VARCHAR(50),
    project_id INTEGER,
    created_by_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_teams_projects_project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL,
    CONSTRAINT fk_teams_users_created_by_id FOREIGN KEY (created_by_id) REFERENCES users (id) ON DELETE RESTRICT
);
" 2>&1

# Create team_members table
docker exec milo_postgres psql -U postgres -d milo -c "
CREATE TABLE team_members (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    title VARCHAR(100),
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_team_members_teams_team_id FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
    CONSTRAINT fk_team_members_users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
" 2>&1

# Create flakes table
docker exec milo_postgres psql -U postgres -d milo -c "
CREATE TABLE flakes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT,
    project_id INTEGER,
    author_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_flakes_projects_project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL,
    CONSTRAINT fk_flakes_users_author_id FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE RESTRICT
);
" 2>&1

# Create task_comments table
docker exec milo_postgres psql -U postgres -d milo -c "
CREATE TABLE task_comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    CONSTRAINT fk_task_comments_tasks_task_id FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
    CONSTRAINT fk_task_comments_users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
);
" 2>&1

# Create task_links table
docker exec milo_postgres psql -U postgres -d milo -c "
CREATE TABLE task_links (
    id SERIAL PRIMARY KEY,
    source_task_id INTEGER NOT NULL,
    target_task_id INTEGER NOT NULL,
    link_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_task_links_tasks_source_task_id FOREIGN KEY (source_task_id) REFERENCES tasks (id) ON DELETE CASCADE,
    CONSTRAINT fk_task_links_tasks_target_task_id FOREIGN KEY (target_task_id) REFERENCES tasks (id) ON DELETE CASCADE
);
" 2>&1

# Create incident tables
docker exec milo_postgres psql -U postgres -d milo -c "
CREATE TABLE incident_assignees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);
" 2>&1

docker exec milo_postgres psql -U postgres -d milo -c "
CREATE TABLE incident_requesters (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);
" 2>&1

docker exec milo_postgres psql -U postgres -d milo -c "
CREATE TABLE incident_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);
" 2>&1

docker exec milo_postgres psql -U postgres -d milo -c "
CREATE TABLE incidents (
    id SERIAL PRIMARY KEY,
    incident_number VARCHAR(50) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    description TEXT,
    requester_id INTEGER NOT NULL,
    agent_id INTEGER,
    group_id INTEGER,
    department VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'New',
    priority VARCHAR(50) NOT NULL DEFAULT 'Low',
    urgency VARCHAR(50),
    impact VARCHAR(50),
    source VARCHAR(50),
    category VARCHAR(100),
    sub_category VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    planned_start_date TIMESTAMPTZ,
    planned_end_date TIMESTAMPTZ,
    planned_effort VARCHAR(50),
    first_response_due TIMESTAMPTZ,
    resolution_due TIMESTAMPTZ,
    first_response_at TIMESTAMPTZ,
    tags VARCHAR(500),
    associated_assets TEXT,
    project_id INTEGER,
    attachments TEXT,
    resolution TEXT,
    CONSTRAINT fk_incidents_incident_requesters_requester_id FOREIGN KEY (requester_id) REFERENCES incident_requesters (id) ON DELETE RESTRICT,
    CONSTRAINT fk_incidents_incident_assignees_agent_id FOREIGN KEY (agent_id) REFERENCES incident_assignees (id) ON DELETE SET NULL,
    CONSTRAINT fk_incidents_incident_groups_group_id FOREIGN KEY (group_id) REFERENCES incident_groups (id) ON DELETE SET NULL,
    CONSTRAINT fk_incidents_projects_project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL
);
" 2>&1

# Create report_recipients table
docker exec milo_postgres psql -U postgres -d milo -c "
CREATE TABLE report_recipients (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    project_id INTEGER,
    report_type VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_report_recipients_projects_project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL
);
" 2>&1

# Create roadmap_items table
docker exec milo_postgres psql -U postgres -d milo -c "
CREATE TABLE roadmap_items (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description VARCHAR(1000),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    target_date TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL,
    category VARCHAR(50),
    priority VARCHAR(50),
    product_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_roadmap_items_products_product_id FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
);
" 2>&1

# Create timeline_events table
docker exec milo_postgres psql -U postgres -d milo -c "
CREATE TABLE timeline_events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description VARCHAR(1000),
    event_date TIMESTAMPTZ NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    product_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_timeline_events_products_product_id FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
);
" 2>&1

echo ""
echo "3. Verifying tables..."
docker exec milo_postgres psql -U postgres -d milo -c "\dt" 2>&1

echo ""
echo "4. Verifying column names in projects table..."
docker exec milo_postgres psql -U postgres -d milo -c "\d projects" 2>&1

echo ""
echo "========================================="
echo "Tables recreated with lowercase columns!"
echo "========================================="
