#!/bin/bash
# Install ArgoCD on K3s cluster

set -e

echo "🚀 Installing ArgoCD on K3s..."

# Create argocd namespace
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -

# Install ArgoCD
echo "📦 Installing ArgoCD components..."
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for ArgoCD to be ready
echo "⏳ Waiting for ArgoCD pods to be ready..."
kubectl wait --for=condition=available --timeout=300s \
  deployment/argocd-server \
  deployment/argocd-repo-server \
  deployment/argocd-application-controller \
  -n argocd

echo "✅ ArgoCD installed successfully!"

# Patch ArgoCD server service to use NodePort for external access
echo "🔧 Configuring ArgoCD server for external access..."
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "NodePort"}}'

# Get the NodePort
ARGOCD_PORT=$(kubectl get svc argocd-server -n argocd -o jsonpath='{.spec.ports[0].nodePort}')
echo "📡 ArgoCD UI will be available on port: $ARGOCD_PORT"

# Get the initial admin password
echo "🔐 Retrieving ArgoCD admin password..."
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ ArgoCD Installation Complete!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🌐 Access ArgoCD UI at: https://<EC2_IP>:$ARGOCD_PORT"
echo "👤 Username: admin"
echo "🔑 Password: $ARGOCD_PASSWORD"
echo ""
echo "⚠️  IMPORTANT: Change the admin password after first login!"
echo ""
echo "Next steps:"
echo "1. Access the ArgoCD UI"
echo "2. Login with the credentials above"
echo "3. Apply the application manifest:"
echo "   kubectl apply -f devops/k8s/argocd/application.yaml"
echo ""
echo "═══════════════════════════════════════════════════════════════"
