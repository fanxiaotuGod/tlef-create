# Terraform Infrastructure for TLEF-CREATE Staging

This directory contains Terraform configuration to provision AWS infrastructure for the TLEF-CREATE staging environment.

## 📋 What Gets Created

- **VPC**: Isolated network (10.0.0.0/16)
- **Public Subnet**: For internet-facing resources
- **Internet Gateway**: Internet access
- **EC2 Instance**: t2.micro with Ubuntu 22.04 LTS
  - Docker & Docker Compose installed
  - K3s (Kubernetes) installed and configured
  - Kubectl & Helm installed
  - Auto-configured for GitOps deployment
- **Security Groups**: Firewall rules (SSH, HTTP, HTTPS, K8s API)
- **ECR Repositories**: Container registries for frontend and backend
- **IAM Roles**: Permissions for EC2 to pull from ECR
- **Elastic IP** (optional): Static IP address

## 🚀 Prerequisites

1. **AWS Account**
   - Sign up at https://aws.amazon.com/free/
   - Free tier includes 750 hours of t2.micro per month

2. **AWS CLI Installed**
   ```bash
   # macOS
   brew install awscli

   # Linux
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   ```

3. **AWS Credentials Configured**
   ```bash
   aws configure
   # Enter your:
   # - AWS Access Key ID
   # - AWS Secret Access Key
   # - Default region (e.g., us-west-2)
   # - Default output format (json)
   ```

4. **Terraform Installed**
   ```bash
   # macOS
   brew install terraform

   # Linux
   wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
   unzip terraform_1.6.0_linux_amd64.zip
   sudo mv terraform /usr/local/bin/
   ```

5. **SSH Key Pair Generated**
   ```bash
   ssh-keygen -t rsa -b 4096 -f ~/.ssh/tlef-create-staging.pem
   # Press Enter for no passphrase (or set one if you prefer)
   ```

## ⚙️ Configuration

### Step 1: Create terraform.tfvars

```bash
cp terraform.tfvars.example terraform.tfvars
```

### Step 2: Edit terraform.tfvars

```hcl
# Your configuration
aws_region = "us-west-2"  # Change to your preferred region

# Your SSH public key
ssh_public_key = "ssh-rsa AAAAB3NzaC1yc2E... your-email@example.com"
# Get it with: cat ~/.ssh/tlef-create-staging.pem.pub

# IMPORTANT: Restrict SSH to your IP only!
allowed_ssh_cidr = ["YOUR.IP.ADDRESS.HERE/32"]
# Get your IP with: curl ifconfig.me
```

### Step 3: Review variables.tf

All configurable options are in `variables.tf`. Most have sensible defaults.

## 🏗️ Deployment

### 1. Initialize Terraform

```bash
terraform init
```

This downloads the AWS provider and initializes the backend.

### 2. Preview Changes

```bash
terraform plan
```

Review what will be created. Verify:
- EC2 instance type is t2.micro (free tier)
- Root volume is 30 GB (free tier limit)
- SSH is restricted to your IP

### 3. Apply Configuration

```bash
terraform apply
```

Type `yes` to confirm. This takes ~5-10 minutes.

**What happens:**
1. Creates VPC and networking
2. Creates security groups
3. Creates IAM roles
4. Creates ECR repositories
5. Launches EC2 instance
6. Installs Docker, K3s, kubectl, helm (via user data script)
7. Allocates Elastic IP
8. Outputs connection information

### 4. Verify Deployment

After `terraform apply` completes, you'll see outputs like:

```
Outputs:

ec2_public_ip = "54.123.456.789"
ecr_frontend_repository_url = "123456789.dkr.ecr.us-west-2.amazonaws.com/tlef-create-frontend"
ecr_backend_repository_url = "123456789.dkr.ecr.us-west-2.amazonaws.com/tlef-create-backend"
ssh_connection_command = "ssh -i ~/.ssh/tlef-create-staging.pem ubuntu@54.123.456.789"
```

### 5. SSH into Instance

```bash
# Fix permissions on SSH key
chmod 400 ~/.ssh/tlef-create-staging.pem

# SSH into instance (wait ~3 minutes for initialization to complete)
ssh -i ~/.ssh/tlef-create-staging.pem ubuntu@<EC2_PUBLIC_IP>
```

### 6. Verify K3s is Running

```bash
# Inside the EC2 instance:
kubectl get nodes

# Should show:
# NAME                 STATUS   ROLES                  AGE   VERSION
# ip-10-0-1-xxx        Ready    control-plane,master   5m    v1.27.x+k3s1
```

## 📦 Important Outputs

After deployment, Terraform outputs several important values:

