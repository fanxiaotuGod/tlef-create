# TLEF-CREATE DevOps Setup Guide

**Complete step-by-step guide to deploy your staging environment**

## 🎯 What You'll Build

By the end of this guide, you'll have:

- ✅ AWS cloud infrastructure (VPC, EC2, ECR)
- ✅ Kubernetes cluster running on EC2
- ✅ Automated CI/CD pipeline
- ✅ GitOps deployment with ArgoCD
- ✅ Monitoring with Prometheus + Grafana
- ✅ Production-ready staging environment

**Time to complete:** 1-2 hours (mostly waiting for AWS provisioning)

---

## 📋 Prerequisites Checklist

Before starting, ensure you have:

### 1. AWS Account
- [ ] Created AWS account at https://aws.amazon.com/free/
- [ ] Verified email address
- [ ] Set up billing alerts (recommended)

### 2. AWS CLI
```bash
# macOS
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verify installation
aws --version
```

### 3. AWS IAM User
1. Go to AWS Console → IAM → Users → Add User
2. User name: `tlef-devops`
3. Access type: ✅ Programmatic access
4. Permissions: Attach `AdministratorAccess` policy (for setup)
5. Save Access Key ID and Secret Access Key

```bash
# Configure AWS CLI
aws configure
# AWS Access Key ID: <paste your key>
# AWS Secret Access Key: <paste your secret>
# Default region: us-west-2
# Default output format: json

# Verify configuration
aws sts get-caller-identity
```

### 4. Terraform
```bash
# macOS
brew install terraform

# Linux
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# Verify installation
terraform version
```

### 5. SSH Key
```bash
# Generate SSH key pair
ssh-keygen -t rsa -b 4096 -f ~/.ssh/tlef-create-staging.pem
# Press Enter for no passphrase (or set one if you prefer)

# Set proper permissions
chmod 400 ~/.ssh/tlef-create-staging.pem

# Get public key (you'll need this for Terraform)
cat ~/.ssh/tlef-create-staging.pem.pub
```

### 6. OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Save it securely (you'll add it to GitHub Secrets later)

---

## 🚀 Phase 1: Deploy AWS Infrastructure with Terraform

### Step 1.1: Configure Terraform Variables

```bash
cd devops/terraform

# Copy example configuration
cp terraform.tfvars.example terraform.tfvars

# Edit the file
nano terraform.tfvars  # or use your preferred editor
```

**Required values to set:**

```hcl
# Your SSH public key
ssh_public_key = "ssh-rsa AAAAB3NzaC1yc2E... your-email@example.com"
# Paste from: cat ~/.ssh/tlef-create-staging.pem.pub

# Your IP address (for SSH security)
allowed_ssh_cidr = ["YOUR.IP.ADDRESS.HERE/32"]
# Get your IP: curl ifconfig.me
# Example: ["123.456.789.0/32"]

# AWS region (optional, default is us-west-2)
aws_region = "us-west-2"
```

### Step 1.2: Initialize Terraform

```bash
terraform init
```

Expected output:
```
Terraform has been successfully initialized!
```

### Step 1.3: Preview Infrastructure

```bash
terraform plan
```

Review the output. You should see:
- VPC and networking components
- EC2 t2.micro instance
- 2 ECR repositories
- Security groups
- IAM roles

### Step 1.4: Deploy Infrastructure

```bash
terraform apply
```

- Type `yes` when prompted
- **Wait 5-10 minutes** for deployment
- ☕ Grab a coffee while it deploys!

### Step 1.5: Save Terraform Outputs

```bash
# Save outputs to file
terraform output > ../../TERRAFORM_OUTPUTS.txt

# View important outputs
terraform output ec2_public_ip
terraform output ecr_frontend_repository_url
terraform output ecr_backend_repository_url
```

**⚠️ IMPORTANT:** Save these values! You'll need them for GitHub Secrets.

### Step 1.6: Verify EC2 Instance

```bash
# Wait 3-5 minutes for EC2 initialization to complete
# Then SSH into the instance
ssh -i ~/.ssh/tlef-create-staging.pem ubuntu@<EC2_PUBLIC_IP>

# Inside EC2, verify K3s is running
kubectl get nodes

# Should show:
# NAME          STATUS   ROLES                  AGE   VERSION
# ip-10-0-1-x   Ready    control-plane,master   5m    v1.27.x+k3s1

# Exit EC2
exit
```

