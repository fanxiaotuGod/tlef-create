#!/bin/bash

echo "🧪 Testing backend startup step by step..."

# Test 1: Can the container start at all?
echo "🔍 Test 1: Container startup"
ssh -i ~/.ssh/tlef-create-staging.pem ubuntu@44.254.85.218 "timeout 10 kubectl run test1 --image=396913700179.dkr.ecr.us-west-2.amazonaws.com/tlef-create-backend:latest -n tlef-staging --rm --command -- echo 'Container works'" || echo "Test 1 failed"

# Test 2: Can Node.js run?  
echo "🔍 Test 2: Node.js execution"
ssh -i ~/.ssh/tlef-create-staging.pem ubuntu@44.254.85.218 "timeout 10 kubectl run test2 --image=396913700179.dkr.ecr.us-west-2.amazonaws.com/tlef-create-backend:latest -n tlef-staging --rm --command -- node -e 'console.log(\"Node works\")'" || echo "Test 2 failed"

# Test 3: Can we access the files?
echo "🔍 Test 3: File system access"  
ssh -i ~/.ssh/tlef-create-staging.pem ubuntu@44.254.85.218 "timeout 10 kubectl run test3 --image=396913700179.dkr.ecr.us-west-2.amazonaws.com/tlef-create-backend:latest -n tlef-staging --rm --command -- ls -la" || echo "Test 3 failed"

# Test 4: Can we load basic modules?
echo "🔍 Test 4: Module loading"
ssh -i ~/.ssh/tlef-create-staging.pem ubuntu@44.254.85.218 "timeout 10 kubectl run test4 --image=396913700179.dkr.ecr.us-west-2.amazonaws.com/tlef-create-backend:latest -n tlef-staging --rm --command -- node -e 'import(\"express\").then(() => console.log(\"Express OK\")).catch(e => console.log(\"Express fail:\", e.message))'" || echo "Test 4 failed"

echo "✅ Step-by-step tests completed"