const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loginWithDiscord: () => ipcRenderer.invoke('discord-login'),
  logout: () => ipcRenderer.invoke('discord-logout'),
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('window-toggle-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  isWindowMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onWindowMaximizedChange: (callback) => {
    if (typeof callback !== 'function') {
      return () => {};
    }

    const listener = (_event, isMaximized) => callback(isMaximized);
    ipcRenderer.on('window:maximized-changed', listener);

    return () => {
      ipcRenderer.removeListener('window:maximized-changed', listener);
    };
  },
});
