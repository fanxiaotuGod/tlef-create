# TLEF-CREATE DevOps Infrastructure

> **Complete AWS cloud infrastructure with Kubernetes, GitOps, and CI/CD for staging environment**

This directory contains all DevOps configurations for deploying TLEF-CREATE to AWS using modern cloud-native technologies.

## 📁 Directory Structure

```
devops/
├── terraform/          # AWS infrastructure as code
├── k8s/               # Kubernetes manifests and Helm charts
│   ├── helm/          # Helm chart for application
│   └── argocd/        # ArgoCD GitOps configuration
├── docker/            # Dockerfiles and compose files
├── ansible/           # EC2 configuration automation (future)
├── scripts/           # Deployment helper scripts (future)
└── docs/              # Additional documentation (future)
```

## 🚀 Quick Start Guide

### Prerequisites

1. **AWS Account** with free tier
2. **AWS CLI** configured with credentials
3. **Terraform** installed (>= 1.0)
4. **Git** with SSH key configured
5. **GitHub account** with repository access

### Step 1: Generate SSH Key

```bash
# Generate SSH key pair
ssh-keygen -t rsa -b 4096 -f ~/.ssh/tlef-create-staging.pem

# Get your public key
cat ~/.ssh/tlef-create-staging.pem.pub
```

### Step 2: Configure Terraform

```bash
cd devops/terraform

# Create configuration file
cp terraform.tfvars.example terraform.tfvars

# Edit with your settings
nano terraform.tfvars
```

**Important:** Set your IP address in `allowed_ssh_cidr` for security!

### Step 3: Deploy Infrastructure

```bash
# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Deploy (takes ~5-10 minutes)
terraform apply

# Save outputs
terraform output > ../../TERRAFORM_OUTPUTS.txt
```

### Step 4: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets from Terraform outputs:

```
AWS_ACCESS_KEY_ID          # From AWS IAM
AWS_SECRET_ACCESS_KEY      # From AWS IAM
AWS_REGION                 # e.g., us-west-2
AWS_ACCOUNT_ID             # Your AWS account ID
EC2_HOST                   # From terraform output: elastic_ip
EC2_SSH_KEY                # Content of ~/.ssh/tlef-create-staging.pem (PRIVATE key)
ECR_FRONTEND_REPOSITORY    # From terraform output
ECR_BACKEND_REPOSITORY     # From terraform output
OPENAI_API_KEY             # Your OpenAI API key
```

### Step 5: SSH into EC2 and Install ArgoCD

```bash
# SSH into instance (wait 3-5 minutes after terraform apply)
ssh -i ~/.ssh/tlef-create-staging.pem ubuntu@<EC2_IP>

# Clone your repository
git clone https://github.com/fanxiaotuGod/tlef-create.git
cd tlef-create
git checkout staging

# Install ArgoCD
cd devops/k8s/argocd
./install.sh

# Apply ArgoCD application
kubectl apply -f application.yaml
```

### Step 6: Push to Trigger CI/CD

```bash
# On your local machine
git checkout main
# Make some changes
git add .
git commit -m "Test CI/CD pipeline"
git push origin main

# GitHub Actions will:
# 1. Auto-merge main → staging
# 2. Build Docker images
# 3. Push to ECR
# 4. Update Helm values
# 5. ArgoCD syncs automatically
```

## 🔄 Complete Workflow

```
Developer: Push to main
     ↓
GitHub Actions: Auto-merge main → staging
     ↓
GitHub Actions: Build Docker images
     ↓
GitHub Actions: Push to AWS ECR
     ↓
GitHub Actions: Update values.yaml
     ↓
ArgoCD: Detect changes in Git
     ↓
ArgoCD: Sync Kubernetes cluster
     ↓
K8s: Rolling update deployment
     ↓
✅ Application deployed!
```

## 🛠️ Technology Stack

| Category | Technology |
|----------|-----------|
| **Cloud** | AWS (EC2, VPC, ECR, IAM) |
| **Infrastructure** | Terraform |
| **Containers** | Docker, Docker Compose |
| **Orchestration** | Kubernetes (K3s) |
| **Package Manager** | Helm |
| **GitOps** | ArgoCD |
| **CI/CD** | GitHub Actions |
| **Monitoring** | Prometheus + Grafana |
| **Security** | Let's Encrypt SSL/TLS |

## 💰 Cost Estimate

**Free Tier (12 months):** $0/month
**After Free Tier:** ~$13/month

- EC2 t2.micro: $8.50/month
- EBS 30GB: $3/month
- ECR: $0.50/month
- Data transfer: $1/month

## 📊 Monitoring

Access Grafana dashboard:
```bash
# Get Grafana NodePort
kubectl get svc -n tlef-staging | grep grafana

# Access at http://<EC2_IP>:<NodePort>
# Default credentials: admin/admin (change on first login)
```

## 🔐 Security Features

✅ SSH restricted to your IP
✅ HTTPS with SSL/TLS certificates
✅ Secrets stored in Kubernetes Secrets
✅ ECR image scanning enabled
✅ IAM roles with least privilege
✅ Security groups configured

## 🐛 Troubleshooting

### ArgoCD Not Syncing

```bash
# Check ArgoCD application status
kubectl get applications -n argocd

# View sync status
kubectl describe application tlef-create-staging -n argocd

# Force sync
kubectl patch application tlef-create-staging -n argocd \
  --type merge -p '{"operation":{"initiatedBy":{"username":"admin"},"sync":{"revision":"HEAD"}}}'
```

### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n tlef-staging

# View pod logs
kubectl logs -n tlef-staging <pod-name>

# Describe pod for events
kubectl describe pod -n tlef-staging <pod-name>
```

### ECR Push Failed

```bash
# Re-authenticate to ECR
aws ecr get-login-password --region us-west-2 | \
  docker login --username AWS --password-stdin <ECR_URL>
```

## 📚 Documentation

- [Terraform Guide](terraform/README.md)
- [Kubernetes/Helm Guide](k8s/README.md) (to be created)
- [GitHub Actions Workflows](.github/workflows/README.md) (to be created)

## 🎯 Resume Talking Points

When describing this project for your EA DevOps internship:

- ✅ **AWS Cloud Infrastructure**: Provisioned with Terraform IaC
- ✅ **Kubernetes Orchestration**: K3s cluster with Helm charts
- ✅ **GitOps Workflow**: ArgoCD for declarative deployments
- ✅ **CI/CD Pipeline**: GitHub Actions with automated testing
- ✅ **Container Registry**: AWS ECR with image scanning
- ✅ **Monitoring**: Prometheus + Grafana dashboards
- ✅ **Security**: SSL/TLS, IAM roles, network policies
- ✅ **Cost Optimization**: Free tier utilization, auto-scaling

## 🆘 Support

- **Terraform Issues**: Check `terraform/README.md`
- **Kubernetes Issues**: Run `kubectl describe` on failed resources
- **GitHub Actions**: Check Actions tab in repository
- **ArgoCD**: Access UI at `https://<EC2_IP>:<NodePort>`

---

**Built with ❤️ for UBC TLEF-CREATE**
