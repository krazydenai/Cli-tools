#!/bin/bash
SCRIPT_DIR="$(dirname "$0")"
# Auto-make this script executable on first run
node -e "const fs=require('fs'); try{fs.chmodSync('$SCRIPT_DIR/launch.sh', 0o755);}catch(e){}" 2>/dev/null
cd "$SCRIPT_DIR"
node KrazydenAI.js
