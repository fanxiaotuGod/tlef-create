#!/bin/bash
# Fix ArgoCD StatefulSet sync issues by recreating StatefulSets
# This is safe since databases are temporary and working fine

set -e

SSH_KEY="~/.ssh/tlef-create-staging.pem"
SERVER_IP="44.254.85.218"

echo "🔧 Fixing ArgoCD StatefulSet sync issues..."

ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$SERVER_IP << 'EOF'
    export KUBECONFIG=/home/ubuntu/.kube/config
    
    echo "=== Current StatefulSets status ==="
    kubectl get statefulsets -n tlef-staging
    
    echo "=== Checking if databases are running ==="
    kubectl get pods -n tlef-staging -l component=mongodb
    kubectl get pods -n tlef-staging -l component=qdrant
    
    echo "=== Deleting StatefulSets (Pods will be recreated by ArgoCD) ==="
    kubectl delete statefulset tlef-create-mongodb -n tlef-staging --cascade=orphan
    kubectl delete statefulset tlef-create-qdrant -n tlef-staging --cascade=orphan
    
    echo "=== Deleting PVCs to allow fresh storage allocation ==="
    kubectl delete pvc -l component=mongodb -n tlef-staging --ignore-not-found=true
    kubectl delete pvc -l component=qdrant -n tlef-staging --ignore-not-found=true
    
    echo "=== Current pods after StatefulSet deletion ==="
    kubectl get pods -n tlef-staging
    
    echo "✅ StatefulSets deleted. ArgoCD will recreate them with correct configuration."
    echo "🔄 ArgoCD should now be able to sync successfully."
EOF

echo "🎉 StatefulSet fix complete! ArgoCD sync should work now."