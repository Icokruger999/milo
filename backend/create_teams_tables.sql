-- Create Teams table
CREATE TABLE IF NOT EXISTS "Teams" (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(200) NOT NULL,
    "Description" VARCHAR(1000),
    "Avatar" VARCHAR(50),
    "ProjectId" INTEGER,
    "CreatedById" INTEGER NOT NULL,
    "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    FOREIGN KEY ("ProjectId") REFERENCES "Projects"("Id") ON DELETE SET NULL,
    FOREIGN KEY ("CreatedById") REFERENCES "Users"("Id") ON DELETE RESTRICT
);

-- Create TeamMembers table
CREATE TABLE IF NOT EXISTS "TeamMembers" (
    "Id" SERIAL PRIMARY KEY,
    "TeamId" INTEGER NOT NULL,
    "UserId" INTEGER NOT NULL,
    "Title" VARCHAR(100),
    "Role" VARCHAR(50) NOT NULL DEFAULT 'member',
    "JoinedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    FOREIGN KEY ("TeamId") REFERENCES "Teams"("Id") ON DELETE CASCADE,
    FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE,
    UNIQUE ("TeamId", "UserId")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "IX_Teams_Name" ON "Teams"("Name");
CREATE INDEX IF NOT EXISTS "IX_Teams_ProjectId" ON "Teams"("ProjectId");
CREATE INDEX IF NOT EXISTS "IX_Teams_CreatedById" ON "Teams"("CreatedById");
CREATE INDEX IF NOT EXISTS "IX_TeamMembers_TeamId" ON "TeamMembers"("TeamId");
CREATE INDEX IF NOT EXISTS "IX_TeamMembers_UserId" ON "TeamMembers"("UserId");
CREATE INDEX IF NOT EXISTS "IX_TeamMembers_TeamId_UserId" ON "TeamMembers"("TeamId", "UserId");

