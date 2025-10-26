#!/bin/bash

# Quick fix: Test if we can run the backend with a different approach
# Let's try rebuilding the container with proper native dependencies

set -e

echo "🔍 Analyzing backend container native dependency issue..."

# Navigate to the project directory
cd /Users/fanhaocheng/tlef-create/devops-project/tlef-create

echo "📦 Checking current package-lock.json for tokenizer dependencies..."
grep -A 10 -B 2 "@anush008/tokenizers" package-lock.json | head -20

echo ""
echo "🔧 Option 1: Add explicit installation of musl native dependency to Dockerfile"
echo "🔧 Option 2: Switch to node:20 (glibc) instead of node:20-alpine (musl)"
echo "🔧 Option 3: Force reinstall tokenizers in container during build"

echo ""
echo "Let's try Option 1: Modify Dockerfile to explicitly install musl tokenizers"