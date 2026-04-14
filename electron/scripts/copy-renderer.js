/**
 * Pre-build script for electron-builder.
 * Copies the pre-built web app (web/dist/) into electron/renderer/
 * so it gets bundled into the packaged Electron app.
 *
 * Called via the "beforeBuild" hook in electron-builder config.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../../web/dist');
const DEST = path.resolve(__dirname, '../renderer');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`[copy-renderer] ERROR: ${src} does not exist. Run "cd web && npm run build" first.`);
    process.exit(1);
  }

  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true });
  }

  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log(`[copy-renderer] Copying ${SRC} → ${DEST}`);
copyRecursive(SRC, DEST);
console.log(`[copy-renderer] Done.`);
