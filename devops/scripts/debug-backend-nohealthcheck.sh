#!/bin/bash

# Create a simple debug deployment without health checks to see logs

set -e

echo "🔍 Creating debug backend deployment without health checks..."

# Navigate to the project directory  
cd /Users/fanhaocheng/tlef-create/devops-project/tlef-create

# Create temporary debug deployment
cat > /tmp/debug-backend.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: debug-backend
  namespace: tlef-staging
spec:
  replicas: 1
  selector:
    matchLabels:
      app: debug-backend
  template:
    metadata:
      labels:
        app: debug-backend
    spec:
      containers:
      - name: backend
        image: 396913700179.dkr.ecr.us-west-2.amazonaws.com/tlef-create-backend:latest
        ports:
        - containerPort: 8051
        env:
        - name: NODE_ENV
          value: "development"  # Use development mode for more logging
        - name: PORT
          value: "8051"
        - name: MONGODB_URI
          value: "mongodb://test:test@tlef-create-mongodb:27017/tlef-create"  # Simple fallback
        # Remove complex environment variables for initial test
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "250m"
      imagePullSecrets:
      - name: ecr-secret
---
apiVersion: v1
kind: Service
metadata:
  name: debug-backend
  namespace: tlef-staging
spec:
  selector:
    app: debug-backend
  ports:
  - port: 8051
    targetPort: 8051
EOF

echo "📦 Deploying debug backend without health checks..."
echo "This will help us see the actual logs and startup behavior"