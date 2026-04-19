#!/bin/bash
# Hive CLI Installer - Cross-Platform
#
# Supports: Mac, Linux, Termux (Android)
# Usage: bash install.sh [options]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

HIVE_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="${HIVE_DIR}"
BIN_DIR="${INSTALL_DIR}/cli"

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║           🏛️ HIVE CLI INSTALLER 🏛️                      ║"
echo "║           Cross-Platform Installation                     ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Detect platform
detect_platform() {
    if [ -n "$TERMUX_VERSION" ] || [ -d "/data/data/com.termux/files" ]; then
        echo "termux"
    elif [ "$(uname)" = "Darwin" ]; then
        echo "macos"
    elif [ "$(uname)" = "Linux" ]; then
        echo "linux"
    else
        echo "unknown"
    fi
}

# Check dependencies
check_deps() {
    echo -e "\n${YELLOW}Checking dependencies...${NC}"
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Error: Node.js not found${NC}"
        echo "Please install Node.js: https://nodejs.org"
        exit 1
    fi
    
    local node_version=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js: $node_version"
    
    if command -v npm &> /dev/null; then
        local npm_version=$(npm --version)
        echo -e "${GREEN}✓${NC} npm: $npm_version"
    fi
    
    # Check for termux-api if on termux
    if [ "$(detect_platform)" = "termux" ]; then
        if command -v termux-camera-photo &> /dev/null; then
            echo -e "${GREEN}✓${NC} Termux:API"
        else
            echo -e "${YELLOW}⚠${NC} Termux:API (optional - install with: pkg install termux-api)"
        fi
    fi
}

# Install Hive CLI
install_hive() {
    local install_path="$1"
    local bin_path="$2"
    
    echo -e "\n${YELLOW}Installing Hive CLI to: ${install_path}${NC}"
    
    # Create bin directory
    mkdir -p "${bin_path}"
    
    # Copy CLI files
    cp -r "${HIVE_DIR}/cli" "${install_path}/"
    
    # Create symlink for hive command
    ln -sf "${bin_path}/hive" "${bin_path}/../hive" 2>/dev/null || true
    
    echo -e "${GREEN}✓${NC} Installed!"
}

# Install for different platforms
install_macos() {
    echo -e "\n${BLUE}Installing for macOS...${NC}"
    
    if [ -w "/usr/local/bin" ]; then
        install_path="/usr/local/hive"
        bin_path="/usr/local/bin"
    else
        install_path="${HOME}/.hive"
        bin_path="${HOME}/bin"
        mkdir -p "${HOME}/bin"
    fi
    
    install_hive "$install_path" "$bin_path"
    
    # Add to PATH if needed
    if [ -d "$HOME/bin" ] && [ -z "$(grep '$HOME/bin' ~/.zshrc 2>/dev/null)" ]; then
        echo 'export PATH="$HOME/bin:$PATH"' >> ~/.zshrc
        echo -e "${YELLOW}Added ~/bin to PATH in ~/.zshrc${NC}"
    fi
    
    echo -e "\n${GREEN}✓ Done! Run 'hive help' to get started${NC}"
}

install_linux() {
    echo -e "\n${BLUE}Installing for Linux...${NC}"
    
    if [ -w "/usr/local/bin" ]; then
        install_path="/usr/local/hive"
        bin_path="/usr/local/bin"
    else
        install_path="${HOME}/.hive"
        bin_path="${HOME}/.local/bin"
        mkdir -p "${HOME}/.local/bin"
    fi
    
    install_hive "$install_path" "$bin_path"
    
    echo -e "\n${GREEN}✓ Done! Run 'hive help' to get started${NC}"
}

install_termux() {
    echo -e "\n${BLUE}Installing for Termux (Android)...${NC}"
    
    install_path="${HOME}/hive"
    bin_path="${HOME}/bin"
    mkdir -p "${HOME}/bin"
    
    install_hive "$install_path" "$bin_path"
    
    # Check for termux-api
    if ! command -v termux-camera-photo &> /dev/null; then
        echo -e "\n${YELLOW}⚠ Termux:API not installed${NC}"
        echo "To enable camera, SMS, etc: pkg install termux-api"
    fi
    
    echo -e "\n${GREEN}✓ Done! Run 'hive help' to get started${NC}"
}

# Update Hive
update_hive() {
    echo -e "\n${YELLOW}Updating Hive CLI...${NC}"
    cd "$HIVE_DIR"
    
    if command -v git &> /dev/null; then
        git pull origin main
        echo -e "${GREEN}✓ Updated!${NC}"
    else
        echo -e "${RED}Git not found. Cannot update.${NC}"
    fi
}

# Uninstall Hive
uninstall_hive() {
    echo -e "\n${RED}Uninstalling Hive...${NC}"
    
    local platform=$(detect_platform)
    
    if [ "$platform" = "termux" ]; then
        rm -rf "${HOME}/hive"
        rm -f "${HOME}/bin/hive" 2>/dev/null || true
    elif [ -w "/usr/local/bin" ]; then
        rm -rf /usr/local/hive
        rm -f /usr/local/bin/hive 2>/dev/null || true
    else
        rm -rf "${HOME}/.hive"
        rm -f "${HOME}/bin/hive" 2>/dev/null || true
        rm -f "${HOME}/.local/bin/hive" 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✓ Uninstalled!${NC}"
}

# Main
main() {
    local cmd="${1:-install}"
    local platform=$(detect_platform)
    
    case "$cmd" in
        install)
            check_deps
            case "$platform" in
                termux) install_termux ;;
                macos) install_macos ;;
                linux) install_linux ;;
                *) echo "Unknown platform"; exit 1 ;;
            esac
            ;;
        update)
            update_hive
            ;;
        uninstall)
            uninstall_hive
            ;;
        help|--help|-h)
            echo "Hive CLI Installer"
            echo ""
            echo "Usage: bash install.sh [command]"
            echo ""
            echo "Commands:"
            echo "  install    Install Hive CLI (default)"
            echo "  update      Update Hive CLI"
            echo "  uninstall   Remove Hive CLI"
            echo "  help        Show this help"
            ;;
        *)
            echo "Unknown command: $cmd"
            echo "Run 'bash install.sh help' for usage"
            exit 1
            ;;
    esac
}

main "$@"