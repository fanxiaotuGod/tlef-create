#!/bin/bash
# Complete deployment script for TLEF-CREATE staging environment

set -e

echo "🚀 TLEF-CREATE Staging Deployment Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Terraform
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}❌ Terraform is not installed${NC}"
    echo "Install: brew install terraform (macOS) or visit https://www.terraform.io/"
    exit 1
fi

# Check Ansible
if ! command -v ansible &> /dev/null; then
    echo -e "${RED}❌ Ansible is not installed${NC}"
    echo "Install: pip3 install ansible"
    exit 1
fi

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed${NC}"
    echo "Install: brew install awscli (macOS)"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites met${NC}"
echo ""

# Step 1: Deploy infrastructure with Terraform
echo "📦 Step 1: Deploying AWS infrastructure with Terraform..."
cd devops/terraform

if [ ! -f "terraform.tfvars" ]; then
    echo -e "${RED}❌ terraform.tfvars not found${NC}"
    echo "Please create terraform.tfvars from terraform.tfvars.example"
    exit 1
fi

terraform init
terraform plan -out=tfplan
read -p "Do you want to apply this Terraform plan? (yes/no): " apply_tf

if [ "$apply_tf" = "yes" ]; then
    terraform apply tfplan
    terraform output > ../../TERRAFORM_OUTPUTS.txt
    echo -e "${GREEN}✅ Infrastructure deployed${NC}"
else
    echo -e "${YELLOW}⚠️  Terraform apply skipped${NC}"
    exit 0
fi

# Get EC2 IP from Terraform output
EC2_IP=$(terraform output -raw elastic_ip 2>/dev/null || terraform output -raw ec2_public_ip)

if [ -z "$EC2_IP" ]; then
    echo -e "${RED}❌ Could not get EC2 IP from Terraform outputs${NC}"
    exit 1
fi

echo "📍 EC2 IP: $EC2_IP"
echo ""

# Step 2: Wait for EC2 to be ready
echo "⏳ Step 2: Waiting for EC2 instance to be ready..."
echo "   This may take 3-5 minutes for initial boot..."

for i in {1..30}; do
    if ssh -i ~/.ssh/tlef-create-staging.pem -o StrictHostKeyChecking=no -o ConnectTimeout=5 ubuntu@$EC2_IP "echo ready" &> /dev/null; then
        echo -e "${GREEN}✅ EC2 instance is ready${NC}"
        break
    fi
    echo -n "."
    sleep 10

    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ EC2 instance not responding${NC}"
        exit 1
    fi
done

echo ""

# Step 3: Run Ansible playbooks
echo "🔧 Step 3: Configuring server with Ansible..."
cd ../../devops/ansible

# Update inventory with EC2 IP
export EC2_HOST=$EC2_IP

# Run complete deployment
ansible-playbook -i inventory/staging.yml playbooks/deploy-all.yml

echo ""
echo -e "${GREEN}🎉 ═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo -e "${GREEN}🎉 ═══════════════════════════════════════════════${NC}"
echo ""
echo "📍 Server IP: $EC2_IP"
echo ""
echo "📝 Next steps:"
echo "1. SSH to server: ssh -i ~/.ssh/tlef-create-staging.pem ubuntu@$EC2_IP"
echo "2. Check ArgoCD credentials: cat ~/argocd-credentials.txt"
echo "3. Check monitoring credentials: cat ~/monitoring-credentials.txt"
echo "4. View all pods: kubectl get pods -A"
echo ""
echo "📊 Access URLs:"
echo "- ArgoCD: Check ~/argocd-credentials.txt on server"
echo "- Grafana: Check ~/monitoring-credentials.txt on server"
echo ""
