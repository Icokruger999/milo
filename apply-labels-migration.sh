#!/bin/bash
# Manually apply the Labels migration

export PGPASSWORD=Stacey1122

echo "Creating Labels table manually..."

psql -h codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com -U postgres -d MiloDB << 'SQL'
-- Create Labels table
CREATE TABLE IF NOT EXISTS "Labels" (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(100) NOT NULL,
    "Color" VARCHAR(7),
    "Description" VARCHAR(500),
    "ProjectId" INTEGER,
    "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP WITH TIME ZONE,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT "FK_Labels_Projects_ProjectId" FOREIGN KEY ("ProjectId") REFERENCES "Projects"("Id") ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "IX_Labels_Name" ON "Labels"("Name");
CREATE INDEX IF NOT EXISTS "IX_Labels_ProjectId" ON "Labels"("ProjectId");

-- Add migration to history
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('AddLabels', '8.0.0')
ON CONFLICT ("MigrationId") DO NOTHING;

SELECT 'Labels table created successfully!' as status;
SQL

echo ""
echo "Testing Labels API:"
curl -s http://localhost:5001/api/labels

