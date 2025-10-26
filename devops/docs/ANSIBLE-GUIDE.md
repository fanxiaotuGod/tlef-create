# Ansible Configuration Guide

Complete guide to using Ansible for TLEF-CREATE infrastructure management.

## 📋 Overview

Ansible automates the configuration and deployment of your staging environment after Terraform provisions the infrastructure.

## 🎯 What Ansible Does

```
Terraform → Creates AWS resources (EC2, VPC, ECR)
   ↓
Ansible → Configures the EC2 instance
   ↓
   ├─ Installs K3s Kubernetes
   ├─ Deploys ArgoCD for GitOps
   └─ Sets up Prometheus + Grafana monitoring
   ↓
ArgoCD → Deploys your application from Git
```

## 📁 Directory Structure

```
devops/ansible/
├── ansible.cfg              # Ansible configuration
├── inventory/
│   └── staging.yml         # Server inventory
├── playbooks/
│   ├── 01-initial-setup.yml
│   ├── 02-deploy-argocd.yml
│   ├── 03-deploy-monitoring.yml
│   └── deploy-all.yml      # Master playbook
└── roles/
    ├── k3s/                # K3s installation
    ├── argocd/             # ArgoCD setup
    └── monitoring/         # Prometheus + Grafana
```

## 🚀 Quick Start

### 1. Install Ansible

```bash
# macOS
brew install ansible

# Ubuntu/Debian
sudo apt update
sudo apt install ansible

# Python pip
pip3 install ansible

# Verify installation
ansible --version
```

### 2. Configure Inventory

Update `inventory/staging.yml` with your EC2 IP:

```yaml
ansible_host: "YOUR_EC2_IP_HERE"
```

Or set as environment variable:
```bash
export EC2_HOST=54.123.456.789
```

### 3. Test Connection

```bash
cd devops/ansible
ansible staging -m ping
```

Expected output:
```
staging-server | SUCCESS => {
    "ping": "pong"
}
```

## 📖 Playbook Usage

### Run Complete Deployment

```bash
cd devops/ansible
ansible-playbook -i inventory/staging.yml playbooks/deploy-all.yml
```

This runs all steps in order:
1. Initial setup (K3s)
2. Deploy ArgoCD
3. Deploy monitoring

### Run Individual Playbooks

```bash
# Only install K3s
ansible-playbook -i inventory/staging.yml playbooks/01-initial-setup.yml

# Only deploy ArgoCD
ansible-playbook -i inventory/staging.yml playbooks/02-deploy-argocd.yml

# Only deploy monitoring
ansible-playbook -i inventory/staging.yml playbooks/03-deploy-monitoring.yml
```

### Run with Tags

```bash
# Only run K3s tasks
ansible-playbook -i inventory/staging.yml playbooks/deploy-all.yml --tags k3s

# Only run ArgoCD tasks
ansible-playbook -i inventory/staging.yml playbooks/deploy-all.yml --tags argocd

# Only run monitoring tasks
ansible-playbook -i inventory/staging.yml playbooks/deploy-all.yml --tags monitoring
```

## 🎭 Ansible Roles

### K3s Role

**Purpose:** Installs and configures K3s Kubernetes cluster

**Tasks:**
- Download and install K3s
- Configure kubeconfig for ubuntu user
- Wait for cluster to be ready
- Set up kubectl aliases

**Variables:**
```yaml
k3s_version: stable
k3s_server_options:
  - "--write-kubeconfig-mode=644"
  - "--disable=traefik"
```

### ArgoCD Role

**Purpose:** Deploys ArgoCD for GitOps continuous deployment

**Tasks:**
- Create argocd namespace
- Install ArgoCD
- Patch service to NodePort
- Apply application manifest
- Save credentials

**Variables:**
```yaml
argocd_version: stable
argocd_namespace: argocd
git_repo: https://github.com/fanxiaotuGod/tlef-create.git
git_branch: staging
```

