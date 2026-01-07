#!/bin/bash
# Test RDS connectivity from EC2
# Run this in your EC2 console

echo "========================================"
echo "Testing RDS Connection from EC2"
echo "========================================"

# Test 1: DNS resolution
echo ""
echo "1. Testing DNS resolution..."
nslookup codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com

# Test 2: Network connectivity (port 5432)
echo ""
echo "2. Testing port 5432 connectivity..."
timeout 5 bash -c '</dev/tcp/codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com/5432' && echo "✅ Port 5432 is reachable" || echo "❌ Port 5432 is NOT reachable"

# Test 3: Check if PostgreSQL client is installed
echo ""
echo "3. Checking PostgreSQL client..."
if command -v psql &> /dev/null; then
    echo "✅ psql is installed"
    echo ""
    echo "4. Testing PostgreSQL connection..."
    PGPASSWORD='Stacey@1122' psql -h codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com -U postgres -d MiloDB -c "SELECT version();" 2>&1
else
    echo "⚠️  psql not installed. Installing..."
    sudo yum install -y postgresql15
    echo ""
    echo "4. Testing PostgreSQL connection..."
    PGPASSWORD='Stacey@1122' psql -h codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com -U postgres -d MiloDB -c "SELECT version();" 2>&1
fi

echo ""
echo "========================================"
echo "Test Complete"
echo "========================================"

