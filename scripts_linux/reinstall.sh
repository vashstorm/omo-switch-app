#!/bin/bash

# omo-switch Linux User Systemd Service Reinstaller
# Usage: ./reinstall.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="omo-switch"
SERVICE_NAME="omo-switch"

# Check if running on Linux
if [[ "$(uname)" != "Linux" ]]; then
    echo -e "${RED}Error: This script is designed for Linux only.${NC}"
    exit 1
fi

echo "=========================================="
echo "  omo-switch User Service Reinstaller"
echo "=========================================="
echo ""

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${YELLOW}Reinstalling omo-switch user service...${NC}"
echo ""

# Step 1: Uninstall first
echo -e "${YELLOW}Step 1/2: Uninstalling existing service...${NC}"
if [ -f "${SCRIPT_DIR}/uninstall.sh" ]; then
    bash "${SCRIPT_DIR}/uninstall.sh"
else
    echo -e "${RED}Error: uninstall.sh not found${NC}"
    exit 1
fi

echo ""

# Step 2: Install fresh
echo -e "${YELLOW}Step 2/2: Installing fresh...${NC}"
if [ -f "${SCRIPT_DIR}/install.sh" ]; then
    bash "${SCRIPT_DIR}/install.sh"
else
    echo -e "${RED}Error: install.sh not found${NC}"
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Reinstallation Complete!${NC}"
echo "=========================================="
