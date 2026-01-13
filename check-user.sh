#!/bin/bash
# Check if user exists and get their details

EMAIL="robert.nicol@astutetech.co.za"

echo "Checking if user exists: $EMAIL"
echo ""

# Query database
PGPASSWORD="Milo_PgBouncer_2024!Secure#Key" psql -h localhost -p 5432 -U postgres -d milo -c "SELECT id, email, name, is_active, requires_password_change, created_at FROM users WHERE LOWER(email) = LOWER('$EMAIL');"

echo ""
echo "Checking signup logs..."
grep -i "robert.nicol" /home/ec2-user/milo-backend.log | tail -20 || echo "No signup logs found"

echo ""
echo "Checking email sending logs..."
grep -i "temporary password.*robert.nicol" /home/ec2-user/milo-backend.log | tail -10 || echo "No email logs found"
