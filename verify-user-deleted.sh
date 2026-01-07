#!/bin/bash
export PGPASSWORD=Stacey1122
echo "Checking if user exists..."
psql -h codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com -U postgres -d MiloDB -c "SELECT id, email, name FROM Users WHERE email = 'ico@astutetech.co.za';"
echo ""
echo "If no rows returned above, user was deleted successfully."

