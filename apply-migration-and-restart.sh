#!/bin/bash
# Apply database migration and restart backend service on EC2

echo "=== Applying Database Migration and Restarting Backend ==="
echo ""

# Navigate to backend directory
cd ~/milo/backend/Milo.API || cd /home/ec2-user/milo/backend/Milo.API || {
    echo "Error: Backend directory not found"
    echo "Please ensure the backend is deployed to ~/milo/backend/Milo.API"
    exit 1
}

echo "✓ Found backend directory"
echo ""

# Check if dotnet is available
if ! command -v dotnet &> /dev/null; then
    echo "✗ dotnet CLI not found"
    echo "Please install .NET SDK or Runtime"
    exit 1
fi

echo "✓ dotnet CLI available"
echo ""

# Create migration if it doesn't exist
if [ ! -f "Data/Migrations/AddTaskTypeAndRelationships.cs" ]; then
    echo "Creating migration: AddTaskTypeAndRelationships"
    dotnet ef migrations add AddTaskTypeAndRelationships --output-dir Data/Migrations
    if [ $? -ne 0 ]; then
        echo "✗ Failed to create migration"
        exit 1
    fi
    echo "✓ Migration created"
else
    echo "✓ Migration already exists"
fi

echo ""

# Apply migration
echo "Applying database migration..."
dotnet ef database update
if [ $? -ne 0 ]; then
    echo "✗ Migration failed"
    echo "Check database connection and permissions"
    exit 1
fi

echo "✓ Migration applied successfully"
echo ""

# Restart backend service
echo "Restarting backend service..."
sudo systemctl restart milo-api.service

# Wait a moment for service to start
sleep 3

# Check service status
echo ""
echo "=== Service Status ==="
sudo systemctl status milo-api.service --no-pager | head -15

echo ""
echo "=== Testing Backend ==="
sleep 2
curl -s http://localhost:5001/api/health && echo "" || echo "Backend not responding yet (may need more time)"

echo ""
echo "=== Migration and Restart Complete ==="
echo "Backend should now support:"
echo "  - TaskType (Epic, Task, Bug, Story)"
echo "  - StartDate (for roadmap timeline)"
echo "  - ParentTaskId (for epic/task relationships)"
echo "  - TaskLinks (for linked tasks)"

