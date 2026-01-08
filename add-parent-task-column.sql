-- Add missing columns to Tasks table
-- ParentTaskId: for subtask/epic support
-- StartDate: for roadmap timeline

DO $$ 
BEGIN
    -- Add ParentTaskId column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Tasks' 
        AND column_name = 'ParentTaskId'
    ) THEN
        ALTER TABLE "Tasks" ADD COLUMN "ParentTaskId" INTEGER NULL;
        
        -- Add foreign key constraint
        ALTER TABLE "Tasks" 
        ADD CONSTRAINT "FK_Tasks_Tasks_ParentTaskId" 
        FOREIGN KEY ("ParentTaskId") 
        REFERENCES "Tasks"("Id") 
        ON DELETE SET NULL;
        
        -- Add index for performance
        CREATE INDEX "IX_Tasks_ParentTaskId" ON "Tasks" ("ParentTaskId");
        
        RAISE NOTICE 'ParentTaskId column added successfully';
    ELSE
        RAISE NOTICE 'ParentTaskId column already exists';
    END IF;
    
    -- Add StartDate column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Tasks' 
        AND column_name = 'StartDate'
    ) THEN
        ALTER TABLE "Tasks" ADD COLUMN "StartDate" TIMESTAMP WITHOUT TIME ZONE NULL;
        
        -- Add index for performance
        CREATE INDEX "IX_Tasks_StartDate" ON "Tasks" ("StartDate");
        
        RAISE NOTICE 'StartDate column added successfully';
    ELSE
        RAISE NOTICE 'StartDate column already exists';
    END IF;
END $$;

-- Verify both columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'Tasks' 
AND column_name IN ('ParentTaskId', 'StartDate')
ORDER BY column_name;

