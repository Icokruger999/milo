#!/bin/bash
# Update EC2 backend via SSM - Pull latest code and restart

echo "=== Updating EC2 Backend via SSM ==="
echo ""

INSTANCE_ID="i-06bc5b2218c041802"
REGION="us-east-1"

echo "Instance ID: $INSTANCE_ID"
echo "Region: $REGION"
echo ""

# Commands to run on EC2
COMMANDS=(
    "cd ~/milo || cd /home/ec2-user/milo"
    "git pull origin main"
    "cd backend/Milo.API"
    "dotnet ef migrations add AddFlakesAndTaskType --output-dir Data/Migrations || echo 'Migration may already exist'"
    "sudo systemctl restart milo-api.service"
    "sleep 5"
    "sudo systemctl status milo-api.service --no-pager | head -15"
    "curl -s http://localhost:5001/api/health || echo 'Backend not responding'"
)

# Join commands with && and escape properly
CMD_STRING=$(IFS=' && '; echo "${COMMANDS[*]}")

echo "Sending SSM command..."
aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters "commands=[\"$CMD_STRING\"]" \
    --region "$REGION" \
    --output json \
    --query 'Command.{CommandId:CommandId,Status:Status}' \
    --output table

echo ""
echo "Command sent. Waiting 15 seconds for execution..."
sleep 15

echo ""
echo "Getting command output..."
COMMAND_ID=$(aws ssm list-commands --instance-id "$INSTANCE_ID" --region "$REGION" --max-items 1 --query 'Commands[0].CommandId' --output text)

if [ -n "$COMMAND_ID" ] && [ "$COMMAND_ID" != "None" ]; then
    echo "Command ID: $COMMAND_ID"
    echo ""
    echo "=== Output ==="
    aws ssm get-command-invocation \
        --instance-id "$INSTANCE_ID" \
        --command-id "$COMMAND_ID" \
        --region "$REGION" \
        --query 'StandardOutputContent' \
        --output text
    
    echo ""
    echo "=== Errors (if any) ==="
    aws ssm get-command-invocation \
        --instance-id "$INSTANCE_ID" \
        --command-id "$COMMAND_ID" \
        --region "$REGION" \
        --query 'StandardErrorContent' \
        --output text
else
    echo "No command ID found"
fi

echo ""
echo "=== Update Complete ==="

