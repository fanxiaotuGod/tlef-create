# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_id" {
  description = "ID of the public subnet"
  value       = aws_subnet.public.id
}

# EC2 Outputs
output "ec2_instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.main.id
}

output "ec2_public_ip" {
  description = "Public IP of the EC2 instance"
  value       = aws_instance.main.public_ip
}

output "ec2_public_dns" {
  description = "Public DNS of the EC2 instance"
  value       = aws_instance.main.public_dns
}

output "elastic_ip" {
  description = "Elastic IP address (if allocated)"
  value       = var.allocate_elastic_ip ? aws_eip.main[0].public_ip : null
}

# ECR Outputs
output "ecr_frontend_repository_url" {
  description = "URL of the ECR repository for frontend"
  value       = aws_ecr_repository.frontend.repository_url
}

output "ecr_backend_repository_url" {
  description = "URL of the ECR repository for backend"
  value       = aws_ecr_repository.backend.repository_url
}

# Security Group Outputs
output "ec2_security_group_id" {
  description = "ID of the EC2 security group"
  value       = aws_security_group.ec2.id
}

# IAM Outputs
output "ec2_iam_role_name" {
  description = "Name of the EC2 IAM role"
  value       = aws_iam_role.ec2.name
}

output "ec2_iam_role_arn" {
  description = "ARN of the EC2 IAM role"
  value       = aws_iam_role.ec2.arn
}

# SSH Connection Command
output "ssh_connection_command" {
  description = "Command to SSH into the EC2 instance"
  value       = "ssh -i ~/.ssh/tlef-create-staging.pem ubuntu@${var.allocate_elastic_ip ? aws_eip.main[0].public_ip : aws_instance.main.public_ip}"
}

# Kubectl Configuration Command
output "kubectl_config_command" {
  description = "Command to configure kubectl to access K3s cluster"
  value       = <<-EOT
    # SSH into the instance first, then run:
    scp -i ~/.ssh/tlef-create-staging.pem ubuntu@${var.allocate_elastic_ip ? aws_eip.main[0].public_ip : aws_instance.main.public_ip}:/home/ubuntu/.kube/config ~/.kube/config-staging

    # Then update the server URL in the config:
    sed -i 's/127.0.0.1/${var.allocate_elastic_ip ? aws_eip.main[0].public_ip : aws_instance.main.public_ip}/g' ~/.kube/config-staging

    # Use it:
    export KUBECONFIG=~/.kube/config-staging
    kubectl get nodes
  EOT
}

# ECR Login Commands
output "ecr_login_command" {
  description = "Command to login to ECR"
  value       = "aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${split("/", aws_ecr_repository.frontend.repository_url)[0]}"
}

# Quick Start Guide
output "quick_start_guide" {
  description = "Quick start guide for accessing your infrastructure"
  value       = <<-EOT
    ═══════════════════════════════════════════════════════════════
    🎉 TLEF-CREATE Infrastructure Created Successfully!
    ═══════════════════════════════════════════════════════════════

    📍 EC2 Instance IP: ${var.allocate_elastic_ip ? aws_eip.main[0].public_ip : aws_instance.main.public_ip}
    🐳 ECR Frontend:    ${aws_ecr_repository.frontend.repository_url}
    🐳 ECR Backend:     ${aws_ecr_repository.backend.repository_url}

    ─────────────────────────────────────────────────────────────
    🔐 SSH Access:
    ─────────────────────────────────────────────────────────────
    ssh -i ~/.ssh/tlef-create-staging.pem ubuntu@${var.allocate_elastic_ip ? aws_eip.main[0].public_ip : aws_instance.main.public_ip}

    ─────────────────────────────────────────────────────────────
    ☸️  Kubernetes Access:
    ─────────────────────────────────────────────────────────────
    1. SSH into instance (command above)
    2. Run: kubectl get nodes
    3. Verify K3s is running

    ─────────────────────────────────────────────────────────────
    📦 Next Steps:
    ─────────────────────────────────────────────────────────────
    1. Configure GitHub Secrets with the outputs above
    2. Build and push Docker images to ECR
    3. Deploy ArgoCD using Ansible playbooks
    4. Configure domain/DNS (optional)
    5. Set up SSL/TLS certificates

    ═══════════════════════════════════════════════════════════════
  EOT
}