### Monitoring Role

**Purpose:** Deploys Prometheus and Grafana using Helm

**Tasks:**
- Add Helm repositories
- Install Prometheus
- Install Grafana
- Configure data sources
- Save credentials

**Variables:**
```yaml
monitoring_namespace: monitoring
prometheus_nodeport: 30090
grafana_nodeport: 30300
grafana_admin_password: admin
```

## 🔧 Advanced Usage

### Override Variables

Create a custom vars file:

```yaml
# custom-vars.yml
grafana_admin_password: "MySecurePassword123"
prometheus_retention: 30d
```

Use it:
```bash
ansible-playbook -i inventory/staging.yml playbooks/deploy-all.yml \
  -e @custom-vars.yml
```

### Dry Run (Check Mode)

See what would change without actually changing it:

```bash
ansible-playbook -i inventory/staging.yml playbooks/deploy-all.yml --check
```

### Increase Verbosity

For debugging:

```bash
# Level 1: Basic
ansible-playbook -i inventory/staging.yml playbooks/deploy-all.yml -v

# Level 2: More detail
ansible-playbook -i inventory/staging.yml playbooks/deploy-all.yml -vv

# Level 3: Debug
ansible-playbook -i inventory/staging.yml playbooks/deploy-all.yml -vvv
```

## 📊 Output and Logs

Ansible saves logs to `ansible.log` in the ansible directory.

Check logs:
```bash
tail -f devops/ansible/ansible.log
```

## 🐛 Troubleshooting

### SSH Connection Failed

```bash
# Check SSH key permissions
chmod 400 ~/.ssh/tlef-create-staging.pem

# Test SSH manually
ssh -i ~/.ssh/tlef-create-staging.pem ubuntu@<EC2_IP>
```

### Module Not Found

Install required collections:
```bash
ansible-galaxy collection install kubernetes.core
ansible-galaxy collection install community.general
```

### Playbook Fails Midway

Ansible is idempotent - you can safely re-run the playbook:
```bash
ansible-playbook -i inventory/staging.yml playbooks/deploy-all.yml
```

It will skip already-completed tasks.

### Force Rerun All Tasks

```bash
ansible-playbook -i inventory/staging.yml playbooks/deploy-all.yml \
  --force-handlers
```

## 📚 Best Practices

1. **Always test with --check first**
   ```bash
   ansible-playbook -i inventory/staging.yml playbooks/deploy-all.yml --check
   ```

2. **Use tags for selective execution**
   ```bash
   ansible-playbook ... --tags argocd
   ```

3. **Keep sensitive data in environment variables**
   ```bash
   export GRAFANA_PASSWORD=secure123
   ```

4. **Version control your inventory**
   - Commit `inventory/staging.yml.example`
   - Don't commit actual IPs (use .gitignore)

5. **Document custom variables**
   - Add comments in `defaults/main.yml`

## 🔐 Security Considerations

- Never commit SSH private keys
- Use environment variables for passwords
- Restrict SSH access to your IP only
- Rotate passwords after deployment
- Use Ansible Vault for secrets (optional)

### Using Ansible Vault (Optional)

Encrypt sensitive files:
```bash
ansible-vault encrypt inventory/staging.yml
```

Run with vault:
```bash
ansible-playbook -i inventory/staging.yml playbooks/deploy-all.yml \
  --ask-vault-pass
```

## 🎯 Integration with GitHub Actions

See `.github/workflows/3-ansible-deploy.yml` for automated Ansible deployment from GitHub Actions.

## 📖 Additional Resources

- [Ansible Documentation](https://docs.ansible.com/)
- [Ansible Galaxy](https://galaxy.ansible.com/) - Pre-built roles
- [Ansible Best Practices](https://docs.ansible.com/ansible/latest/user_guide/playbooks_best_practices.html)

---

**Need help?** Check the main `SETUP-GUIDE.md` or open an issue!
