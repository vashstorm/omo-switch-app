#!/bin/bash

# omo-switch Linux User Systemd Service Uninstaller
# Usage: ./uninstall.sh [--purge]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="omo-switch"
SERVICE_NAME="omo-switch"
INSTALL_DIR="${HOME}/.local/share/${APP_NAME}"
LOG_DIR="${INSTALL_DIR}/logs"
SERVICE_DIR="${HOME}/.config/systemd/user"
SERVICE_FILE="${SERVICE_DIR}/${SERVICE_NAME}.service"

# Parse arguments
PURGE=false
if [ "$1" == "--purge" ]; then
    PURGE=true
fi

# Check if running on Linux
if [[ "$(uname)" != "Linux" ]]; then
    echo -e "${RED}Error: This script is designed for Linux only.${NC}"
    exit 1
fi

echo "=========================================="
echo "  omo-switch User Service Uninstaller"
echo "=========================================="
echo ""

if [ "$PURGE" = true ]; then
    echo -e "${YELLOW}Mode: PURGE (will remove all data including config and logs)${NC}"
    echo ""
fi

# Step 1: Stop and disable service
echo -e "${YELLOW}Step 1/4: Stopping and disabling service...${NC}"
if systemctl --user list-unit-files 2>/dev/null | grep -q "^${SERVICE_NAME}.service"; then
    if systemctl --user is-active --quiet "${SERVICE_NAME}"; then
        systemctl --user stop "${SERVICE_NAME}"
        echo -e "${GREEN}  ✓ Service stopped${NC}"
    else
        echo -e "${GREEN}  ✓ Service was not running${NC}"
    fi

    if systemctl --user is-enabled --quiet "${SERVICE_NAME}" 2>/dev/null; then
        systemctl --user disable "${SERVICE_NAME}"
        echo -e "${GREEN}  ✓ Service disabled${NC}"
    else
        echo -e "${GREEN}  ✓ Service was not enabled${NC}"
    fi
else
    echo -e "${GREEN}  ✓ Service not installed${NC}"
fi

# Step 2: Remove service file
echo -e "${YELLOW}Step 2/4: Removing systemd service file...${NC}"
if [ -f "$SERVICE_FILE" ]; then
    rm "$SERVICE_FILE"
    systemctl --user daemon-reload 2>/dev/null || true
    echo -e "${GREEN}  ✓ Removed ${SERVICE_FILE}${NC}"
else
    echo -e "${GREEN}  ✓ Service file not found${NC}"
fi

# Step 3: Remove installation files
echo -e "${YELLOW}Step 3/4: Removing installation files...${NC}"
if [ -d "$INSTALL_DIR" ]; then
    # Preserve config unless purging
    if [ "$PURGE" = false ] && [ -f "${INSTALL_DIR}/config/config.jsonc" ]; then
        CONFIG_BACKUP="${HOME}/.local/share/omo-switch-config-backup-$(date +%Y%m%d%H%M%S).jsonc"
        mkdir -p "$(dirname "$CONFIG_BACKUP")"
        cp "${INSTALL_DIR}/config/config.jsonc" "$CONFIG_BACKUP"
        echo -e "${YELLOW}  ℹ Config backed up to ${CONFIG_BACKUP}${NC}"
    fi

    rm -rf "$INSTALL_DIR"
    echo -e "${GREEN}  ✓ Removed ${INSTALL_DIR}${NC}"
else
    echo -e "${GREEN}  ✓ Installation directory not found${NC}"
fi

# Step 4: Cleanup empty directories
echo -e "${YELLOW}Step 4/4: Cleaning up...${NC}"
if [ -d "$SERVICE_DIR" ]; then
    # Remove empty systemd user directory if it exists
    if [ ! "$(ls -A "$SERVICE_DIR" 2>/dev/null)" ]; then
        rmdir "$SERVICE_DIR" 2>/dev/null || true
        rmdir "$(dirname "$SERVICE_DIR")" 2>/dev/null || true
        echo -e "${GREEN}  ✓ Removed empty systemd directories${NC}"
    else
        echo -e "${GREEN}  ✓ Preserved systemd user directory (has other services)${NC}"
    fi
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Uninstallation Complete!${NC}"
echo "=========================================="
echo ""

if [ "$PURGE" = true ]; then
    echo "All omo-switch data has been removed from the system."
else
    echo "omo-switch has been uninstalled."
    echo ""
    echo "Preserved:"
    echo "  - Config backup (if existed): ~/.local/share/omo-switch-config-backup-*.jsonc"
fi

echo ""
echo "To reinstall, run: ./script/linux/install.sh"
echo ""
