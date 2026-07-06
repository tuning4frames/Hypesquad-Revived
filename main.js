const { app, BrowserWindow, ipcMain, nativeImage, session } = require('electron');
const path = require('path');

let mainWindow = null;
let loginWindow = null;
let loginPromise = null;
let loginResolve = null;
let loginSession = null;
const loginPartitions = new Set();

function createMainWindow() {
  const windowIcon = nativeImage.createFromPath(path.join(__dirname, 'images', 'hypesquad-wing.svg'));

  mainWindow = new BrowserWindow({
    width: 452,
    height: 615,
    minWidth: 452,
    minHeight: 615,
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    backgroundColor: '#050816',
    icon: windowIcon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile('index.html');

  const sendWindowState = () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    mainWindow.webContents.send('window:maximized-changed', mainWindow.isMaximized());
  };

  mainWindow.on('maximize', sendWindowState);
  mainWindow.on('unmaximize', sendWindowState);
  mainWindow.webContents.on('did-finish-load', sendWindowState);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function cleanupLoginWindow() {
  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.removeAllListeners('closed');
    loginWindow.close();
  }

  loginWindow = null;
  loginPromise = null;
  loginSession = null;
}

function resolveLogin(token) {
  if (typeof loginResolve === 'function') {
    loginResolve(token);
  }

  loginResolve = null;
  cleanupLoginWindow();
}

function createLoginWindow() {
  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.focus();
    return loginPromise;
  }

  const partition = `discord-login-${Date.now()}`;
  loginSession = session.fromPartition(partition);
  loginPartitions.add(partition);

  loginWindow = new BrowserWindow({
    width: 500,
    height: 800,
    parent: mainWindow || undefined,
    modal: Boolean(mainWindow),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition,
    },
  });

  loginWindow.loadURL('https://discord.com/login');

  loginPromise = new Promise((resolve) => {
    loginResolve = resolve;

    loginSession.webRequest.onBeforeSendHeaders({ urls: ['https://discord.com/api/*'] }, (details, callback) => {
      const authorization = details.requestHeaders?.Authorization || details.requestHeaders?.authorization;

      if (authorization && String(authorization).trim()) {
        callback({ requestHeaders: details.requestHeaders });
        resolveLogin(String(authorization).trim());
        return;
      }

      callback({ requestHeaders: details.requestHeaders });
    });

    loginWindow.on('closed', () => {
      resolveLogin(null);
    });
  });

  return loginPromise;
}

ipcMain.handle('discord-login', async () => {
  try {
    return await createLoginWindow();
  } catch (error) {
    return null;
  }
});

ipcMain.handle('discord-logout', async () => {
  const sessionsToClear = [session.defaultSession];

  loginPartitions.forEach((partition) => {
    sessionsToClear.push(session.fromPartition(partition));
  });

  await Promise.all(
    sessionsToClear.map(async (ses) => {
      await ses.clearStorageData();
      await ses.clearCache();
    })
  );
});

ipcMain.handle('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window-toggle-maximize', () => {
  if (!mainWindow) {
    return false;
  }

  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
    return false;
  }

  mainWindow.maximize();
  return true;
});

ipcMain.handle('window-close', () => {
  mainWindow?.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow?.isMaximized() || false;
});

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
