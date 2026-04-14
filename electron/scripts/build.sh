#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ELECTRON_ROOT="$SCRIPT_DIR/.."
WEB_ROOT="$ELECTRON_ROOT/../web"
RELEASE_DIR="$WEB_ROOT/public/release"

echo "=== Step 1: Build web app ==="
cd "$WEB_ROOT"
npm run build

echo ""
echo "=== Step 2: Copy web/dist → electron/renderer ==="
node "$ELECTRON_ROOT/scripts/copy-renderer.js"

echo ""
echo "=== Step 3: Build Electron main + preload ==="
cd "$ELECTRON_ROOT"
npm run build:electron

echo ""
echo "=== Step 4: Package Mac (.dmg) ==="
npx electron-builder --mac

echo ""
echo "=== Step 5: Package Windows (.exe) ==="
npx electron-builder --win

echo ""
echo "=== Step 6: Copy builds to web/public/release/ ==="
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"

# Copy with predictable names for download links
cp "$ELECTRON_ROOT/release/Copilot DICOM Viewer-"*".dmg" "$RELEASE_DIR/CopilotDICOMViewer-mac.dmg"
cp "$ELECTRON_ROOT/release/Copilot DICOM Viewer Setup"*".exe" "$RELEASE_DIR/CopilotDICOMViewer-win.exe"

echo ""
echo "=== Done! ==="
ls -lh "$RELEASE_DIR/"
echo ""
echo "Files ready at web/public/release/"
echo "  Mac:     /release/CopilotDICOMViewer-mac.dmg"
echo "  Windows: /release/CopilotDICOMViewer-win.exe"
