#!/bin/bash
# Fast Terraform execution with progress visualization
# Usage: ./terraform-fast.sh [plan|apply|destroy]

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PARALLELISM=20
LOG_LEVEL="INFO"  # INFO, DEBUG, TRACE
TFPLAN_FILE="tfplan"

# Parse command
COMMAND=${1:-plan}

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  TLEF-CREATE Fast Terraform Execution                  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to show spinner while command runs
show_spinner() {
    local pid=$1
    local message=$2
    local spin='-\|/'
    local i=0

    while kill -0 $pid 2>/dev/null; do
        i=$(( (i+1) %4 ))
        printf "\r${YELLOW}${message}${spin:$i:1}${NC}"
        sleep 0.1
    done
    printf "\r${GREEN}${message}✓${NC}\n"
}

# Check if terraform is installed
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}Error: terraform is not installed${NC}"
    exit 1
fi

# Initialize if needed
if [ ! -d ".terraform" ]; then
    echo -e "${YELLOW}Initializing Terraform...${NC}"
    export TF_PLUGIN_CACHE_DIR=~/.terraform.d/plugin-cache
    mkdir -p $TF_PLUGIN_CACHE_DIR

    # Set generous timeout for plugin loading (fixes timeout issues)
    export TF_PLUGIN_TIMEOUT=120

    echo -e "${YELLOW}⏰ Plugin timeout set to 120 seconds${NC}"
    echo -e "${YELLOW}📦 Downloading AWS provider (~400MB, may take 2-3 minutes)...${NC}"
    terraform init -upgrade
    echo ""
fi

case $COMMAND in
    init)
        echo -e "${GREEN}Initializing Terraform with plugin cache...${NC}"
        export TF_PLUGIN_CACHE_DIR=~/.terraform.d/plugin-cache
        mkdir -p $TF_PLUGIN_CACHE_DIR

        # Set generous timeout for plugin loading
        export TF_PLUGIN_TIMEOUT=120

        echo -e "${YELLOW}⏰ Plugin timeout: 120 seconds${NC}"
        echo -e "${YELLOW}📦 Downloading providers (may take 2-3 minutes on first run)...${NC}"
        terraform init -upgrade
        ;;

    plan)
        echo -e "${GREEN}Running Terraform Plan (parallelism=$PARALLELISM)...${NC}"
        echo -e "${YELLOW}Log level: $LOG_LEVEL${NC}"
        echo ""

        # Run plan with progress output
        TF_LOG=$LOG_LEVEL terraform plan \
            -parallelism=$PARALLELISM \
            -out=$TFPLAN_FILE \
            2>&1 | while IFS= read -r line; do
                # Highlight important lines
                if [[ $line == *"Plan:"* ]]; then
                    echo -e "${GREEN}$line${NC}"
                elif [[ $line == *"Error"* ]]; then
                    echo -e "${RED}$line${NC}"
                elif [[ $line == *"Warning"* ]]; then
                    echo -e "${YELLOW}$line${NC}"
                elif [[ $line == *"Creating"* ]] || [[ $line == *"Modifying"* ]] || [[ $line == *"Destroying"* ]]; then
                    echo -e "${BLUE}$line${NC}"
                else
                    echo "$line"
                fi
            done

        echo ""
        echo -e "${GREEN}✓ Plan saved to $TFPLAN_FILE${NC}"
        echo -e "${YELLOW}Run './terraform-fast.sh apply' to execute this plan${NC}"
        ;;

    apply)
        if [ -f "$TFPLAN_FILE" ]; then
            echo -e "${GREEN}Applying saved plan (parallelism=$PARALLELISM)...${NC}"
            echo -e "${YELLOW}Log level: $LOG_LEVEL${NC}"
            echo ""

            # Apply with progress
            TF_LOG=$LOG_LEVEL terraform apply $TFPLAN_FILE 2>&1 | while IFS= read -r line; do
                if [[ $line == *"Apply complete"* ]]; then
                    echo -e "${GREEN}$line${NC}"
                elif [[ $line == *"Creating"* ]]; then
                    echo -e "${BLUE}→ $line${NC}"
                elif [[ $line == *"Creation complete"* ]]; then
                    echo -e "${GREEN}✓ $line${NC}"
                elif [[ $line == *"Error"* ]]; then
                    echo -e "${RED}$line${NC}"
                elif [[ $line == *"Warning"* ]]; then
                    echo -e "${YELLOW}$line${NC}"
                else
                    echo "$line"
                fi
            done

            # Clean up plan file
            rm -f $TFPLAN_FILE

            echo ""
            echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
            echo -e "${GREEN}║  Apply Complete! Showing Outputs:                       ║${NC}"
            echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
            terraform output

        else
            echo -e "${YELLOW}No saved plan found. Running plan + apply...${NC}"
            echo ""

            TF_LOG=$LOG_LEVEL terraform apply \
                -parallelism=$PARALLELISM \
                -auto-approve \
                2>&1 | while IFS= read -r line; do
                    if [[ $line == *"Apply complete"* ]]; then
                        echo -e "${GREEN}$line${NC}"
                    elif [[ $line == *"Creating"* ]]; then
                        echo -e "${BLUE}→ $line${NC}"
                    elif [[ $line == *"Creation complete"* ]]; then
                        echo -e "${GREEN}✓ $line${NC}"
                    elif [[ $line == *"Error"* ]]; then
                        echo -e "${RED}$line${NC}"
                    else
                        echo "$line"
                    fi
                done

            echo ""
            echo -e "${GREEN}Outputs:${NC}"
            terraform output
        fi
        ;;

    destroy)
        echo -e "${RED}WARNING: This will destroy all infrastructure!${NC}"
        read -p "Type 'yes' to confirm: " confirm

        if [ "$confirm" = "yes" ]; then
            echo -e "${RED}Destroying infrastructure...${NC}"
            TF_LOG=$LOG_LEVEL terraform destroy \
                -parallelism=$PARALLELISM \
                -auto-approve
            echo -e "${GREEN}✓ Infrastructure destroyed${NC}"
        else
            echo -e "${YELLOW}Destruction cancelled${NC}"
        fi
        ;;

    validate)
        echo -e "${GREEN}Validating Terraform configuration...${NC}"
        terraform validate
        echo -e "${GREEN}✓ Configuration is valid${NC}"
        ;;

    fmt)
        echo -e "${GREEN}Formatting Terraform files...${NC}"
        terraform fmt -recursive
        echo -e "${GREEN}✓ Files formatted${NC}"
        ;;

    output)
        echo -e "${GREEN}Current outputs:${NC}"
        terraform output
        ;;

    refresh)
        echo -e "${GREEN}Refreshing state...${NC}"
        terraform refresh
        echo -e "${GREEN}✓ State refreshed${NC}"
        ;;

    *)
        echo -e "${RED}Unknown command: $COMMAND${NC}"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  init      - Initialize Terraform"
        echo "  plan      - Run terraform plan (saves to tfplan)"
        echo "  apply     - Apply saved plan or run plan+apply"
        echo "  destroy   - Destroy all infrastructure"
        echo "  validate  - Validate configuration"
        echo "  fmt       - Format all .tf files"
        echo "  output    - Show current outputs"
        echo "  refresh   - Refresh state"
        echo ""
        echo "Examples:"
        echo "  $0 plan"
        echo "  $0 apply"
        echo "  $0 destroy"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Done!${NC}"
