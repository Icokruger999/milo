#!/bin/bash
export PGPASSWORD=Stacey1122
psql -h codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com -U postgres -d MiloDB << 'SQL'
DELETE FROM "Users" WHERE email = 'ico@astutetech.co.za';
SELECT 'User deleted' as status;
SQL

