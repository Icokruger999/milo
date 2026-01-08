-- Create Flakes table for Milo application
-- Run this SQL script on your RDS PostgreSQL database

-- Check if table already exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Flakes') THEN
        -- Create Flakes table
        CREATE TABLE "Flakes" (
            "Id" SERIAL PRIMARY KEY,
            "Title" VARCHAR(500) NOT NULL,
            "Content" VARCHAR(10000),
            "ProjectId" INTEGER,
            "AuthorId" INTEGER,
            "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
            "UpdatedAt" TIMESTAMP WITH TIME ZONE,
            "IsDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
            CONSTRAINT "FK_Flakes_Projects_ProjectId" FOREIGN KEY ("ProjectId") 
                REFERENCES "Projects"("Id") ON DELETE CASCADE,
            CONSTRAINT "FK_Flakes_Users_AuthorId" FOREIGN KEY ("AuthorId") 
                REFERENCES "Users"("Id") ON DELETE SET NULL
        );

        -- Create indexes
        CREATE INDEX "IX_Flakes_ProjectId" ON "Flakes" ("ProjectId");
        CREATE INDEX "IX_Flakes_AuthorId" ON "Flakes" ("AuthorId");

        RAISE NOTICE 'Flakes table created successfully';
    ELSE
        RAISE NOTICE 'Flakes table already exists';
    END IF;
END $$;

-- Verify table was created
SELECT 
    'Table created successfully!' as status,
    COUNT(*) as row_count 
FROM "Flakes";

-- Show table structure
\d "Flakes"

