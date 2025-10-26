#!/bin/bash
# Health check script for TLEF-CREATE staging environment

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🏥 TLEF-CREATE Health Check"
echo "============================"
echo ""

# Get EC2 IP
if [ -f "TERRAFORM_OUTPUTS.txt" ]; then
    EC2_IP=$(grep "elastic_ip" TERRAFORM_OUTPUTS.txt | awk '{print $3}' | tr -d '"')
else
    echo -e "${YELLOW}⚠️  TERRAFORM_OUTPUTS.txt not found${NC}"
    read -p "Enter EC2 IP address: " EC2_IP
fi

echo "📍 Checking server: $EC2_IP"
echo ""

# Check SSH connectivity
echo -n "🔐 SSH connectivity... "
if ssh -i ~/.ssh/tlef-create-staging.pem -o StrictHostKeyChecking=no -o ConnectTimeout=5 ubuntu@$EC2_IP "echo ok" &> /dev/null; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
    exit 1
fi

# Check K3s
echo -n "☸️  K3s cluster... "
K3S_STATUS=$(ssh -i ~/.ssh/tlef-create-staging.pem ubuntu@$EC2_IP "kubectl get nodes --no-headers 2>/dev/null | wc -l")
if [ "$K3S_STATUS" -gt 0 ]; then
    echo -e "${GREEN}✅ ($K3S_STATUS nodes)${NC}"
else
    echo -e "${RED}❌${NC}"
fi

# Check ArgoCD
echo -n "🔄 ArgoCD... "
ARGOCD_STATUS=$(ssh -i ~/.ssh/tlef-create-staging.pem ubuntu@$EC2_IP "kubectl get pods -n argocd --no-headers 2>/dev/null | grep -c Running")
if [ "$ARGOCD_STATUS" -gt 0 ]; then
    echo -e "${GREEN}✅ ($ARGOCD_STATUS pods running)${NC}"
else
    echo -e "${RED}❌${NC}"
fi

# Check application pods
echo -n "📦 Application pods... "
APP_STATUS=$(ssh -i ~/.ssh/tlef-create-staging.pem ubuntu@$EC2_IP "kubectl get pods -n tlef-staging --no-headers 2>/dev/null | grep -c Running" || echo "0")
if [ "$APP_STATUS" -gt 0 ]; then
    echo -e "${GREEN}✅ ($APP_STATUS pods running)${NC}"
else
    echo -e "${YELLOW}⚠️  (0 pods - may not be deployed yet)${NC}"
fi

# Check monitoring
echo -n "📊 Monitoring stack... "
MON_STATUS=$(ssh -i ~/.ssh/tlef-create-staging.pem ubuntu@$EC2_IP "kubectl get pods -n monitoring --no-headers 2>/dev/null | grep -c Running" || echo "0")
if [ "$MON_STATUS" -gt 0 ]; then
    echo -e "${GREEN}✅ ($MON_STATUS pods running)${NC}"
else
    echo -e "${YELLOW}⚠️  (not deployed)${NC}"
fi

echo ""
echo "📋 Detailed Status:"
echo ""
ssh -i ~/.ssh/tlef-create-staging.pem ubuntu@$EC2_IP "kubectl get pods -A"

echo ""
echo -e "${GREEN}✅ Health check complete${NC}"
