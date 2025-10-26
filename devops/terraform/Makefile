# TLEF-CREATE Terraform Makefile
# Quick commands for common Terraform operations

.PHONY: help init plan apply destroy fmt validate refresh

# Default parallelism (adjust based on your machine)
PARALLELISM ?= 20

# Colors for output
GREEN  := \033[0;32m
YELLOW := \033[1;33m
RED    := \033[0;31m
NC     := \033[0m # No Color

help: ## Show this help message
	@echo "$(GREEN)TLEF-CREATE Terraform Quick Commands$(NC)"
	@echo "======================================"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}'

init: ## Initialize Terraform (with caching)
	@echo "$(GREEN)Initializing Terraform...$(NC)"
	@echo "$(YELLOW)⏰ Setting plugin timeout to 120 seconds...$(NC)"
	@export TF_PLUGIN_CACHE_DIR=~/.terraform.d/plugin-cache && \
	export TF_PLUGIN_TIMEOUT=120 && \
	terraform init -upgrade

plan: ## Run Terraform plan (fast with parallelism)
	@echo "$(GREEN)Running Terraform plan...$(NC)"
	@TF_LOG=INFO terraform plan -parallelism=$(PARALLELISM) -out=tfplan

plan-quick: ## Quick plan without logs
	@terraform plan -parallelism=$(PARALLELISM) -compact-warnings

apply: ## Apply Terraform changes (fast with parallelism)
	@echo "$(GREEN)Applying Terraform changes...$(NC)"
	@TF_LOG=INFO terraform apply -parallelism=$(PARALLELISM) -auto-approve

apply-plan: ## Apply saved plan
	@echo "$(GREEN)Applying saved plan...$(NC)"
	@terraform apply tfplan

apply-watch: ## Apply with detailed logging to file (watch in another terminal)
	@echo "$(GREEN)Applying with detailed logs...$(NC)"
	@echo "$(YELLOW)Tip: Run 'tail -f terraform.log' in another terminal$(NC)"
	@TF_LOG=DEBUG TF_LOG_PATH=./terraform.log terraform apply -parallelism=$(PARALLELISM) -auto-approve

destroy: ## Destroy all infrastructure
	@echo "$(RED)WARNING: This will destroy all infrastructure!$(NC)"
	@terraform destroy -parallelism=$(PARALLELISM)

destroy-auto: ## Destroy without confirmation (DANGEROUS!)
	@echo "$(RED)Destroying infrastructure...$(NC)"
	@terraform destroy -parallelism=$(PARALLELISM) -auto-approve

fmt: ## Format Terraform files
	@terraform fmt -recursive

validate: ## Validate Terraform configuration
	@terraform validate

refresh: ## Refresh Terraform state
	@terraform refresh

show: ## Show current state
	@terraform show

output: ## Show outputs
	@terraform output

# Targeted operations
target-vpc: ## Plan/apply only VPC resources
	@terraform apply -target=aws_vpc.main -target=aws_subnet.public -target=aws_internet_gateway.main -target=aws_route_table.public

target-ec2: ## Plan/apply only EC2 instance
	@terraform apply -target=aws_instance.staging_server

target-ecr: ## Plan/apply only ECR repositories
	@terraform apply -target=aws_ecr_repository.frontend -target=aws_ecr_repository.backend

# Utility commands
clean: ## Clean Terraform cache and plans
	@echo "$(YELLOW)Cleaning Terraform cache...$(NC)"
	@rm -rf .terraform terraform.tfstate.backup tfplan terraform.log
	@echo "$(GREEN)Done!$(NC)"

logs: ## Tail Terraform logs (if apply-watch was used)
	@tail -f terraform.log

state-list: ## List all resources in state
	@terraform state list

graph: ## Generate dependency graph
	@terraform graph | dot -Tpng > graph.png && open graph.png

cost: ## Estimate costs (requires infracost CLI)
	@if command -v infracost >/dev/null 2>&1; then \
		infracost breakdown --path .; \
	else \
		echo "$(YELLOW)Install infracost: https://www.infracost.io/docs/$(NC)"; \
	fi
