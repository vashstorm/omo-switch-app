#!/bin/bash

# omo-switch Linux User Systemd Service Installer
# Usage: ./install.sh

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
BIN_DIR="${INSTALL_DIR}/bin"
CONFIG_DIR="${INSTALL_DIR}/config"
LOG_DIR="${INSTALL_DIR}/logs"
SERVICE_DIR="${HOME}/.config/systemd/user"
SERVICE_FILE="${SERVICE_DIR}/${SERVICE_NAME}.service"
PORT=3123

# Check if running on Linux
if [[ "$(uname)" != "Linux" ]]; then
    echo -e "${RED}Error: This script is designed for Linux only.${NC}"
    exit 1
fi

# Check if systemd is available
if ! command -v systemctl &> /dev/null; then
    echo -e "${RED}Error: systemd is not available on this system.${NC}"
    exit 1
fi

# Check if user systemd is available
if ! systemctl --user status &> /dev/null; then
    echo -e "${RED}Error: User systemd is not available.${NC}"
    echo "You may need to run: loginctl enable-linger $USER"
    exit 1
fi

echo "=========================================="
echo "  omo-switch User Service Installer"
echo "=========================================="
echo ""

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Step 1: Create directories
echo -e "${YELLOW}Step 1/6: Creating directories...${NC}"
mkdir -p "${BIN_DIR}"
mkdir -p "${CONFIG_DIR}"
mkdir -p "${LOG_DIR}"
mkdir -p "${SERVICE_DIR}"
echo -e "${GREEN}  ✓ Created directories${NC}"

# Step 2: Copy binary
echo -e "${YELLOW}Step 2/6: Copying binary...${NC}"
if [ ! -f "${PROJECT_ROOT}/dist/omo-switch" ]; then
    echo -e "${RED}Error: Binary not found at ${PROJECT_ROOT}/dist/omo-switch${NC}"
    echo "Please build the project first with: make build"
    exit 1
fi

cp "${PROJECT_ROOT}/dist/omo-switch" "${BIN_DIR}/omo-switch"
chmod +x "${BIN_DIR}/omo-switch"
echo -e "${GREEN}  ✓ Copied binary to ${BIN_DIR}/omo-switch${NC}"

# Step 3: Copy web assets
echo -e "${YELLOW}Step 3/6: Copying web assets...${NC}"
if [ ! -d "${PROJECT_ROOT}/dist/web" ]; then
    echo -e "${RED}Error: Web assets not found at ${PROJECT_ROOT}/dist/web${NC}"
    echo "Please build the project first with: make build"
    exit 1
fi

rm -rf "${BIN_DIR}/web"
cp -R "${PROJECT_ROOT}/dist/web" "${BIN_DIR}/web"
echo -e "${GREEN}  ✓ Copied web assets to ${BIN_DIR}/web${NC}"

# Step 4: Setup configuration
echo -e "${YELLOW}Step 4/6: Setting up configuration...${NC}"
CONFIG_FILE="${CONFIG_DIR}/config.jsonc"

if [ ! -f "${PROJECT_ROOT}/config/config.jsonc" ]; then
    echo -e "${RED}Error: Config template not found at ${PROJECT_ROOT}/config/config.jsonc${NC}"
    exit 1
fi

if [ ! -f "$CONFIG_FILE" ]; then
    cp "${PROJECT_ROOT}/config/config.jsonc" "$CONFIG_FILE"
    echo -e "${GREEN}  ✓ Copied config to ${CONFIG_FILE}${NC}"
else
    echo -e "${YELLOW}  ℹ Config already exists at ${CONFIG_FILE} (preserved)${NC}"
fi

# Step 5: Create systemd service file
echo -e "${YELLOW}Step 5/6: Creating user systemd service...${NC}"

cat > "$SERVICE_FILE" << EOF
[Unit]
Description=omo-switch User Service
After=network.target

[Service]
Type=simple
WorkingDirectory=${INSTALL_DIR}
Environment="NODE_ENV=production"
Environment="PORT=${PORT}"

# Resource limits
LimitNOFILE=65535
LimitNPROC=4096

# Graceful shutdown
TimeoutStopSec=30
KillSignal=SIGTERM

# Logging
StandardOutput=append:${LOG_DIR}/omo-switch.log
StandardError=append:${LOG_DIR}/omo-switch.error.log
SyslogIdentifier=${SERVICE_NAME}

# Start command
ExecStart=${BIN_DIR}/omo-switch -c ${CONFIG_FILE} -p ${PORT}

# Restart policy
Restart=on-failure
RestartSec=5
StartLimitInterval=60s
StartLimitBurst=3

[Install]
WantedBy=default.target
EOF

echo -e "${GREEN}  ✓ Created service file at ${SERVICE_FILE}${NC}"

# Step 6: Reload systemd and start service
echo -e "${YELLOW}Step 6/6: Enabling and starting service...${NC}"
systemctl --user daemon-reload
systemctl --user enable "${SERVICE_NAME}.service"

# Stop the service if it's already running
if systemctl --user is-active --quiet "${SERVICE_NAME}"; then
    echo "  Stopping existing service..."
    systemctl --user stop "${SERVICE_NAME}"
fi

# Start the service
systemctl --user start "${SERVICE_NAME}"
echo -e "${GREEN}  ✓ Service enabled and started${NC}"

# Wait a moment and check status
sleep 2
if systemctl --user is-active --quiet "${SERVICE_NAME}"; then
    echo -e "${GREEN}  ✓ Service is running${NC}"
    systemctl --user status "${SERVICE_NAME}" --no-pager | grep -E "(Active:|PID:|Main PID:)"
else
    echo -e "${YELLOW}  ⚠ Service may not have started yet. Check logs:${NC}"
    echo "    journalctl --user -u ${SERVICE_NAME} -n 50 --no-pager"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Installation Complete!${NC}"
echo "=========================================="
echo ""
echo "Service:      ${SERVICE_NAME}"
echo "Port:         ${PORT}"
echo "Install Dir:  ${INSTALL_DIR}"
echo "Config:       ${CONFIG_FILE}"
echo "Logs:         ${LOG_DIR}/"
echo ""
echo "Commands:"
echo "  Start:       systemctl --user start ${SERVICE_NAME}"
echo "  Stop:        systemctl --user stop ${SERVICE_NAME}"
echo "  Restart:     systemctl --user restart ${SERVICE_NAME}"
echo "  Status:      systemctl --user status ${SERVICE_NAME}"
echo "  Logs:        journalctl --user -u ${SERVICE_NAME} -f"
echo "  Error Logs:  tail -f ${LOG_DIR}/omo-switch.error.log"
echo ""
echo "To uninstall, run: ./script/linux/uninstall.sh"
echo ""
