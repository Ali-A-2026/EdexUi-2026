const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('edexApi', {
  getSystemSnapshot: () => ipcRenderer.invoke('system:snapshot'),
  runCommand: (command) => ipcRenderer.invoke('terminal:run', command),
});
