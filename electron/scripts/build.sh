#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ELECTRON_ROOT="$SCRIPT_DIR/.."
WEB_ROOT="$ELECTRON_ROOT/../web"
REPO_ROOT="$ELECTRON_ROOT/.."
RELEASE_DIR="$WEB_ROOT/public/release"
STAGING_DIR="$REPO_ROOT/release"   # temporary root-level staging for built artifacts

# -----------------------------------------------------------------------------
# Isolated per-platform build pipeline.
#
# Each platform (Mac, Windows) is built from a CLEAN tree. That avoids the
# recursive-inclusion bug where previous build outputs (web/public/release/)
# get copied into web/dist/ → electron/renderer/ → next installer, ballooning
# size on every rebuild.
#
# Flow:
#   1. Create a fresh temp staging dir at repo-root/release/
#   2. Clean → build web + electron → package Mac → move .dmg to staging
#   3. Clean → build web + electron → package Windows → move .exe to staging
#   4. Clean all intermediate outputs
#   5. Move both artifacts from staging → web/public/release/
#   6. Remove the temp staging dir
# -----------------------------------------------------------------------------

clean_build_outputs() {
  rm -rf "$ELECTRON_ROOT/release"
  rm -rf "$ELECTRON_ROOT/renderer"
  rm -rf "$WEB_ROOT/public/release"
  rm -rf "$WEB_ROOT/dist"
}

prepare_build() {
  # Runs web build + copies renderer + builds electron main/preload.
  # Executed fresh before each platform package for isolation.
  cd "$WEB_ROOT"
  npm run build
  node "$ELECTRON_ROOT/scripts/copy-renderer.js"
  cd "$ELECTRON_ROOT"
  npm run build:electron
}

echo "=== Step 0: Prepare temporary staging dir at $STAGING_DIR ==="
rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"
echo ""

# -----------------------------------------------------------------------------
echo "=== Step 1a: Clean tree before Mac build ==="
clean_build_outputs
echo ""

echo "=== Step 1b: Build web + electron for Mac ==="
prepare_build
echo ""

echo "=== Step 1c: Package Mac (.dmg) ==="
cd "$ELECTRON_ROOT"
npx electron-builder --mac
echo ""

echo "=== Step 1d: Move Mac build to $STAGING_DIR ==="
mv "$ELECTRON_ROOT/release/Copilot DICOM Viewer-"*".dmg" "$STAGING_DIR/CopilotDICOMViewer-mac.dmg"
echo ""

# -----------------------------------------------------------------------------
echo "=== Step 2a: Clean tree before Windows build ==="
clean_build_outputs
echo ""

echo "=== Step 2b: Build web + electron for Windows ==="
prepare_build
echo ""

echo "=== Step 2c: Package Windows (.exe) ==="
cd "$ELECTRON_ROOT"
npx electron-builder --win
echo ""

echo "=== Step 2d: Move Windows build to $STAGING_DIR ==="
mv "$ELECTRON_ROOT/release/Copilot DICOM Viewer Setup"*".exe" "$STAGING_DIR/CopilotDICOMViewer-win.exe"
echo ""

# -----------------------------------------------------------------------------
echo "=== Step 3: Final clean of all intermediate outputs ==="
clean_build_outputs
echo ""

# -----------------------------------------------------------------------------
echo "=== Step 4: Publish both artifacts to $RELEASE_DIR ==="
mkdir -p "$RELEASE_DIR"
mv "$STAGING_DIR/CopilotDICOMViewer-mac.dmg" "$RELEASE_DIR/"
mv "$STAGING_DIR/CopilotDICOMViewer-win.exe" "$RELEASE_DIR/"
echo ""

echo "=== Step 5: Remove temp staging dir ==="
rmdir "$STAGING_DIR"
echo ""

echo "=== Done! ==="
ls -lh "$RELEASE_DIR/"
echo ""
echo "Files ready at web/public/release/"
echo "  Mac:     /release/CopilotDICOMViewer-mac.dmg"
echo "  Windows: /release/CopilotDICOMViewer-win.exe"
