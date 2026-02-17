/**
 * Main Process Entry Point
 * Sets up Electron BrowserWindow with security settings
 * FIXED: Suppresses url.parse() deprecation warning from Electron/dependencies
 */

import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { registerAuthHandlers, clearSession, initializeAuth } from './ipc/authHandlers';
import { registerTestHandlers } from './ipc/testHandlers';
import { registerTemplateHandlers } from './ipc/templateHandlers';

// FIX: Suppress url.parse() deprecation warning from Electron internals and axios
// This warning comes from Electron/axios dependencies, not our code
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  // Suppress only the specific DEP0169 warning about url.parse()
  if (warning.name === 'DeprecationWarning' && warning.message.includes('url.parse')) {
    return; // Silently ignore
  }
  // Log other warnings normally
  console.warn(warning.name, warning.message);
});

let mainWindow: BrowserWindow | null = null;

// Disable hardware acceleration for better compatibility
app.disableHardwareAcceleration();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      // Security settings
      nodeIntegration: false, // Do not expose Node.js to renderer
      contextIsolation: true, // Isolate context between main and renderer
      sandbox: true, // Enable sandboxing
      webSecurity: true, // Enable web security
      allowRunningInsecureContent: false,
      
      // Preload script - use path.join for proper path resolution
      preload: path.join(__dirname, '../preload.js'),
    },
    // Window styling
    backgroundColor: '#ffffff',
    show: false, // Don't show until ready
    title: 'Jira Xray Orchestrator',
  });

  // Load the app
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Prevent navigation to external URLs (security)
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
      event.preventDefault();
    }
  });

  // Prevent opening new windows (security)
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
}

// Register IPC handlers
function registerHandlers() {
  registerAuthHandlers();
  registerTestHandlers();
  registerTemplateHandlers();
}

// App lifecycle
app.whenReady().then(async () => {
  // Initialize auth from .env before starting (THIS WILL CACHE METADATA)
  await initializeAuth();
  registerHandlers();
  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clear session when app quits
app.on('will-quit', () => {
  clearSession();
});

// Security: Disable remote module for webContents
app.on('web-contents-created', (_, contents) => {
  contents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
});