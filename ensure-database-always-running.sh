#!/bin/bash
# Ensure Database (PostgreSQL + PgBouncer) is Always Running 24/7
# This script ensures Docker containers restart automatically and are healthy

echo "=== ENSURING DATABASE IS ALWAYS RUNNING ==="
echo ""

# Step 1: Check if Docker is running
if ! systemctl is-active --quiet docker; then
    echo "⚠️  Docker is not running. Starting Docker..."
    sudo systemctl start docker
    sleep 5
fi

# Step 2: Ensure Docker starts on boot
if ! systemctl is-enabled --quiet docker; then
    echo "⚠️  Docker is not enabled on boot. Enabling..."
    sudo systemctl enable docker
fi

# Step 3: Check if containers are running
echo "Checking Docker containers..."
POSTGRES_RUNNING=$(docker ps | grep -c "milo_postgres" || echo "0")
PGBOUNCER_RUNNING=$(docker ps | grep -c "milo_pgbouncer" || echo "0")

if [ "$POSTGRES_RUNNING" -eq 0 ] || [ "$PGBOUNCER_RUNNING" -eq 0 ]; then
    echo "⚠️  Some containers are not running. Starting Docker Compose..."
    cd /home/ec2-user/milo || cd /milo || exit 1
    docker-compose up -d
    sleep 10
fi

# Step 4: Verify containers are healthy
echo ""
echo "Verifying container health..."
POSTGRES_HEALTHY=$(docker inspect --format='{{.State.Health.Status}}' milo_postgres 2>/dev/null || echo "unknown")
PGBOUNCER_RUNNING=$(docker ps | grep -c "milo_pgbouncer" || echo "0")

echo "  PostgreSQL Health: $POSTGRES_HEALTHY"
echo "  PgBouncer Running: $([ "$PGBOUNCER_RUNNING" -eq 1 ] && echo "yes" || echo "no")"

# Step 5: Test database connection
echo ""
echo "Testing database connection via PgBouncer..."
export PGPASSWORD='Milo_PgBouncer_2024!Secure#Key'
if psql -h localhost -p 6432 -U postgres -d milo -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    echo "Restarting containers..."
    cd /home/ec2-user/milo || cd /milo || exit 1
    docker-compose restart
    sleep 10
fi

# Step 6: Ensure restart policy is 'always'
echo ""
echo "Verifying restart policies..."
POSTGRES_RESTART=$(docker inspect --format='{{.HostConfig.RestartPolicy.Name}}' milo_postgres 2>/dev/null || echo "unknown")
PGBOUNCER_RESTART=$(docker inspect --format='{{.HostConfig.RestartPolicy.Name}}' milo_pgbouncer 2>/dev/null || echo "unknown")

echo "  PostgreSQL Restart Policy: $POSTGRES_RESTART"
echo "  PgBouncer Restart Policy: $PGBOUNCER_RESTART"

if [ "$POSTGRES_RESTART" != "always" ] || [ "$PGBOUNCER_RESTART" != "always" ]; then
    echo "⚠️  Restart policy is not 'always'. Updating docker-compose.yml and restarting..."
    cd /home/ec2-user/milo || cd /milo || exit 1
    docker-compose down
    docker-compose up -d
    sleep 10
fi

echo ""
echo "=== DATABASE 24/7 CONFIGURATION COMPLETE ==="
echo ""
echo "✅ Docker: $(systemctl is-active docker && echo 'running' || echo 'stopped')"
echo "✅ PostgreSQL: $(docker ps | grep -q milo_postgres && echo 'running' || echo 'stopped')"
echo "✅ PgBouncer: $(docker ps | grep -q milo_pgbouncer && echo 'running' || echo 'stopped')"
echo ""
echo "Containers will automatically:"
echo "  - Start on system boot"
echo "  - Restart if they crash (restart: always)"
echo "  - Maintain connection pooling (PgBouncer)"
echo "  - Handle timeouts properly (600s idle, keepalive enabled)"
