-- Add Checklist column to Tasks table for storing JSON checklist items
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Tasks'
        AND column_name = 'Checklist'
    ) THEN
        ALTER TABLE "Tasks" ADD COLUMN "Checklist" TEXT NULL;
        RAISE NOTICE 'Checklist column added successfully';
    ELSE
        RAISE NOTICE 'Checklist column already exists';
    END IF;
END $$;

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Tasks'
AND column_name = 'Checklist';

