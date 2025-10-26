# 🚀 TLEF-CREATE DevOps Quick Start Checklist

**Use this checklist to deploy your infrastructure step-by-step**

---

## 📋 Phase 1: Prerequisites (30 minutes)

### AWS Account Setup
- [ ] Sign up for AWS account at https://aws.amazon.com/free/
- [ ] Verify email address
- [ ] Set up billing alerts (recommended)
- [ ] Create IAM user `tlef-devops` with AdministratorAccess
- [ ] Save Access Key ID and Secret Access Key

### Install Required Tools
- [ ] Install AWS CLI
  ```bash
  # macOS: brew install awscli
  # Linux: curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && unzip awscliv2.zip && sudo ./aws/install
  aws --version
  ```

- [ ] Configure AWS credentials
  ```bash
  aws configure
  # Enter: Access Key ID, Secret Access Key, Region (us-west-2), Format (json)
  aws sts get-caller-identity  # Verify it works
  ```

- [ ] Install Terraform
  ```bash
  # macOS: brew install terraform
  # Linux: wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
  terraform version
  ```

### Generate SSH Key
- [ ] Generate key pair
  ```bash
  ssh-keygen -t rsa -b 4096 -f ~/.ssh/tlef-create-staging.pem
  chmod 400 ~/.ssh/tlef-create-staging.pem
  ```

- [ ] Save public key
  ```bash
  cat ~/.ssh/tlef-create-staging.pem.pub > ~/tlef-ssh-public-key.txt
  ```

### Get OpenAI API Key
- [ ] Go to https://platform.openai.com/api-keys
- [ ] Create new secret key
- [ ] Save it securely

---

## 📋 Phase 2: Deploy AWS Infrastructure (25 minutes)

### Configure Terraform
- [ ] Navigate to terraform directory
  ```bash
  cd devops/terraform
  ```

- [ ] Create terraform.tfvars
  ```bash
  cp terraform.tfvars.example terraform.tfvars
  nano terraform.tfvars  # or code terraform.tfvars
  ```

- [ ] Update these values in terraform.tfvars:
  - [ ] `ssh_public_key` = Content from `~/tlef-ssh-public-key.txt`
  - [ ] `allowed_ssh_cidr` = `["YOUR.IP.HERE/32"]` (Get IP: `curl ifconfig.me`)
  - [ ] `aws_region` = `"us-west-2"` (or your preferred region)

### Deploy Infrastructure
- [ ] Initialize Terraform
  ```bash
  terraform init
  ```
  **Expected:** ✅ "Terraform has been successfully initialized!"

- [ ] Preview changes
  ```bash
  terraform plan
  ```
  **Expected:** Plan showing ~20 resources to create

- [ ] Deploy (takes 5-10 minutes)
  ```bash
  terraform apply
  ```
  **Action:** Type `yes` when prompted

- [ ] Save outputs
  ```bash
  terraform output > ../../TERRAFORM_OUTPUTS.txt
  cat ../../TERRAFORM_OUTPUTS.txt
  ```

### Verify EC2 Instance
- [ ] Wait 3-5 minutes for EC2 initialization

- [ ] Get EC2 IP address
  ```bash
  terraform output elastic_ip
  ```

- [ ] SSH into instance
  ```bash
  ssh -i ~/.ssh/tlef-create-staging.pem ubuntu@<EC2_IP>
  ```

- [ ] Verify K3s is running
  ```bash
  kubectl get nodes
  # Should show: Ready control-plane,master
  ```

- [ ] Exit EC2
  ```bash
  exit
  ```

---

## 📋 Phase 3: Configure GitHub Secrets (15 minutes)

### Gather Required Information
- [ ] Get AWS Account ID
  ```bash
  aws sts get-caller-identity --query Account --output text
  ```

- [ ] Get ECR URLs
  ```bash
  cd devops/terraform
  terraform output ecr_frontend_repository_url
  terraform output ecr_backend_repository_url
  ```

- [ ] Get EC2 IP
  ```bash
  terraform output elastic_ip
  ```

- [ ] Get SSH private key
  ```bash
  cat ~/.ssh/tlef-create-staging.pem
  ```

### Add Secrets to GitHub
- [ ] Go to https://github.com/fanxiaotuGod/tlef-create
- [ ] Click Settings → Secrets and variables → Actions
- [ ] Click "New repository secret"

Add these secrets one by one:

- [ ] `AWS_ACCESS_KEY_ID` = Your AWS access key
- [ ] `AWS_SECRET_ACCESS_KEY` = Your AWS secret key
- [ ] `AWS_REGION` = `us-west-2` (or your region)
- [ ] `AWS_ACCOUNT_ID` = From `aws sts get-caller-identity`
- [ ] `EC2_HOST` = From `terraform output elastic_ip`
- [ ] `EC2_SSH_KEY` = Full content of `~/.ssh/tlef-create-staging.pem` (PRIVATE key)
- [ ] `ECR_FRONTEND_REPOSITORY` = From `terraform output ecr_frontend_repository_url`
- [ ] `ECR_BACKEND_REPOSITORY` = From `terraform output ecr_backend_repository_url`
- [ ] `OPENAI_API_KEY` = Your OpenAI API key

---

## 📋 Phase 4: Install ArgoCD (15 minutes)

### SSH and Setup
- [ ] SSH into EC2
  ```bash
  ssh -i ~/.ssh/tlef-create-staging.pem ubuntu@<EC2_IP>
  ```

- [ ] Clone repository
  ```bash
  git clone https://github.com/fanxiaotuGod/tlef-create.git
  cd tlef-create
  ```

- [ ] Checkout staging branch
  ```bash
  git checkout staging
  ```

### Install ArgoCD
- [ ] Run install script
  ```bash
  cd devops/k8s/argocd
  ./install.sh
  ```

