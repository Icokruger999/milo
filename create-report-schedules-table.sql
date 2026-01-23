-- Create report_schedules table
CREATE TABLE IF NOT EXISTS report_schedules (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    frequency VARCHAR(20) NOT NULL DEFAULT 'manual',
    time VARCHAR(5) NOT NULL DEFAULT '09:00',
    weekday INTEGER,
    month_day INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT false,
    last_run_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_report_schedules_project_id ON report_schedules(project_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_is_active ON report_schedules(is_active);
