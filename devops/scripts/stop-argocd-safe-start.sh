#!/bin/bash
# Safe EC2 start script that disables ArgoCD to prevent automatic deployments
# Use this when you want to start the instance without ArgoCD immediately trying to deploy resources
# Author: DevOps Automation
# Usage: ./stop-argocd-safe-start.sh

set -e

INSTANCE_ID="i-0d678788bc820fb9c"
SSH_KEY="~/.ssh/tlef-create-staging.pem"
SERVER_IP="44.254.85.218"

echo "🚀 Starting EC2 instance..."
aws ec2 start-instances --instance-ids $INSTANCE_ID

echo "⏳ Waiting for instance to be fully running..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

echo "⏳ Waiting additional 60 seconds for SSH to be ready..."
sleep 60

echo "🛑 Stopping ArgoCD to prevent automatic deployments..."
ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$SERVER_IP << 'EOF'
    # Set kubeconfig
    export KUBECONFIG=/home/ubuntu/.kube/config
    
    # Stop ArgoCD application controller (prevents auto-sync)
    kubectl scale deployment argocd-application-controller -n argocd --replicas=0
    
    # Stop ArgoCD server (prevents UI access but that's safer)
    kubectl scale deployment argocd-server -n argocd --replicas=0
    
    # Stop ArgoCD repo server
    kubectl scale deployment argocd-repo-server -n argocd --replicas=0
    
    # Check what's currently running
    echo "=== Current pods in default namespace ==="
    kubectl get pods -n default
    
    echo "=== Current pods in argocd namespace ==="
    kubectl get pods -n argocd
    
    echo "=== Node resource usage ==="
    kubectl top nodes
    
    echo "=== Failed pods cleanup ==="
    kubectl delete pods --field-selector=status.phase=Failed -n default --ignore-not-found=true
    kubectl delete pods --field-selector=status.phase=Succeeded -n default --ignore-not-found=true
    
    echo "✅ ArgoCD stopped and failed pods cleaned up!"
EOF

echo "🎉 Instance started with ArgoCD disabled. Safe to investigate!"
echo "📞 SSH command: ssh -i $SSH_KEY ubuntu@$SERVER_IP"