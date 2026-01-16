#!/bin/bash
cd /home/ec2-user/milo-backend-publish

# Backup current config
sudo cp appsettings.json appsettings.json.backup

# Update the Email section to enable SES
sudo python3 << 'PYTHON_SCRIPT'
import json

with open('appsettings.json', 'r') as f:
    config = json.load(f)

config['Email']['UseSes'] = True
config['Email']['SesRegion'] = 'eu-west-1'
config['Email']['FromEmail'] = 'info@codingeverest.com'

with open('appsettings.json', 'w') as f:
    json.dump(config, f, indent=2)

print("Email configuration updated successfully!")
print(json.dumps(config['Email'], indent=2))
PYTHON_SCRIPT

# Restart the service
sudo systemctl restart milo-backend
sleep 3
sudo systemctl status milo-backend --no-pager | head -15
