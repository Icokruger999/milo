-- Rename columns back to lowercase (snake_case) for PostgreSQL compatibility
ALTER TABLE incident_assignees RENAME COLUMN "Id" TO id;
ALTER TABLE incident_assignees RENAME COLUMN "Name" TO name;
ALTER TABLE incident_assignees RENAME COLUMN "Email" TO email;
ALTER TABLE incident_assignees RENAME COLUMN "CreatedAt" TO created_at;
ALTER TABLE incident_assignees RENAME COLUMN "UpdatedAt" TO updated_at;
ALTER TABLE incident_assignees RENAME COLUMN "IsActive" TO is_active;

ALTER TABLE incident_requesters RENAME COLUMN "Id" TO id;
ALTER TABLE incident_requesters RENAME COLUMN "Name" TO name;
ALTER TABLE incident_requesters RENAME COLUMN "Email" TO email;
ALTER TABLE incident_requesters RENAME COLUMN "CreatedAt" TO created_at;
ALTER TABLE incident_requesters RENAME COLUMN "UpdatedAt" TO updated_at;
ALTER TABLE incident_requesters RENAME COLUMN "IsActive" TO is_active;

ALTER TABLE incident_groups RENAME COLUMN "Id" TO id;
ALTER TABLE incident_groups RENAME COLUMN "Name" TO name;
ALTER TABLE incident_groups RENAME COLUMN "Description" TO description;
ALTER TABLE incident_groups RENAME COLUMN "CreatedAt" TO created_at;
ALTER TABLE incident_groups RENAME COLUMN "UpdatedAt" TO updated_at;
ALTER TABLE incident_groups RENAME COLUMN "IsActive" TO is_active;
