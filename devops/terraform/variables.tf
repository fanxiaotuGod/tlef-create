variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
  default     = "staging"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "tlef-create"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for public subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "availability_zone" {
  description = "Availability zone for subnet"
  type        = string
  default     = "us-west-2a"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t2.micro" # Free tier eligible
}

variable "ami_id" {
  description = "AMI ID for EC2 instance (Ubuntu 22.04 LTS). Leave empty to use latest."
  type        = string
  default     = "" # Will auto-detect latest Ubuntu 22.04 LTS
}

variable "ssh_public_key" {
  description = "SSH public key content for EC2 access"
  type        = string
  # Set this via terraform.tfvars or TF_VAR_ssh_public_key environment variable
}

variable "allowed_ssh_cidr" {
  description = "CIDR blocks allowed to SSH to EC2 (restrict to your IP!)"
  type        = list(string)
  default     = ["0.0.0.0/0"] # ⚠️ CHANGE THIS to your IP for security!
}

variable "enable_monitoring" {
  description = "Enable detailed CloudWatch monitoring (costs extra)"
  type        = bool
  default     = false
}

variable "ecr_image_retention_count" {
  description = "Number of images to retain in ECR repositories"
  type        = number
  default     = 10
}

variable "root_volume_size" {
  description = "Size of root EBS volume in GB"
  type        = number
  default     = 30 # Free tier eligible up to 30 GB
}

variable "allocate_elastic_ip" {
  description = "Allocate Elastic IP for EC2 instance (recommended for staging)"
  type        = bool
  default     = true
}

variable "enable_termination_protection" {
  description = "Enable termination protection for EC2 instance"
  type        = bool
  default     = false
}
