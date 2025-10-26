# TLEF-CREATE Staging Infrastructure
# This is the main Terraform configuration file that orchestrates all resources

# The actual resource definitions are split across multiple files for better organization:
# - providers.tf: Terraform and AWS provider configuration
# - variables.tf: Input variables
# - vpc.tf: VPC, subnets, internet gateway, route tables
# - security-groups.tf: Security group rules
# - iam.tf: IAM roles, policies, and instance profiles
# - ec2.tf: EC2 instance with K3s installation
# - ecr.tf: ECR repositories for Docker images
# - outputs.tf: Output values for use in CI/CD and documentation

# This file serves as the entry point and documents the architecture

/*
  ╔══════════════════════════════════════════════════════════════╗
  ║  TLEF-CREATE Staging Infrastructure Architecture            ║
  ╚══════════════════════════════════════════════════════════════╝

  Internet
      │
      ├─── VPC (10.0.0.0/16)
      │    │
      │    ├─── Internet Gateway
      │    │
      │    ├─── Public Subnet (10.0.1.0/24)
      │    │    │
      │    │    └─── EC2 Instance (t2.micro)
      │    │         ├─── Ubuntu 22.04 LTS
      │    │         ├─── Docker + Docker Compose
      │    │         ├─── K3s (Kubernetes)
      │    │         ├─── Kubectl + Helm
      │    │         └─── IAM Role (ECR Pull Access)
      │    │
      │    └─── Security Group
      │         ├─── SSH (port 22)
      │         ├─── HTTP (port 80)
      │         ├─── HTTPS (port 443)
      │         └─── K8s API (port 6443)
      │
      └─── ECR Repositories
           ├─── tlef-create-frontend
           └─── tlef-create-backend

  ╔══════════════════════════════════════════════════════════════╗
  ║  Cost Estimate (AWS Free Tier)                              ║
  ╚══════════════════════════════════════════════════════════════╝

  First 12 months (Free Tier):
    - EC2 t2.micro: 750 hours/month ─────────────── $0
    - EBS 30 GB: Included ───────────────────────── $0
    - ECR Storage: 500 MB/month ─────────────────── $0
    - Data Transfer: 15 GB/month out ────────────── $0
    - VPC: No charge ────────────────────────────── $0
    - Elastic IP: No charge when attached ────────── $0
    ─────────────────────────────────────────────────
    Total: $0/month ✅

  After Free Tier:
    - EC2 t2.micro: ~$8.50/month
    - EBS 30 GB: ~$3/month
    - ECR Storage: ~$0.50/month (5GB)
    - Data Transfer: ~$1/month
    ─────────────────────────────────────────────────
    Total: ~$13/month

*/

# Terraform version requirement is defined in providers.tf
# AWS provider configuration is defined in providers.tf
# All variables are defined in variables.tf
# Outputs are defined in outputs.tf
