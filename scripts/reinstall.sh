#!/bin/bash

# LEGACY: This script reinstalls the omo-switch macOS LaunchAgent (HTTP server mode).
# For Tauri app mode, this script is NOT needed.
# The Tauri .app bundle is self-contained and launched directly from the Applications folder.
#
# omo-switch macOS Service Reinstaller
# Usage: ./reinstall.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "  omo-switch Service Reinstaller"
echo "=========================================="
echo ""

# Check if running on macOS
if [[ "$(uname)" != "Darwin" ]]; then
    echo -e "${RED}Error: This script is designed for macOS only.${NC}"
    exit 1
fi

# Show what will happen
echo -e "${BLUE}This will:${NC}"
echo "  1. Stop and unload the current service (if running)"
echo "  2. Remove the existing binary and config"
echo "  3. Reinstall the service with the latest binary"
echo ""

# Step 1: Run uninstall
echo -e "${YELLOW}Step 1/2: Uninstalling current service...${NC}"
"${SCRIPT_DIR}/uninstall.sh"

echo ""
echo -e "${YELLOW}Step 2/2: Installing fresh service...${NC}"
"${SCRIPT_DIR}/install.sh"

echo ""
echo "=========================================="
echo -e "${GREEN}Reinstallation Complete!${NC}"
echo "=========================================="
