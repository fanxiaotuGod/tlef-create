#!/bin/bash
# Emergency ArgoCD shutdown script for when the instance is struggling with resource issues
# This completely disables ArgoCD and cleans up all application resources
# Author: DevOps Automation
# Usage: ./emergency-stop-argocd.sh (run when instance is already running but struggling)

# Emergency script to disable all ArgoCD applications and clean up resources

set -e

SSH_KEY="~/.ssh/tlef-create-staging.pem"
SERVER_IP="44.254.85.218"

echo "🚨 Emergency ArgoCD shutdown and cleanup..."

ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$SERVER_IP << 'EOF'
    export KUBECONFIG=/home/ubuntu/.kube/config
    
    echo "=== Stopping all ArgoCD components ==="
    kubectl scale deployment argocd-application-controller -n argocd --replicas=0
    kubectl scale deployment argocd-server -n argocd --replicas=0
    kubectl scale deployment argocd-repo-server -n argocd --replicas=0
    kubectl scale deployment argocd-dex-server -n argocd --replicas=0
    kubectl scale deployment argocd-redis -n argocd --replicas=0
    kubectl scale statefulset argocd-application-controller -n argocd --replicas=0 || true
    
    echo "=== Deleting ArgoCD applications to prevent auto-sync ==="
    kubectl delete applications --all -n argocd --ignore-not-found=true
    
    echo "=== Cleaning up all application resources ==="
    kubectl delete deployment --all -n default --ignore-not-found=true
    kubectl delete statefulset --all -n default --ignore-not-found=true
    kubectl delete pods --all -n default --ignore-not-found=true
    kubectl delete services --all -n default --ignore-not-found=true
    kubectl delete configmaps --all -n default --ignore-not-found=true
    kubectl delete secrets --all -n default --ignore-not-found=true
    kubectl delete pvc --all -n default --ignore-not-found=true
    
    echo "=== Current resource status ==="
    kubectl get all -n default
    kubectl get all -n argocd
    
    echo "=== Memory and CPU usage ==="
    kubectl top nodes
    kubectl top pods -n argocd
    
    echo "✅ Emergency cleanup complete - ArgoCD fully disabled!"
EOF

echo "🎉 Emergency shutdown complete. Instance should be stable now."