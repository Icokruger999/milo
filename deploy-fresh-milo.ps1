# Deploy Fresh Milo DLL to EC2 Instance
# This script deploys a clean Milo-only build to the instance

$instanceId = "i-06bc5b2218c041802"
$region = "eu-west-1"
$localPublishPath = "backend/Milo.API/publish-fresh"
$remotePublishPath = "/home/ec2-user/milo-backend-publish"

Write-Host "Deploying fresh Milo DLL to instance $instanceId..."

# Copy files to instance using S3 as intermediary
Write-Host "Creating deployment package..."
$deployZip = "milo-deploy-fresh.zip"
Compress-Archive -Path $localPublishPath -DestinationPath $deployZip -Force

Write-Host "Uploading to S3..."
aws s3 cp $deployZip "s3://milo-deployments/$deployZip" --region $region

Write-Host "Deploying to instance..."
$commands = @(
    "cd /tmp",
    "aws s3 cp s3://milo-deployments/$deployZip . --region $region",
    "unzip -o $deployZip -d /tmp/milo-fresh",
    "sudo cp -r /tmp/milo-fresh/* $remotePublishPath/",
    "sudo chown -R ec2-user:ec2-user $remotePublishPath",
    "sudo systemctl start milo-backend",
    "sleep 3",
    "sudo systemctl status milo-backend",
    "curl -s http://localhost:8080/api/projects | head -c 100"
)

$commandsJson = $commands | ConvertTo-Json -AsArray

aws ssm send-command `
    --instance-ids $instanceId `
    --document-name "AWS-RunShellScript" `
    --parameters $commandsJson `
    --region $region `
    --output text

Write-Host "Deployment initiated. Cleaning up local files..."
Remove-Item $deployZip -Force

Write-Host "Done!"