✅ **Phase 1 Complete!** You now have AWS infrastructure running.

---

## 🔐 Phase 2: Configure GitHub Secrets

### Step 2.1: Get AWS Account ID

```bash
aws sts get-caller-identity --query Account --output text
```

### Step 2.2: Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

Add these secrets (one by one):

| Secret Name | Value | Where to Get It |
|-------------|-------|-----------------|
| `AWS_ACCESS_KEY_ID` | Your AWS access key | From AWS IAM user creation |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key | From AWS IAM user creation |
| `AWS_REGION` | `us-west-2` (or your region) | Your choice |
| `AWS_ACCOUNT_ID` | Your AWS account ID | `aws sts get-caller-identity` |
| `EC2_HOST` | EC2 public IP | `terraform output elastic_ip` |
| `EC2_SSH_KEY` | **Private** SSH key content | `cat ~/.ssh/tlef-create-staging.pem` |
| `ECR_FRONTEND_REPOSITORY` | ECR frontend URL | `terraform output ecr_frontend_repository_url` |
| `ECR_BACKEND_REPOSITORY` | ECR backend URL | `terraform output ecr_backend_repository_url` |
| `OPENAI_API_KEY` | Your OpenAI API key | From OpenAI dashboard |

**⚠️ CRITICAL:** For `EC2_SSH_KEY`, paste the **PRIVATE** key (not the .pub file):
```bash
cat ~/.ssh/tlef-create-staging.pem
# Copy the entire output including:
# -----BEGIN OPENSSH PRIVATE KEY-----
# ...
# -----END OPENSSH PRIVATE KEY-----
```

✅ **Phase 2 Complete!** GitHub Actions can now deploy to your infrastructure.

---

## ☸️ Phase 3: Install ArgoCD for GitOps

### Step 3.1: SSH into EC2

```bash
ssh -i ~/.ssh/tlef-create-staging.pem ubuntu@<EC2_IP>
```

### Step 3.2: Clone Repository

```bash
# Clone your fork
git clone https://github.com/fanxiaotuGod/tlef-create.git
cd tlef-create

# Checkout staging branch
git checkout staging
```

### Step 3.3: Install ArgoCD

```bash
cd devops/k8s/argocd
./install.sh
```

**Expected output:**
```
🚀 Installing ArgoCD on K3s...
📦 Installing ArgoCD components...
⏳ Waiting for ArgoCD pods to be ready...
✅ ArgoCD installed successfully!

Access ArgoCD UI at: https://<EC2_IP>:XXXXX
Username: admin
Password: <random-password>
```

**Save the ArgoCD password!**

### Step 3.4: Access ArgoCD UI

1. Open browser to `https://<EC2_IP>:<NodePort>`
2. Accept self-signed certificate warning
3. Login with username `admin` and the password from install output
4. You should see the ArgoCD dashboard (empty for now)

### Step 3.5: Deploy Application to ArgoCD

```bash
# Still in devops/k8s/argocd/ directory
kubectl apply -f application.yaml
```

**Verify:**
```bash
kubectl get applications -n argocd

# Should show:
# NAME                  SYNC STATUS   HEALTH STATUS
# tlef-create-staging   OutOfSync     Missing
```

✅ **Phase 3 Complete!** ArgoCD is installed and configured.

---

## 🎬 Phase 4: Test the Complete CI/CD Pipeline

### Step 4.1: Trigger Pipeline

```bash
# On your local machine (not EC2)
cd /path/to/your/tlef-create

# Make sure you're on main branch
git checkout main

# Make a small change (e.g., update README)
echo "# Testing CI/CD" >> TEST.md
git add TEST.md
git commit -m "Test CI/CD pipeline"
git push origin main
```

### Step 4.2: Watch GitHub Actions

1. Go to your GitHub repository
2. Click **Actions** tab
3. You should see two workflows running:
   - ✅ Auto-Merge Main to Staging
   - ✅ Build and Push to ECR

### Step 4.3: Monitor ArgoCD Sync

