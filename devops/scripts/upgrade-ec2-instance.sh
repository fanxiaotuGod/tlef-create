#!/bin/bash
# Upgrade EC2 instance from t3.small to t3.medium for better memory capacity
# Author: DevOps Automation
# Usage: ./upgrade-ec2-instance.sh

set -e

INSTANCE_ID="i-0d678788bc820fb9c"
NEW_INSTANCE_TYPE="t3.medium"
OLD_INSTANCE_TYPE="t3.small"

echo "🚀 Upgrading EC2 instance from $OLD_INSTANCE_TYPE to $NEW_INSTANCE_TYPE..."

echo "⏹️  Step 1: Stopping instance..."
aws ec2 stop-instances --instance-ids $INSTANCE_ID

echo "⏳ Waiting for instance to be fully stopped..."
aws ec2 wait instance-stopped --instance-ids $INSTANCE_ID

echo "🔧 Step 2: Modifying instance type..."
aws ec2 modify-instance-attribute \
    --instance-id $INSTANCE_ID \
    --instance-type Value=$NEW_INSTANCE_TYPE

echo "✅ Instance type modified successfully!"

echo "🚀 Step 3: Starting upgraded instance..."
aws ec2 start-instances --instance-ids $INSTANCE_ID

echo "⏳ Waiting for instance to be fully running..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

echo "⏳ Waiting additional 60 seconds for system to initialize..."
sleep 60

echo "🎉 Upgrade complete! Instance details:"
aws ec2 describe-instances --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].{InstanceType:InstanceType,State:State.Name,PublicIP:PublicIpAddress}' \
    --output table

echo ""
echo "📊 New specifications:"
echo "  - Instance Type: t3.medium"
echo "  - Memory: 4GB (up from 2GB)"
echo "  - vCPUs: 2 (up from 2)"
echo "  - Cost: ~$24.82/month (up from $12.41/month)"
echo ""
echo "🔗 SSH command: ssh -i ~/.ssh/tlef-create-staging.pem ubuntu@44.254.85.218"