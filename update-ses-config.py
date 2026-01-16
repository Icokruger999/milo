#!/usr/bin/env python3
import json

files = [
    '/home/ec2-user/milo/backend/Milo.API/appsettings.json',
    '/home/ec2-user/milo-backend-publish/appsettings.json'
]

for filepath in files:
    with open(filepath, 'r') as f:
        config = json.load(f)
    
    config['Email']['UseSes'] = True
    config['Email']['SesRegion'] = 'eu-west-1'
    config['Email']['FromEmail'] = 'info@codingeverest.com'
    
    with open(filepath, 'w') as f:
        json.dump(config, f, indent=2)
    
    print(f'Updated: {filepath}')

print('\nEmail config:')
print(json.dumps(config['Email'], indent=2))
