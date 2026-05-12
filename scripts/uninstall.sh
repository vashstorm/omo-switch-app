#!/bin/bash

# LEGACY: This script uninstalls the omo-switch macOS LaunchAgent (HTTP server mode).
# For Tauri app mode, this script is NOT needed.
# The Tauri .app bundle is self-contained and launched directly from the Applications folder.
#
# omo-switch macOS Service Uninstaller
# Usage: ./uninstall.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="omo-switch"
SERVICE_NAME="com.omo.switch"
INSTALL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="${INSTALL_DIR}/bin"
LOG_DIR="${INSTALL_DIR}/logs"
PLIST_PATH="${HOME}/Library/LaunchAgents/${SERVICE_NAME}.plist"

echo "=========================================="
echo "  omo-switch Service Uninstaller"
echo "=========================================="
echo ""

# Check if running on macOS
if [[ "$(uname)" != "Darwin" ]]; then
    echo -e "${RED}Error: This script is designed for macOS only.${NC}"
    exit 1
fi

# Check if service is loaded
IS_LOADED=false
if launchctl list | grep -q "$SERVICE_NAME"; then
    IS_LOADED=true
fi

# Step 1: Stop and unload the service
if [ "$IS_LOADED" = true ] || [ -f "$PLIST_PATH" ]; then
    echo -e "${YELLOW}Step 1/4: Stopping and unloading service...${NC}"
    
    # Try to stop the service first
    if launchctl list | grep -q "$SERVICE_NAME"; then
        launchctl stop "$SERVICE_NAME" 2>/dev/null || true
        echo -e "${GREEN}  ✓ Service stopped${NC}"
    fi
    
    # Unload the plist
    if [ -f "$PLIST_PATH" ]; then
        launchctl unload "$PLIST_PATH" 2>/dev/null || true
        echo -e "${GREEN}  ✓ Service unloaded${NC}"
    fi
else
    echo -e "${GREEN}Step 1/4: Service not running or loaded${NC}"
fi

# Step 2: Remove plist file
echo -e "${YELLOW}Step 2/4: Removing LaunchAgent plist...${NC}"
if [ -f "$PLIST_PATH" ]; then
    rm "$PLIST_PATH"
    echo -e "${GREEN}  ✓ Removed ${PLIST_PATH}${NC}"
else
    echo -e "${GREEN}  ✓ Plist file not found (already removed?)${NC}"
fi

# Step 3: Remove binary (preserve config.jsonc)
echo -e "${YELLOW}Step 3/4: Removing binary...${NC}"
if [ -d "$BIN_DIR" ]; then
    if [ -f "${BIN_DIR}/omo-switch" ]; then
        rm "${BIN_DIR}/omo-switch"
        echo -e "${GREEN}  ✓ Removed binary${NC}"
    else
        echo -e "${GREEN}  ✓ Binary not found${NC}"
    fi
    if [ -z "$(ls -A "$BIN_DIR" 2>/dev/null)" ]; then
        rm -rf "$BIN_DIR"
        echo -e "${GREEN}  ✓ Removed empty bin directory${NC}"
    else
        echo -e "${YELLOW}  ℹ Preserved bin directory (contains config.jsonc)${NC}"
    fi
else
    echo -e "${GREEN}  ✓ Bin directory not found${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Uninstallation Complete!${NC}"
echo "=========================================="
echo ""
echo "The omo-switch service has been removed from your system."
echo ""
echo "Remaining files (if any):"
echo "  Source:     ${INSTALL_DIR}/"
if [ -d "$LOG_DIR" ]; then
    echo "  Logs:       ${LOG_DIR}/"
fi
echo ""
echo "To reinstall, run: ./scripts/install.sh"
echo ""
