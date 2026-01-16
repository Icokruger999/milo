#!/bin/bash

echo "=== ALL TASKS (INCLUDING DELETED) ==="
psql -h localhost -p 6432 -U postgres -d milo -c "SELECT id, task_id, title, status, created_at, updated_at FROM tasks ORDER BY id;"

echo ""
echo "=== TASK COUNT BY STATUS ==="
psql -h localhost -p 6432 -U postgres -d milo -c "SELECT status, COUNT(*) as count FROM tasks GROUP BY status ORDER BY count DESC;"

echo ""
echo "=== CHECK FOR SOFT DELETES ==="
psql -h localhost -p 6432 -U postgres -d milo -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tasks' AND column_name LIKE '%delete%';"

echo ""
echo "=== RECENT TASKS ==="
psql -h localhost -p 6432 -U postgres -d milo -c "SELECT id, task_id, title, status, created_at FROM tasks ORDER BY created_at DESC LIMIT 10;"
