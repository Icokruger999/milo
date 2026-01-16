#!/bin/bash
cd /home/ec2-user/milo/backend/Milo.API
sudo python3 << 'PYEND'
import json
with open('appsettings.json', 'r') as f:
    config = json.load(f)
config['Email']['UseSes'] = True
config['Email']['SesRegion'] = 'eu-west-1'
config['Email']['FromEmail'] = 'info@codingeverest.com'
with open('appsettings.json', 'w') as f:
    json.dump(config, f, indent=2)
print('Updated source appsettings.json')
PYEND

cd /home/ec2-user/milo-backend-publish
sudo python3 << 'PYEND'
import json
with open('appsettings.json', 'r') as f:
    config = json.load(f)
config['Email']['UseSes'] = True
config['Email']['SesRegion'] = 'eu-west-1'
config['Email']['FromEmail'] = 'info@codingeverest.com'
with open('appsettings.json', 'w') as f:
    json.dump(config, f, indent=2)
print('Updated publish appsettings.json')
print('Email config:')
print(json.dumps(config['Email'], indent=2))
PYEND

sudo systemctl restart milo-backend
sleep 3
sudo systemctl status milo-backend --no-pager | head -10