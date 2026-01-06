# EC2 Instance Information - codingeverest

## Instance Details

- **Instance ID**: `i-06bc5b2218c041802`
- **Name**: `codingeverest`
- **Type**: `t2.micro`
- **Status**: Running
- **Public IP**: `34.246.3.141`
- **Private IP**: `172.31.30.186`
- **Region**: `us-east-1`

## API Endpoints

Once deployed, the API will be available at:
- **HTTP**: `http://34.246.3.141:5000`
- **Health Check**: `http://34.246.3.141:5000/api/health`
- **Swagger UI**: `http://34.246.3.141:5000/swagger` (if enabled)

## Quick Deploy Commands

### Find Instance
```powershell
aws ec2 describe-instances --instance-ids i-06bc5b2218c041802 --query "Reservations[0].Instances[0].[InstanceId,PublicIpAddress,State.Name]" --output table
```

### Start Instance (if stopped)
```powershell
aws ec2 start-instances --instance-ids i-06bc5b2218c041802
```

### Deploy Backend
```powershell
.\deploy-to-ec2.ps1 -InstanceId i-06bc5b2218c041802 -PublicIp 34.246.3.141
```

## Security Group Configuration

Make sure your security group allows:
- **Port 22 (SSH)** - From your IP
- **Port 5000 (HTTP)** - From anywhere (0.0.0.0/0) for API access

Check security groups:
```powershell
aws ec2 describe-instances --instance-ids i-06bc5b2218c041802 --query "Reservations[0].Instances[0].SecurityGroups[*].[GroupId,GroupName]" --output table
```

## SSH Connection

```bash
ssh -i your-key.pem ec2-user@34.246.3.141
```

Or if using Ubuntu AMI:
```bash
ssh -i your-key.pem ubuntu@34.246.3.141
```

## Next Steps

1. ✅ Instance found and configured
2. ⏳ Deploy backend using `.\deploy-to-ec2.ps1`
3. ⏳ Verify API is accessible
4. ⏳ Update frontend to use EC2 API endpoint
5. ⏳ Configure Amplify environment variables