1. Go back to ArgoCD UI
2. Click on `tlef-create-staging` application
3. Watch it automatically sync (may take 1-3 minutes)
4. Pods will appear and turn green as they deploy

### Step 4.4: Verify Deployment

```bash
# SSH into EC2
ssh -i ~/.ssh/tlef-create-staging.pem ubuntu@<EC2_IP>

# Check pods
kubectl get pods -n tlef-staging

# Should show all pods running:
# NAME                              READY   STATUS    RESTARTS   AGE
# tlef-create-frontend-xxx          1/1     Running   0          2m
# tlef-create-backend-xxx           1/1     Running   0          2m
# tlef-create-mongodb-0             1/1     Running   0          2m
# tlef-create-qdrant-0              1/1     Running   0          2m
# tlef-create-saml-xxx              1/1     Running   0          2m
```

### Step 4.5: Access Your Application

```bash
# Get the frontend service port
kubectl get svc -n tlef-staging

# Find tlef-create-frontend service NodePort
```

Open browser to: `http://<EC2_IP>:<NodePort>`

🎉 **Your application should be running!**

✅ **Phase 4 Complete!** CI/CD pipeline is fully functional.

---

## 📊 Phase 5: Access Monitoring (Grafana)

### Step 5.1: Get Grafana Port

```bash
kubectl get svc -n tlef-staging | grep grafana
```

### Step 5.2: Access Grafana

1. Open browser to `http://<EC2_IP>:<Grafana-NodePort>`
2. Login: `admin` / `admin`
3. Change password when prompted
4. Explore dashboards

---

## 🎯 Success Checklist

You should now have:

- [x] AWS infrastructure running (EC2, VPC, ECR)
- [x] Kubernetes cluster (K3s) on EC2
- [x] ArgoCD installed and syncing
- [x] GitHub Actions workflows configured
- [x] Docker images building and pushing to ECR
- [x] Application deployed and accessible
- [x] Monitoring with Grafana

---

## 🐛 Troubleshooting

### Issue: Terraform apply fails

**Solution:**
```bash
# Check AWS credentials
aws sts get-caller-identity

# Verify region supports t2.micro
# Try us-west-2 or us-east-1
```

### Issue: Can't SSH to EC2

**Solutions:**
1. Wait 3-5 minutes after `terraform apply` (EC2 needs to boot)
2. Verify your IP in `allowed_ssh_cidr`
3. Check key permissions: `chmod 400 ~/.ssh/tlef-create-staging.pem`

### Issue: GitHub Actions failing

**Solutions:**
1. Verify all GitHub Secrets are set correctly
2. Check Actions logs for specific error
3. Ensure ECR repository URLs are correct

### Issue: ArgoCD not syncing

**Solution:**
```bash
# Force sync
kubectl patch application tlef-create-staging -n argocd \
  --type merge -p '{"operation":{"sync":{"syncStrategy":{"hook":{}}}}}'
```

### Issue: Pods crash-looping

**Solution:**
```bash
# Check logs
kubectl logs -n tlef-staging <pod-name>

# Describe pod for events
kubectl describe pod -n tlef-staging <pod-name>

# Common issue: Missing secrets
kubectl get secrets -n tlef-staging
```

---

## 🎓 Next Steps

1. ✅ Configure SSL/TLS certificates (Let's Encrypt)
2. ✅ Set up custom domain name
3. ✅ Configure backup and disaster recovery
4. ✅ Add more monitoring dashboards
5. ✅ Implement blue-green deployments

---

## 📞 Getting Help

- **Terraform Issues**: Check `devops/terraform/README.md`
- **Kubernetes Issues**: Run `kubectl describe` on failed resources
- **ArgoCD Issues**: Check ArgoCD UI Application events
- **GitHub Actions**: Review workflow logs in Actions tab

---

**🎉 Congratulations! You've built a production-grade DevOps infrastructure!**

This setup demonstrates skills highly valued by EA's DevOps team:
- Cloud infrastructure (AWS)
- Container orchestration (Kubernetes)
- GitOps workflows (ArgoCD)
- CI/CD automation (GitHub Actions)
- Infrastructure as Code (Terraform)
- Monitoring and observability

Perfect for your EA DevOps internship application! 🚀
