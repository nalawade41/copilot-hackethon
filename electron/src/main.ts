import 'dotenv/config';
import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { registerPacsHandlers } from './ipc/handlers';
import { DEV_URL } from './config';

// Single source of truth for "the main app window". IPC events (poller
// broadcasts) are routed here specifically — NOT via BrowserWindow.getAllWindows(),
// whose order is undefined and can return a transient popup (e.g. a
// target="_blank" link to the Orthanc admin UI).
let mainWindow: BrowserWindow | null = null;

export function getMainWindow(): BrowserWindow | null {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    backgroundColor: '#020617',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow = win;
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null;
  });

  // Allow target="_blank" / window.open() to spawn an in-app popup window
  // (e.g. the Orthanc admin UI). IPC event targeting is pinned to the main
  // window via getMainWindow() below, so extra windows don't interfere with
  // poller broadcasts. These popups don't load our preload — that's fine,
  // they're just external content.
  win.webContents.setWindowOpenHandler(() => ({
    action: 'allow',
    overrideBrowserWindowOptions: {
      width: 1100,
      height: 760,
      backgroundColor: '#020617',
      autoHideMenuBar: true,
    },
  }));

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  } else {
    win.loadURL(DEV_URL);
  }
}

// Register IPC handlers + start poller ONCE at app start, not per-window.
// On macOS, createWindow() can fire multiple times (activate events);
// re-registering ipcMain handlers throws.
app.whenReady().then(() => {
  registerPacsHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
