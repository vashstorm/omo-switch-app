#!/bin/bash

# LEGACY: This script installs omo-switch as a macOS LaunchAgent (HTTP server mode).
# For Tauri app mode, this script is NOT needed.
# The Tauri .app bundle is self-contained and launched directly from the Applications folder.
#
# omo-switch macOS Service Installer
# Usage: ./install.sh

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
CONFIG_FILE="${BIN_DIR}/config.jsonc"
LOG_DIR="${INSTALL_DIR}/logs"
PLIST_PATH="${HOME}/Library/LaunchAgents/${SERVICE_NAME}.plist"
PORT=3123

echo "=========================================="
echo "  omo-switch Service Installer"
echo "=========================================="
echo ""

# Step 1: Check if running on macOS
if [[ "$(uname)" != "Darwin" ]]; then
    echo -e "${RED}Error: This script is designed for macOS only.${NC}"
    exit 1
fi

# Step 2: Create bin directory if it doesn't exist
echo -e "${YELLOW}Step 1/6: Creating bin directory...${NC}"
if [ ! -d "$BIN_DIR" ]; then
    mkdir -p "$BIN_DIR"
    echo -e "${GREEN}  ✓ Created bin directory at ${BIN_DIR}${NC}"
else
    echo -e "${GREEN}  ✓ Bin directory already exists${NC}"
fi

# Step 3: Copy binary from dist to bin
echo -e "${YELLOW}Step 2/6: Copying binary...${NC}"
if [ ! -f "${INSTALL_DIR}/dist/omo-switch" ]; then
    echo -e "${RED}Error: Binary not found at ${INSTALL_DIR}/dist/omo-switch${NC}"
    echo "Please build the project first with: make build"
    exit 1
fi

cp "${INSTALL_DIR}/dist/omo-switch" "${BIN_DIR}/omo-switch"
chmod +x "${BIN_DIR}/omo-switch"
echo -e "${GREEN}  ✓ Copied binary to ${BIN_DIR}/omo-switch${NC}"

echo -e "${YELLOW}Step 3/7: Copying web assets...${NC}"
if [ ! -f "${INSTALL_DIR}/dist/web/index.js" ]; then
    echo -e "${RED}Error: Web bundle not found at ${INSTALL_DIR}/dist/web/index.js${NC}"
    echo "Please build the project first with: make build"
    exit 1
fi

rm -rf "${BIN_DIR}/web"
cp -R "${INSTALL_DIR}/dist/web" "${BIN_DIR}/web"
echo -e "${GREEN}  ✓ Copied web assets to ${BIN_DIR}/web${NC}"

echo -e "${YELLOW}Step 4/7: Setting up configuration...${NC}"
if [ ! -f "${INSTALL_DIR}/config/config.jsonc" ]; then
    echo -e "${RED}Error: Config file not found at ${INSTALL_DIR}/config/config.jsonc${NC}"
    exit 1
fi

if [ ! -f "$CONFIG_FILE" ]; then
    cp "${INSTALL_DIR}/config/config.jsonc" "$CONFIG_FILE"
    echo -e "${GREEN}  ✓ Copied config to ${CONFIG_FILE}${NC}"
else
    echo -e "${YELLOW}  ℹ Config already exists at ${CONFIG_FILE} (preserved)${NC}"
fi

echo -e "${YELLOW}Step 5/7: Creating logs directory...${NC}"
if [ ! -d "$LOG_DIR" ]; then
    mkdir -p "$LOG_DIR"
    echo -e "${GREEN}  ✓ Created logs directory at ${LOG_DIR}${NC}"
else
    echo -e "${GREEN}  ✓ Logs directory already exists${NC}"
fi

echo -e "${YELLOW}Step 6/7: Creating LaunchAgent plist...${NC}"

cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${SERVICE_NAME}</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>${BIN_DIR}/omo-switch</string>
        <string>-c</string>
        <string>${CONFIG_FILE}</string>
        <string>-p</string>
        <string>${PORT}</string>
    </array>
    
    <key>WorkingDirectory</key>
    <string>${INSTALL_DIR}</string>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
        <key>Crashed</key>
        <true/>
    </dict>
    
    <key>ThrottleInterval</key>
    <integer>10</integer>
    
    <key>StandardOutPath</key>
    <string>${LOG_DIR}/omo-switch.log</string>
    
    <key>StandardErrorPath</key>
    <string>${LOG_DIR}/omo-switch.error.log</string>
    
    <key>ProcessType</key>
    <string>Background</string>
</dict>
</plist>
EOF

echo -e "${GREEN}  ✓ Created plist at ${PLIST_PATH}${NC}"

echo -e "${YELLOW}Step 7/7: Loading service...${NC}"

# Unload first if it exists (to ensure clean state)
if launchctl list | grep -q "$SERVICE_NAME"; then
    echo "  Unloading existing service..."
    launchctl unload "$PLIST_PATH" 2>/dev/null || true
fi

# Load the new service
launchctl load "$PLIST_PATH"
echo -e "${GREEN}  ✓ Service loaded successfully${NC}"

# Wait a moment and check if service is running
sleep 2
if launchctl list | grep -q "$SERVICE_NAME"; then
    PID=$(launchctl list | grep "$SERVICE_NAME" | awk '{print $1}')
    echo -e "${GREEN}  ✓ Service is running (PID: ${PID})${NC}"
else
    echo -e "${YELLOW}  ⚠ Service may not have started yet. Check logs:${NC}"
    echo "    tail -f ${LOG_DIR}/omo-switch.error.log"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Installation Complete!${NC}"
echo "=========================================="
echo ""
echo "Service:      ${SERVICE_NAME}"
echo "Port:         ${PORT}"
echo "Binary:       ${BIN_DIR}/omo-switch"
echo "Config:       ${CONFIG_FILE}"
echo "Logs:         ${LOG_DIR}/"
echo ""
echo "Commands:"
echo "  Start:     launchctl start ${SERVICE_NAME}"
echo "  Stop:      launchctl stop ${SERVICE_NAME}"
echo "  Restart:   launchctl stop ${SERVICE_NAME} && launchctl start ${SERVICE_NAME}"
echo "  Status:    launchctl list | grep ${SERVICE_NAME}"
echo "  Logs:      tail -f ${LOG_DIR}/omo-switch.log"
echo "  Errors:    tail -f ${LOG_DIR}/omo-switch.error.log"
echo ""
echo "To uninstall, run: ./scripts/uninstall.sh"
echo ""
