#!/bin/bash
# Destroy TLEF-CREATE staging infrastructure

set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}⚠️  WARNING: INFRASTRUCTURE DESTRUCTION${NC}"
echo "==========================================="
echo ""
echo "This will PERMANENTLY DELETE:"
echo "  - EC2 instance"
echo "  - All data and configurations"
echo "  - ECR repositories and images"
echo "  - VPC and networking"
echo ""
echo -e "${RED}This action CANNOT be undone!${NC}"
echo ""

read -p "Type 'DELETE' to confirm destruction: " confirm

if [ "$confirm" != "DELETE" ]; then
    echo "Destruction cancelled"
    exit 0
fi

echo ""
read -p "Are you absolutely sure? (yes/no): " confirm2

if [ "$confirm2" != "yes" ]; then
    echo "Destruction cancelled"
    exit 0
fi

echo ""
echo "🗑️  Destroying infrastructure..."
cd devops/terraform

terraform destroy

echo ""
echo -e "${YELLOW}✅ Infrastructure destroyed${NC}"
echo ""
echo "Remember to:"
echo "  - Delete GitHub Secrets if no longer needed"
echo "  - Remove local terraform.tfvars file"
echo "  - Clean up local kubeconfig if present"
