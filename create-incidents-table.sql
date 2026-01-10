-- Create Incidents table
CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    incident_number VARCHAR(50) NOT NULL UNIQUE,
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
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    planned_start_date TIMESTAMP,
    planned_end_date TIMESTAMP,
    planned_effort VARCHAR(50),
    first_response_due TIMESTAMP,
    resolution_due TIMESTAMP,
    first_response_at TIMESTAMP,
    tags VARCHAR(500),
    associated_assets TEXT,
    project_id INTEGER,
    attachments TEXT,
    resolution TEXT,
    CONSTRAINT fk_incidents_requester FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_incidents_agent FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_incidents_group FOREIGN KEY (group_id) REFERENCES teams(id) ON DELETE SET NULL,
    CONSTRAINT fk_incidents_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS ix_incidents_incident_number ON incidents(incident_number);
CREATE INDEX IF NOT EXISTS ix_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS ix_incidents_priority ON incidents(priority);
CREATE INDEX IF NOT EXISTS ix_incidents_created_at ON incidents(created_at);
CREATE INDEX IF NOT EXISTS ix_incidents_project_id ON incidents(project_id);
CREATE INDEX IF NOT EXISTS ix_incidents_requester_id ON incidents(requester_id);

-- Insert sample incident (optional - for testing)
-- INSERT INTO incidents (
--     incident_number,
--     subject,
--     description,
--     requester_id,
--     status,
--     priority,
--     urgency,
--     impact,
--     source,
--     category,
--     created_at
-- ) VALUES (
--     'INC-001',
--     'Cannot access email account',
--     'User is unable to access their email account after password reset.',
--     1, -- Replace with actual user ID
--     'Open',
--     'High',
--     'High',
--     'Medium',
--     'Email',
--     'Email & Collaboration',
--     NOW()
-- );
