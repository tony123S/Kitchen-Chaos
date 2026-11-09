// Kitchen Chaos main process.
// Opens the app window, allows the camera only for our own bundled page,
// connects the official SmartSpectra IPC bridge, and hands the API key
// (read from .env) to the window when it asks for it.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow, ipcMain, session, shell } = require('electron');

// Packaged builds ship the native runtime as an extra resource (see the
// official electron-quickstart sample). During `npm start` this is skipped.
if (app.isPackaged && !process.env.SMARTSPECTRA_CAPI_PATH) {
  const lib = {
    darwin: 'libsmartspectra_capi.dylib',
    win32: 'smartspectra_capi.dll',
    linux: 'libsmartspectra_capi.so',
  }[process.platform];
  if (lib) process.env.SMARTSPECTRA_CAPI_PATH = path.join(process.resourcesPath, 'smartspectra', lib);
}

const { bindSmartSpectraIpc } = require('@smartspectra/node-sdk/main');

/** Reads KEY=value lines from .env without extra dependencies. */
function readEnvFile(file) {
  const values = {};
  if (!fs.existsSync(file)) return values;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return values;
}

const env = { ...readEnvFile(path.join(__dirname, '.env')), ...process.env };
const config = {
  apiKey: env.SMARTSPECTRA_API_KEY || '',
  telemetry: String(env.SMARTSPECTRA_TELEMETRY || 'false').toLowerCase() === 'true',
};

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 380,
    minHeight: 600,
    backgroundColor: '#fff8ec',
    title: 'Kitchen Chaos',
    webPreferences: {
      preload: path.join(__dirname, 'dist', 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  bindSmartSpectraIpc(win);

  // The app only ever shows its own local page.
  // Links such as the Presage privacy page open in the normal web browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event) => event.preventDefault());

  win.loadFile(path.join(__dirname, 'index.html'));
  if (process.env.KITCHEN_CHAOS_DEVTOOLS === '1') win.webContents.openDevTools({ mode: 'detach' });
}

app.whenReady().then(() => {
  // Camera only (no microphone), and only for our own file:// page.
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback, details) => {
    const url = (details && details.requestingUrl) || (wc && wc.getURL()) || '';
    const mediaTypes = (details && details.mediaTypes) || [];
    const cameraOnly = mediaTypes.length === 1 && mediaTypes[0] === 'video';
    callback(permission === 'media' && cameraOnly && url.startsWith('file://'));
  });

  ipcMain.handle('kitchen-chaos:config', () => ({ ...config }));

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
