#!/bin/bash
# Debug backend application startup issues
# Run this to investigate why the backend container exits immediately

set -e

SSH_KEY="~/.ssh/tlef-create-staging.pem"
SERVER_IP="44.254.85.218"

echo "🔍 Debugging backend application startup..."

ssh -i $SSH_KEY ubuntu@$SERVER_IP << 'EOF'
    export KUBECONFIG=/home/ubuntu/.kube/config
    
    echo "=== Check backend secrets ==="
    kubectl get secret tlef-create-secrets -n default -o yaml | grep -A 10 data:
    
    echo -e "\n=== Check if secrets exist in container ==="
    kubectl exec -it $(kubectl get pods -l component=backend -n default -o name | head -1) -n default -- env | grep -E "(MONGODB|QDRANT|SESSION|OPENAI)" || echo "Pod not running or env vars missing"
    
    echo -e "\n=== Check backend pod events ==="
    kubectl describe pod -l component=backend -n default | grep -A 20 Events:
    
    echo -e "\n=== Test database connectivity ==="
    kubectl exec -it tlef-create-mongodb-0 -n tlef-staging -- mongosh --eval "db.adminCommand('ping')" || echo "MongoDB connection test failed"
    
    echo -e "\n=== Check if backend expects different startup command ==="
    kubectl exec -it $(kubectl get pods -l component=backend -n default -o name | head -1) -n default -- ps aux || echo "Cannot check processes"
EOF

echo "🎯 Common issues to check:"
echo "  1. Missing or incorrect secret values"
echo "  2. Backend app expects different startup command"
echo "  3. Database connection failures"
echo "  4. Missing environment variables"