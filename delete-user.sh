#!/bin/bash
# Delete user ico@astutetech.co.za from database

PGPASSWORD='Stacey1122' psql -h codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com -U postgres -d MiloDB << EOF

-- First, check if user exists
SELECT id, email, name, "CreatedAt" FROM "Users" WHERE email = 'ico@astutetech.co.za';

-- Delete related records first (if any)
-- Delete project memberships
DELETE FROM "ProjectMembers" WHERE "UserId" IN (SELECT id FROM "Users" WHERE email = 'ico@astutetech.co.za');

-- Delete project invitations sent by this user
DELETE FROM "ProjectInvitations" WHERE "InvitedById" IN (SELECT id FROM "Users" WHERE email = 'ico@astutetech.co.za');

-- Delete tasks assigned to this user (set assignee to null)
UPDATE "Tasks" SET "AssigneeId" = NULL WHERE "AssigneeId" IN (SELECT id FROM "Users" WHERE email = 'ico@astutetech.co.za');

-- Delete tasks created by this user (set creator to null)
UPDATE "Tasks" SET "CreatorId" = NULL WHERE "CreatorId" IN (SELECT id FROM "Users" WHERE email = 'ico@astutetech.co.za');

-- Delete projects owned by this user (set owner to null or delete - we'll set to null for safety)
-- Note: This might fail if there are foreign key constraints, so we'll handle it carefully
UPDATE "Projects" SET "OwnerId" = NULL WHERE "OwnerId" IN (SELECT id FROM "Users" WHERE email = 'ico@astutetech.co.za');

-- Finally, delete the user
DELETE FROM "Users" WHERE email = 'ico@astutetech.co.za';

-- Verify deletion
SELECT 'User deleted. Remaining users:' as status;
SELECT id, email, name FROM "Users" ORDER BY "CreatedAt" DESC LIMIT 5;

EOF

echo ""
echo "✅ User deletion complete!"

