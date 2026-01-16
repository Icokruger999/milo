#!/bin/bash

echo "=== SOFT DELETED TASKS ==="
psql -h localhost -p 6432 -U postgres -d milo -c "SELECT COUNT(*) as deleted_tasks FROM tasks WHERE is_deleted = true;"

echo ""
echo "=== ALL DELETED TASKS DETAILS ==="
psql -h localhost -p 6432 -U postgres -d milo -c "SELECT id, task_id, title, status, is_deleted, created_at FROM tasks WHERE is_deleted = true ORDER BY created_at DESC;"

echo ""
echo "=== ACTIVE VS DELETED BREAKDOWN ==="
psql -h localhost -p 6432 -U postgres -d milo -c "SELECT is_deleted, COUNT(*) as count FROM tasks GROUP BY is_deleted;"
