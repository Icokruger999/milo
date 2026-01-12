-- ============================================
-- SQL Script to Create All Tables in Supabase
-- Generated from Entity Framework Migrations
-- ============================================
-- 
-- IMPORTANT NOTES:
-- 1. Run this AFTER creating the 'milo' database (use delete-astutetech-create-milo.sql first)
-- 2. Make sure you're connected to the 'milo' database (not 'postgres')
-- 3. Entity Framework uses __EFMigrationsHistory to track migrations
--    If you run this SQL manually, EF will think no migrations ran
-- 4. RECOMMENDED: Use the API's automatic migration feature instead
--    (Just start the API and it will create tables automatically)
--
-- ============================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Create Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS "Users" (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(100) NOT NULL,
    "Email" VARCHAR(255) NOT NULL,
    "PasswordHash" BYTEA NOT NULL,
    "PasswordSalt" BYTEA NOT NULL,
    "RequiresPasswordChange" BOOLEAN NOT NULL DEFAULT FALSE,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS "IX_Users_Email" ON "Users" ("Email");

-- ============================================
-- Create Products Table
-- ============================================
CREATE TABLE IF NOT EXISTS "Products" (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(500),
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "IX_Products_Name" ON "Products" ("Name");

-- ============================================
-- Create Projects Table
-- ============================================
CREATE TABLE IF NOT EXISTS "Projects" (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(255) NOT NULL,
    "Description" VARCHAR(1000),
    "Key" VARCHAR(50),
    "Status" VARCHAR(50) NOT NULL,
    "OwnerId" INTEGER NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMPTZ,
    CONSTRAINT "FK_Projects_Users_OwnerId" FOREIGN KEY ("OwnerId") 
        REFERENCES "Users" ("Id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "IX_Projects_Key" ON "Projects" ("Key");
CREATE INDEX IF NOT EXISTS "IX_Projects_Name" ON "Projects" ("Name");
CREATE INDEX IF NOT EXISTS "IX_Projects_OwnerId" ON "Projects" ("OwnerId");
CREATE INDEX IF NOT EXISTS "IX_Projects_Status" ON "Projects" ("Status");
CREATE INDEX IF NOT EXISTS "IX_Projects_CreatedAt" ON "Projects" ("CreatedAt");
CREATE INDEX IF NOT EXISTS "IX_Projects_Status_CreatedAt" ON "Projects" ("Status", "CreatedAt");
CREATE INDEX IF NOT EXISTS "IX_Projects_OwnerId_Status" ON "Projects" ("OwnerId", "Status");
CREATE INDEX IF NOT EXISTS "IX_Projects_Status_Name" ON "Projects" ("Status", "Name");

-- ============================================
-- Create ProjectInvitations Table
-- ============================================
CREATE TABLE IF NOT EXISTS "ProjectInvitations" (
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
    CONSTRAINT "FK_ProjectInvitations_Projects_ProjectId" FOREIGN KEY ("ProjectId") 
        REFERENCES "Projects" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_ProjectInvitations_Users_InvitedById" FOREIGN KEY ("InvitedById") 
        REFERENCES "Users" ("Id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "IX_ProjectInvitations_Email" ON "ProjectInvitations" ("Email");
CREATE INDEX IF NOT EXISTS "IX_ProjectInvitations_ProjectId" ON "ProjectInvitations" ("ProjectId");
CREATE UNIQUE INDEX IF NOT EXISTS "IX_ProjectInvitations_Token" ON "ProjectInvitations" ("Token");
CREATE INDEX IF NOT EXISTS "IX_ProjectInvitations_InvitedById" ON "ProjectInvitations" ("InvitedById");

-- ============================================
-- Create ProjectMembers Table
-- ============================================
CREATE TABLE IF NOT EXISTS "ProjectMembers" (
    "Id" SERIAL PRIMARY KEY,
    "ProjectId" INTEGER NOT NULL,
    "UserId" INTEGER NOT NULL,
    "Role" VARCHAR(50) NOT NULL,
    "JoinedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_ProjectMembers_Projects_ProjectId" FOREIGN KEY ("ProjectId") 
        REFERENCES "Projects" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_ProjectMembers_Users_UserId" FOREIGN KEY ("UserId") 
        REFERENCES "Users" ("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_ProjectMembers_ProjectId" ON "ProjectMembers" ("ProjectId");
CREATE INDEX IF NOT EXISTS "IX_ProjectMembers_UserId" ON "ProjectMembers" ("UserId");
CREATE UNIQUE INDEX IF NOT EXISTS "IX_ProjectMembers_ProjectId_UserId" ON "ProjectMembers" ("ProjectId", "UserId");

-- ============================================
-- Create Tasks Table
-- ============================================
CREATE TABLE IF NOT EXISTS "Tasks" (
    "Id" SERIAL PRIMARY KEY,
    "Title" VARCHAR(500) NOT NULL,
    "Description" VARCHAR(2000),
    "Status" VARCHAR(50) NOT NULL,
    "Label" VARCHAR(50),
    "TaskId" VARCHAR(20),
    "AssigneeId" INTEGER,
    "CreatorId" INTEGER,
    "ProductId" INTEGER,
    "ProjectId" INTEGER,
    "Priority" INTEGER NOT NULL DEFAULT 0,
    "DueDate" TIMESTAMPTZ,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMPTZ,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
    "ParentTaskId" INTEGER,
    CONSTRAINT "FK_Tasks_Users_AssigneeId" FOREIGN KEY ("AssigneeId") 
        REFERENCES "Users" ("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_Tasks_Users_CreatorId" FOREIGN KEY ("CreatorId") 
        REFERENCES "Users" ("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_Tasks_Products_ProductId" FOREIGN KEY ("ProductId") 
        REFERENCES "Products" ("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_Tasks_Projects_ProjectId" FOREIGN KEY ("ProjectId") 
        REFERENCES "Projects" ("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_Tasks_Tasks_ParentTaskId" FOREIGN KEY ("ParentTaskId") 
        REFERENCES "Tasks" ("Id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "IX_Tasks_TaskId" ON "Tasks" ("TaskId");
CREATE INDEX IF NOT EXISTS "IX_Tasks_Status" ON "Tasks" ("Status");
CREATE INDEX IF NOT EXISTS "IX_Tasks_AssigneeId" ON "Tasks" ("AssigneeId");
CREATE INDEX IF NOT EXISTS "IX_Tasks_CreatorId" ON "Tasks" ("CreatorId");
CREATE INDEX IF NOT EXISTS "IX_Tasks_ProductId" ON "Tasks" ("ProductId");
CREATE INDEX IF NOT EXISTS "IX_Tasks_ProjectId" ON "Tasks" ("ProjectId");
CREATE INDEX IF NOT EXISTS "IX_Tasks_ParentTaskId" ON "Tasks" ("ParentTaskId");
CREATE INDEX IF NOT EXISTS "IX_Tasks_CreatedAt" ON "Tasks" ("CreatedAt");
CREATE INDEX IF NOT EXISTS "IX_Tasks_ProjectId_Status" ON "Tasks" ("ProjectId", "Status");
CREATE INDEX IF NOT EXISTS "IX_Tasks_ProjectId_CreatedAt" ON "Tasks" ("ProjectId", "CreatedAt");
CREATE INDEX IF NOT EXISTS "IX_Tasks_Status_ProjectId_CreatedAt" ON "Tasks" ("Status", "ProjectId", "CreatedAt");
CREATE INDEX IF NOT EXISTS "IX_Tasks_AssigneeId_Status" ON "Tasks" ("AssigneeId", "Status");
CREATE INDEX IF NOT EXISTS "IX_Tasks_ProjectId_AssigneeId_Status" ON "Tasks" ("ProjectId", "AssigneeId", "Status");

-- ============================================
-- Create RoadmapItems Table
-- ============================================
CREATE TABLE IF NOT EXISTS "RoadmapItems" (
    "Id" SERIAL PRIMARY KEY,
    "Title" VARCHAR(200) NOT NULL,
    "Description" VARCHAR(1000),
    "StartDate" TIMESTAMPTZ NOT NULL,
    "EndDate" TIMESTAMPTZ NOT NULL,
    "Status" VARCHAR(50) NOT NULL,
    "ProductId" INTEGER NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_RoadmapItems_Products_ProductId" FOREIGN KEY ("ProductId") 
        REFERENCES "Products" ("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_RoadmapItems_ProductId" ON "RoadmapItems" ("ProductId");
CREATE INDEX IF NOT EXISTS "IX_RoadmapItems_Status" ON "RoadmapItems" ("Status");

-- ============================================
-- Create TimelineEvents Table
-- ============================================
CREATE TABLE IF NOT EXISTS "TimelineEvents" (
    "Id" SERIAL PRIMARY KEY,
    "Title" VARCHAR(200) NOT NULL,
    "Description" VARCHAR(1000),
    "EventDate" TIMESTAMPTZ NOT NULL,
    "EventType" VARCHAR(50) NOT NULL,
    "ProductId" INTEGER NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_TimelineEvents_Products_ProductId" FOREIGN KEY ("ProductId") 
        REFERENCES "Products" ("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_TimelineEvents_ProductId" ON "TimelineEvents" ("ProductId");
CREATE INDEX IF NOT EXISTS "IX_TimelineEvents_EventDate" ON "TimelineEvents" ("EventDate");

-- ============================================
-- Create Labels Table
-- ============================================
CREATE TABLE IF NOT EXISTS "Labels" (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(100) NOT NULL,
    "Color" VARCHAR(7),
    "Description" VARCHAR(500),
    "ProjectId" INTEGER,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMPTZ,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT "FK_Labels_Projects_ProjectId" FOREIGN KEY ("ProjectId") 
        REFERENCES "Projects" ("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_Labels_Name" ON "Labels" ("Name");
CREATE INDEX IF NOT EXISTS "IX_Labels_ProjectId" ON "Labels" ("ProjectId");

-- ============================================
-- Create TaskComments Table
-- ============================================
CREATE TABLE IF NOT EXISTS "TaskComments" (
    "Id" SERIAL PRIMARY KEY,
    "TaskId" INTEGER NOT NULL,
    "Text" VARCHAR(2000) NOT NULL,
    "AuthorId" INTEGER NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMPTZ,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT "FK_TaskComments_Tasks_TaskId" FOREIGN KEY ("TaskId") 
        REFERENCES "Tasks" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_TaskComments_Users_AuthorId" FOREIGN KEY ("AuthorId") 
        REFERENCES "Users" ("Id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "IX_TaskComments_TaskId" ON "TaskComments" ("TaskId");
CREATE INDEX IF NOT EXISTS "IX_TaskComments_AuthorId" ON "TaskComments" ("AuthorId");

-- ============================================
-- Create TaskLinks Table
-- ============================================
CREATE TABLE IF NOT EXISTS "TaskLinks" (
    "Id" SERIAL PRIMARY KEY,
    "SourceTaskId" INTEGER NOT NULL,
    "TargetTaskId" INTEGER NOT NULL,
    "LinkType" VARCHAR(50) NOT NULL DEFAULT 'relates',
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_TaskLinks_Tasks_SourceTaskId" FOREIGN KEY ("SourceTaskId") 
        REFERENCES "Tasks" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_TaskLinks_Tasks_TargetTaskId" FOREIGN KEY ("TargetTaskId") 
        REFERENCES "Tasks" ("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_TaskLinks_SourceTaskId" ON "TaskLinks" ("SourceTaskId");
CREATE INDEX IF NOT EXISTS "IX_TaskLinks_TargetTaskId" ON "TaskLinks" ("TargetTaskId");
CREATE INDEX IF NOT EXISTS "IX_TaskLinks_SourceTaskId_TargetTaskId" ON "TaskLinks" ("SourceTaskId", "TargetTaskId");

-- ============================================
-- Create Flakes Table
-- ============================================
CREATE TABLE IF NOT EXISTS "Flakes" (
    "Id" SERIAL PRIMARY KEY,
    "Title" VARCHAR(500) NOT NULL,
    "Content" VARCHAR(10000),
    "ProjectId" INTEGER,
    "AuthorId" INTEGER,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMPTZ,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT "FK_Flakes_Projects_ProjectId" FOREIGN KEY ("ProjectId") 
        REFERENCES "Projects" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_Flakes_Users_AuthorId" FOREIGN KEY ("AuthorId") 
        REFERENCES "Users" ("Id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "IX_Flakes_ProjectId" ON "Flakes" ("ProjectId");
CREATE INDEX IF NOT EXISTS "IX_Flakes_AuthorId" ON "Flakes" ("AuthorId");

-- ============================================
-- Create Teams Table
-- ============================================
CREATE TABLE IF NOT EXISTS "Teams" (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(200) NOT NULL,
    "Description" VARCHAR(1000),
    "Avatar" VARCHAR(50),
    "ProjectId" INTEGER,
    "CreatedById" INTEGER NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMPTZ,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT "FK_Teams_Projects_ProjectId" FOREIGN KEY ("ProjectId") 
        REFERENCES "Projects" ("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_Teams_Users_CreatedById" FOREIGN KEY ("CreatedById") 
        REFERENCES "Users" ("Id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "IX_Teams_Name" ON "Teams" ("Name");
CREATE INDEX IF NOT EXISTS "IX_Teams_ProjectId" ON "Teams" ("ProjectId");
CREATE INDEX IF NOT EXISTS "IX_Teams_CreatedById" ON "Teams" ("CreatedById");

-- ============================================
-- Create TeamMembers Table
-- ============================================
CREATE TABLE IF NOT EXISTS "TeamMembers" (
    "Id" SERIAL PRIMARY KEY,
    "TeamId" INTEGER NOT NULL,
    "UserId" INTEGER NOT NULL,
    "Title" VARCHAR(100),
    "Role" VARCHAR(50) NOT NULL DEFAULT 'member',
    "JoinedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT "FK_TeamMembers_Teams_TeamId" FOREIGN KEY ("TeamId") 
        REFERENCES "Teams" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_TeamMembers_Users_UserId" FOREIGN KEY ("UserId") 
        REFERENCES "Users" ("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_TeamMembers_TeamId" ON "TeamMembers" ("TeamId");
CREATE INDEX IF NOT EXISTS "IX_TeamMembers_UserId" ON "TeamMembers" ("UserId");
CREATE UNIQUE INDEX IF NOT EXISTS "IX_TeamMembers_TeamId_UserId" ON "TeamMembers" ("TeamId", "UserId");

-- ============================================
-- Create Incident Tables
-- ============================================

-- Incident Requesters Table (snake_case as per DbContext)
CREATE TABLE IF NOT EXISTS "incident_requesters" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS "IX_incident_requesters_email" ON "incident_requesters" ("email");
CREATE INDEX IF NOT EXISTS "IX_incident_requesters_is_active" ON "incident_requesters" ("is_active");

-- Incident Assignees Table (snake_case as per DbContext)
CREATE TABLE IF NOT EXISTS "incident_assignees" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS "IX_incident_assignees_email" ON "incident_assignees" ("email");
CREATE INDEX IF NOT EXISTS "IX_incident_assignees_is_active" ON "incident_assignees" ("is_active");

-- Incident Groups Table (snake_case as per DbContext)
CREATE TABLE IF NOT EXISTS "incident_groups" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS "IX_incident_groups_name" ON "incident_groups" ("name");
CREATE INDEX IF NOT EXISTS "IX_incident_groups_is_active" ON "incident_groups" ("is_active");

-- Incidents Table (PascalCase as per DbContext)
CREATE TABLE IF NOT EXISTS "Incidents" (
    "Id" SERIAL PRIMARY KEY,
    "IncidentNumber" VARCHAR(50) NOT NULL,
    "Subject" VARCHAR(200) NOT NULL,
    "Description" TEXT,
    "RequesterId" INTEGER,
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
    CONSTRAINT "FK_Incidents_incident_requesters_RequesterId" FOREIGN KEY ("RequesterId") 
        REFERENCES "incident_requesters" ("id") ON DELETE RESTRICT,
    CONSTRAINT "FK_Incidents_incident_assignees_AgentId" FOREIGN KEY ("AgentId") 
        REFERENCES "incident_assignees" ("id") ON DELETE SET NULL,
    CONSTRAINT "FK_Incidents_incident_groups_GroupId" FOREIGN KEY ("GroupId") 
        REFERENCES "incident_groups" ("id") ON DELETE SET NULL,
    CONSTRAINT "FK_Incidents_Projects_ProjectId" FOREIGN KEY ("ProjectId") 
        REFERENCES "Projects" ("Id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "IX_Incidents_IncidentNumber" ON "Incidents" ("IncidentNumber");
CREATE INDEX IF NOT EXISTS "IX_Incidents_Status" ON "Incidents" ("Status");
CREATE INDEX IF NOT EXISTS "IX_Incidents_Priority" ON "Incidents" ("Priority");
CREATE INDEX IF NOT EXISTS "IX_Incidents_CreatedAt" ON "Incidents" ("CreatedAt");
CREATE INDEX IF NOT EXISTS "IX_Incidents_ProjectId" ON "Incidents" ("ProjectId");
CREATE INDEX IF NOT EXISTS "IX_Incidents_RequesterId" ON "Incidents" ("RequesterId");
CREATE INDEX IF NOT EXISTS "IX_Incidents_AgentId" ON "Incidents" ("AgentId");
CREATE INDEX IF NOT EXISTS "IX_Incidents_GroupId" ON "Incidents" ("GroupId");
CREATE INDEX IF NOT EXISTS "IX_Incidents_ProjectId_Status" ON "Incidents" ("ProjectId", "Status");
CREATE INDEX IF NOT EXISTS "IX_Incidents_ProjectId_CreatedAt" ON "Incidents" ("ProjectId", "CreatedAt");
CREATE INDEX IF NOT EXISTS "IX_Incidents_Status_Priority" ON "Incidents" ("Status", "Priority");
CREATE INDEX IF NOT EXISTS "IX_Incidents_RequesterId_CreatedAt" ON "Incidents" ("RequesterId", "CreatedAt");
CREATE INDEX IF NOT EXISTS "IX_Incidents_AgentId_Status" ON "Incidents" ("AgentId", "Status");
CREATE INDEX IF NOT EXISTS "IX_Incidents_ProjectId_Status_CreatedAt" ON "Incidents" ("ProjectId", "Status", "CreatedAt");

-- ============================================
-- Create ReportRecipients Table
-- ============================================
CREATE TABLE IF NOT EXISTS "ReportRecipients" (
    "Id" SERIAL PRIMARY KEY,
    "Email" VARCHAR(200) NOT NULL,
    "Name" VARCHAR(100) NOT NULL,
    "ReportType" VARCHAR(50) NOT NULL DEFAULT 'DailyIncidents',
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "LastSentAt" TIMESTAMPTZ,
    "ProjectId" INTEGER,
    CONSTRAINT "FK_ReportRecipients_Projects_ProjectId" FOREIGN KEY ("ProjectId") 
        REFERENCES "Projects" ("Id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "IX_ReportRecipients_Email" ON "ReportRecipients" ("Email");
CREATE INDEX IF NOT EXISTS "IX_ReportRecipients_ProjectId" ON "ReportRecipients" ("ProjectId");
CREATE INDEX IF NOT EXISTS "IX_ReportRecipients_IsActive" ON "ReportRecipients" ("IsActive");

-- ============================================
-- Create EF Migrations History Table
-- ============================================
-- This table tracks which migrations have been applied
-- If you run this SQL script manually, EF will still try to run migrations
-- because it won't see this history. Consider running migrations via EF instead.

CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" VARCHAR(150) NOT NULL PRIMARY KEY,
    "ProductVersion" VARCHAR(32) NOT NULL
);

-- Insert migration records (optional - only if you want EF to think migrations ran)
-- INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion") VALUES
-- ('InitialCreate', '8.0.0'),
-- ('AddLabels', '8.0.0'),
-- ('AddFlakesTable', '8.0.0'),
-- ('AddTeamsAndTeamMembers', '8.0.0');

-- ============================================
-- Script Complete
-- ============================================
-- 
-- WARNING: Running this SQL script manually means Entity Framework won't track
-- which migrations have been applied. When you start the API, EF will try to
-- run migrations again (but they'll fail because tables already exist, or
-- EF might skip them if it detects the tables exist).
--
-- RECOMMENDED APPROACH:
-- 1. Run delete-astutetech-create-milo.sql first (creates the database)
-- 2. Start your API - it will automatically create all tables via migrations
--    OR run: .\run-supabase-migrations.ps1
-- 
-- ============================================
