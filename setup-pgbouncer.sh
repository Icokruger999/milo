#!/bin/bash
set -e

echo "========================================="
echo "Setting up PostgreSQL + PgBouncer on EC2"
echo "========================================="
echo ""

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo yum update -y
    sudo yum install -y docker
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker ec2-user
    echo "Docker installed successfully"
else
    echo "Docker is already installed"
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "Docker Compose installed successfully"
else
    echo "Docker Compose is already installed"
fi

# Create directory for docker-compose.yml
mkdir -p /home/ec2-user/milo-db
cd /home/ec2-user/milo-db

# Download docker-compose.yml from GitHub
echo ""
echo "Downloading docker-compose.yml from GitHub..."
curl -o docker-compose.yml https://raw.githubusercontent.com/Icokruger999/milo/main/docker-compose.yml

if [ ! -f docker-compose.yml ]; then
    echo "ERROR: Failed to download docker-compose.yml"
    exit 1
fi

echo "docker-compose.yml downloaded successfully"
echo ""

# Set password as environment variable
export POSTGRES_PASSWORD="Milo_PgBouncer_2024!Secure#Key"

# Start Docker services
echo "Starting PostgreSQL and PgBouncer containers..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo ""
echo "Waiting for PostgreSQL to be ready..."
sleep 10

# Create milo database
echo ""
echo "Creating 'milo' database..."
docker exec -it milo_postgres psql -U postgres -c "CREATE DATABASE milo;" || echo "Database 'milo' may already exist"

# Verify services are running
echo ""
echo "========================================="
echo "Verifying services are running..."
echo "========================================="
docker ps --filter "name=milo" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "PostgreSQL is running on port 5432"
echo "PgBouncer is running on port 6432"
echo ""
echo "Connection string:"
echo "Host=34.246.3.141;Port=6432;Database=milo;Username=postgres;Password=Milo_PgBouncer_2024!Secure#Key"
echo ""