- [ ] Save ArgoCD credentials shown in output
  - [ ] ArgoCD UI URL: `https://<EC2_IP>:<NodePort>`
  - [ ] Username: `admin`
  - [ ] Password: `<from install output>`

### Access ArgoCD UI
- [ ] Open browser to ArgoCD URL
- [ ] Accept self-signed certificate
- [ ] Login with admin credentials
- [ ] ✅ See ArgoCD dashboard

### Deploy Application
- [ ] Apply application manifest (still in devops/k8s/argocd/)
  ```bash
  kubectl apply -f application.yaml
  ```

- [ ] Verify application created
  ```bash
  kubectl get applications -n argocd
  ```
  **Expected:** `tlef-create-staging` with status `OutOfSync`

- [ ] Check ArgoCD UI
  **Expected:** Application appears in dashboard

---

## 📋 Phase 5: Test CI/CD Pipeline (20 minutes)

### Trigger Pipeline
- [ ] On local machine, navigate to repository
- [ ] Ensure you're on main branch
  ```bash
  git checkout main
  ```

- [ ] Create test commit
  ```bash
  echo "# CI/CD Test" >> CICD-TEST.md
  git add CICD-TEST.md
  git commit -m "Test CI/CD pipeline"
  git push origin main
  ```

### Monitor GitHub Actions
- [ ] Go to https://github.com/fanxiaotuGod/tlef-create/actions
- [ ] Verify "Auto-Merge Main to Staging" workflow running
- [ ] Wait for it to complete (~ 30 seconds)
- [ ] Verify "Build and Push to ECR" workflow starts
- [ ] Wait for it to complete (~5-10 minutes)

### Monitor ArgoCD Sync
- [ ] Go back to ArgoCD UI
- [ ] Click on `tlef-create-staging` application
- [ ] Watch it sync automatically (may take 1-3 minutes)
- [ ] ✅ All resources should turn green

### Verify Deployment
- [ ] SSH into EC2
  ```bash
  ssh -i ~/.ssh/tlef-create-staging.pem ubuntu@<EC2_IP>
  ```

- [ ] Check pods
  ```bash
  kubectl get pods -n tlef-staging
  ```
  **Expected:** All pods in `Running` state

- [ ] Get frontend service port
  ```bash
  kubectl get svc -n tlef-staging | grep frontend
  ```

- [ ] Access application
  - [ ] Open browser to `http://<EC2_IP>:<Frontend-NodePort>`
  - [ ] ✅ See TLEF-CREATE login page

---

## 📋 Phase 6: Access Monitoring (10 minutes)

### Access Grafana
- [ ] Get Grafana port
  ```bash
  kubectl get svc -n tlef-staging | grep grafana
  ```

- [ ] Open browser to `http://<EC2_IP>:<Grafana-NodePort>`
- [ ] Login: `admin` / `admin`
- [ ] Change password when prompted
- [ ] ✅ See Grafana dashboard

### Explore Metrics
- [ ] Click "Explore" in left menu
- [ ] Select "Prometheus" data source
- [ ] Try query: `up`
- [ ] ✅ See monitoring data

---

## ✅ Final Verification Checklist

### Infrastructure
- [ ] EC2 instance running
- [ ] Can SSH into EC2
- [ ] K3s cluster healthy (`kubectl get nodes`)
- [ ] All pods running (`kubectl get pods -n tlef-staging`)

### GitOps
- [ ] ArgoCD installed and accessible
- [ ] Application syncing automatically
- [ ] Green status in ArgoCD UI

### CI/CD
- [ ] GitHub Actions workflows running successfully
- [ ] Docker images in ECR
- [ ] Auto-merge working (main → staging)

### Application
- [ ] Frontend accessible via browser
- [ ] Backend API responding
- [ ] MongoDB running
- [ ] Qdrant running

### Monitoring
- [ ] Grafana accessible
- [ ] Prometheus collecting metrics
- [ ] Dashboards showing data

---

## 🎉 Success!

If all checkboxes are checked, congratulations! You have:

✅ Production-grade DevOps infrastructure
✅ Automated CI/CD pipeline
✅ GitOps deployment with ArgoCD
✅ Monitoring and observability
✅ All running on AWS free tier ($0/month)

---

## 📊 What to Include in Your Resume

**DevOps Software Engineer Co-op Project**

1. "Architected and deployed production-grade cloud infrastructure on AWS using Terraform IaC, Kubernetes (K3s), and Helm, provisioning VPC networking, EC2 compute, and ECR container registry"

2. "Implemented comprehensive CI/CD pipeline with GitHub Actions integrating automated Docker builds, ECR pushes, and GitOps-based deployment via ArgoCD"

3. "Built enterprise-level monitoring infrastructure using Prometheus and Grafana for application metrics and cluster health visualization"

4. "Configured AWS security (IAM roles, security groups, secrets management) and Kubernetes network policies following DevOps best practices"

---

## 🐛 Troubleshooting

**If something doesn't work:**
1. Check logs: `kubectl logs -n tlef-staging <pod-name>`
2. Describe resource: `kubectl describe pod -n tlef-staging <pod-name>`
3. Check ArgoCD: Look for errors in ArgoCD UI
4. Verify secrets: `kubectl get secrets -n tlef-staging`

**Full troubleshooting guide:** See `devops/SETUP-GUIDE.md`

---

## 📚 Next Steps

- [ ] Configure SSL/TLS with Let's Encrypt
- [ ] Set up custom domain name
- [ ] Add more Grafana dashboards
- [ ] Implement backup strategy
- [ ] Create blue-green deployment

---

**🎯 Ready for your EA DevOps internship interview!**

Print this checklist and check off items as you complete them. Good luck! 🚀
