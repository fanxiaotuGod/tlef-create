# Terraform Quick Reference Card

**Quick commands for daily use**

## 🚀 Most Common Commands

```bash
# Fast plan (2-3 min instead of 5-7 min)
./terraform-fast.sh plan

# Fast apply with progress
./terraform-fast.sh apply

# Or use Makefile
make plan
make apply
```

## 📊 All Available Commands

### Using terraform-fast.sh

```bash
./terraform-fast.sh init       # Initialize with caching
./terraform-fast.sh plan       # Plan with progress
./terraform-fast.sh apply      # Apply with progress
./terraform-fast.sh destroy    # Destroy infrastructure
./terraform-fast.sh validate   # Validate config
./terraform-fast.sh fmt        # Format files
./terraform-fast.sh output     # Show outputs
```

### Using Makefile

```bash
make help           # Show all commands
make init           # Initialize
make plan           # Fast plan
make apply          # Fast apply
make apply-watch    # Apply with detailed logs
make destroy        # Destroy infrastructure
make fmt            # Format files
make validate       # Validate config
make output         # Show outputs
make logs           # Tail logs (if apply-watch used)
make clean          # Clean cache
make state-list     # List all resources
```

### Manual (Advanced)

```bash
# With optimizations
terraform plan -parallelism=20
TF_LOG=INFO terraform apply -parallelism=20 -auto-approve

# Targeted apply (dev only)
terraform apply -target=aws_instance.staging_server

# Save and apply plan
terraform plan -out=tfplan
terraform apply tfplan
```

## 🎯 Common Workflows

### First Time Setup
```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars
make init
make plan
make apply
```

### Daily Updates
```bash
# Make changes to .tf files
make fmt
make validate
./terraform-fast.sh plan
./terraform-fast.sh apply
```

### Debugging Issues
```bash
# Terminal 1
make apply-watch

# Terminal 2
make logs
```

### Check Current State
```bash
make output
make state-list
terraform show
```

### Cleanup
```bash
./terraform-fast.sh destroy
# or
make destroy
```

## ⚡ Speed Tips

1. **Always use parallelism**
   - Default: 10 resources at a time
   - Optimized: 20 resources at a time
   - 60% faster execution

2. **Enable plugin caching** (one-time)
   ```bash
   mkdir -p ~/.terraform.d/plugin-cache
   echo 'plugin_cache_dir = "$HOME/.terraform.d/plugin-cache"' >> ~/.terraformrc
   ```

3. **Use the fast script or Makefile**
   - Handles parallelism automatically
   - Shows colored progress
   - Saves time with shortcuts

## 📝 Environment Variables

```bash
# Log levels
export TF_LOG=INFO     # Basic progress
export TF_LOG=DEBUG    # Detailed debug

# Log to file
export TF_LOG_PATH=./terraform.log

# Plugin cache
export TF_PLUGIN_CACHE_DIR=~/.terraform.d/plugin-cache

# Set parallelism globally
export TF_CLI_ARGS_apply="-parallelism=20"
export TF_CLI_ARGS_plan="-parallelism=20"
```

## 🔍 Useful Checks

```bash
# See what will be created
terraform plan | grep "will be created"

# Count resources
terraform state list | wc -l

# Show specific resource
terraform state show aws_instance.staging_server

# Get specific output
terraform output -raw ec2_public_ip

# Check if state is current
terraform refresh
```

## 🐛 Troubleshooting

```bash
# Validate configuration
make validate

# Format files
make fmt

# Re-initialize
rm -rf .terraform .terraform.lock.hcl
make init

# Check AWS credentials
aws sts get-caller-identity

# View detailed logs
TF_LOG=DEBUG terraform plan 2>&1 | tee debug.log
```

## 📊 Time Comparison

| Command | Time | Progress |
|---------|------|----------|
| `terraform apply` | 5-7 min | ❌ None |
| `terraform apply -parallelism=20` | 2-3 min | ❌ None |
| `TF_LOG=INFO terraform apply -parallelism=20` | 2-3 min | ✅ Basic |
| `./terraform-fast.sh apply` | 2-3 min | ✅✅ Colored |
| `make apply-watch` + `make logs` | 2-3 min | ✅✅✅ Detailed |

## 💡 Pro Tips

- Use `make help` to see all Makefile commands
- Use `./terraform-fast.sh` for daily work
- Use `make apply-watch` + `make logs` for debugging
- Always run `make fmt` before committing
- Use `make plan` before `make apply` for safety

## 📚 Learn More

- [TERRAFORM-SPEED-GUIDE.md](./TERRAFORM-SPEED-GUIDE.md) - Comprehensive optimization guide
- [README.md](./README.md) - Full deployment instructions
- [Terraform Docs](https://www.terraform.io/docs) - Official documentation