| Output | Description | Used For |
|--------|-------------|----------|
| `ec2_public_ip` | Public IP of EC2 | SSH access, DNS configuration |
| `elastic_ip` | Static IP (if enabled) | DNS, GitHub Secrets |
| `ecr_frontend_repository_url` | ECR repo for frontend | GitHub Actions, docker push |
| `ecr_backend_repository_url` | ECR repo for backend | GitHub Actions, docker push |
| `ssh_connection_command` | Full SSH command | Quick access |

**Save these for GitHub Secrets configuration!**

## 🔄 Updating Infrastructure

To modify infrastructure:

1. Edit the relevant `.tf` file
2. Run `terraform plan` to preview changes
3. Run `terraform apply` to apply changes

## 🗑️ Destroying Infrastructure

**⚠️ WARNING: This will delete everything!**

```bash
terraform destroy
```

Type `yes` to confirm.

**When to destroy:**
- You're done with the project
- You want to start fresh
- You want to save costs

## 💰 Cost Monitoring

### During Free Tier (First 12 Months)

This infrastructure costs **$0/month** if you stay within free tier limits:

- EC2 t2.micro: 750 hours/month free
- EBS: 30 GB free
- ECR: 500 MB free
- Data transfer: 15 GB/month out free

### After Free Tier

Expected cost: ~$13/month

**To reduce costs:**
- Stop EC2 when not in use: `aws ec2 stop-instances --instance-ids <id>`
- Delete unused ECR images
- Use lifecycle policies (already configured)

## 🔐 Security Best Practices

✅ **Already Configured:**
- SSH restricted to your IP
- IMDSv2 enforced (prevents SSRF attacks)
- Security groups follow least privilege
- EBS volumes encrypted
- ECR images scanned on push
- IAM roles with minimal permissions

⚠️ **You Should Do:**
- Never commit `terraform.tfvars` to Git
- Rotate SSH keys periodically
- Review CloudWatch logs
- Set up AWS billing alerts

## 🐛 Troubleshooting

### SSH Connection Refused

**Symptom:** `Connection refused` when trying to SSH

**Solution:**
1. Wait 3-5 minutes after `terraform apply` (EC2 needs to initialize)
2. Check security group allows your IP:
   ```bash
   curl ifconfig.me  # Verify this matches your allowed_ssh_cidr
   ```
3. Verify SSH key permissions:
   ```bash
   chmod 400 ~/.ssh/tlef-create-staging.pem
   ```

### K3s Not Running

**Symptom:** `kubectl get nodes` fails

**Solution:**
1. Check user data script completed:
   ```bash
   cat /home/ubuntu/init-complete.log
   ```
2. Check K3s status:
   ```bash
   sudo systemctl status k3s
   ```
3. View K3s logs:
   ```bash
   sudo journalctl -u k3s -f
   ```

### ECR Push Failed

**Symptom:** `denied: Your authorization token has expired`

**Solution:**
```bash
# Re-login to ECR
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin <ECR_URL>
```

### Terraform Apply Failed

**Common issues:**
- AWS credentials not configured
- Region doesn't support t2.micro (try us-west-2, us-east-1)
- Reached EC2 instance limit (check AWS console)
- Invalid SSH public key format

**Debug:**
```bash
terraform plan  # Check for errors
aws sts get-caller-identity  # Verify AWS credentials work
```

## 📚 File Structure

```
terraform/
├── main.tf                   # Architecture documentation
├── providers.tf              # Terraform and AWS provider config
├── variables.tf              # Input variables with defaults
├── terraform.tfvars.example  # Example configuration
├── vpc.tf                    # VPC, subnets, internet gateway
├── security-groups.tf        # Firewall rules
├── iam.tf                    # IAM roles and policies
├── ec2.tf                    # EC2 instance with K3s
├── ecr.tf                    # Container registries
├── outputs.tf                # Output values
├── .gitignore                # Ignore sensitive files
└── README.md                 # This file
```

## 🔗 Next Steps

After Terraform completes:

1. ✅ Save outputs to GitHub Secrets
2. ✅ Configure DNS (optional)
3. ✅ Run Ansible playbooks to install ArgoCD
4. ✅ Set up monitoring (Prometheus + Grafana)
5. ✅ Configure SSL/TLS certificates
6. ✅ Test GitHub Actions CI/CD pipeline

## 🆘 Support

- **Terraform Docs**: https://www.terraform.io/docs
- **AWS Free Tier**: https://aws.amazon.com/free/
- **K3s Docs**: https://docs.k3s.io/

---

**💡 Tip:** Run `terraform output` anytime to see connection information!
