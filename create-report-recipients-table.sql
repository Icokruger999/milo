-- Create Report Recipients table
CREATE TABLE IF NOT EXISTS report_recipients (
    id SERIAL PRIMARY KEY,
    email VARCHAR(200) NOT NULL,
    name VARCHAR(100) NOT NULL,
    report_type VARCHAR(50) NOT NULL DEFAULT 'DailyIncidents',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_sent_at TIMESTAMP,
    project_id INTEGER,
    CONSTRAINT fk_report_recipients_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS ix_report_recipients_email ON report_recipients(email);
CREATE INDEX IF NOT EXISTS ix_report_recipients_project_id ON report_recipients(project_id);
CREATE INDEX IF NOT EXISTS ix_report_recipients_is_active ON report_recipients(is_active);

-- Verify table creation
SELECT 'Report recipients table created successfully' as status;
