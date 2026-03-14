#!/bin/bash
SCRIPT_DIR="$(dirname "$0")"
# Auto-fix permissions and launch
node -e "const fs=require('fs'); fs.chmodSync('$SCRIPT_DIR/launch.command', 0o755);" 2>/dev/null
cd "$SCRIPT_DIR"
node KrazydenAI.js
