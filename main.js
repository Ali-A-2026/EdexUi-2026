const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const os = require('node:os');
const { exec } = require('node:child_process');

const isDev = !app.isPackaged;

function sampleCpuUsage() {
  const first = os.cpus();
  return new Promise((resolve) => {
    setTimeout(() => {
      const second = os.cpus();
      const totalUsage = second.reduce((acc, cpu, index) => {
        const prev = first[index].times;
        const next = cpu.times;
        const idle = next.idle - prev.idle;
        const total = Object.keys(next).reduce((sum, key) => sum + (next[key] - prev[key]), 0);
        const usage = total <= 0 ? 0 : (1 - idle / total) * 100;
        return acc + usage;
      }, 0);
      resolve(Number((totalUsage / second.length).toFixed(1)));
    }, 150);
  });
}

async function gatherSystemSnapshot() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const cpus = os.cpus();
  const networkInterfaces = os.networkInterfaces();

  const addresses = Object.entries(networkInterfaces)
    .flatMap(([name, addresses]) => (addresses || []).map((details) => ({ name, ...details })))
    .filter((details) => !details.internal)
    .slice(0, 6)
    .map((details) => ({
      label: details.name,
      family: details.family,
      address: details.address,
      mac: details.mac,
    }));

  return {
    hostname: os.hostname(),
    platform: `${os.type()} ${os.release()}`,
    arch: os.arch(),
    uptimeMinutes: Math.floor(os.uptime() / 60),
    cpuModel: cpus[0]?.model ?? 'Unknown CPU',
    cpuCores: cpus.length,
    cpuUsage: await sampleCpuUsage(),
    totalMemoryGb: Number((totalMem / 1024 / 1024 / 1024).toFixed(1)),
    usedMemoryGb: Number(((totalMem - freeMem) / 1024 / 1024 / 1024).toFixed(1)),
    memoryUsage: Number((((totalMem - freeMem) / totalMem) * 100).toFixed(1)),
    loadAverage: os.loadavg().map((value) => Number(value.toFixed(2))),
    addresses,
    shell: process.env.SHELL || '/bin/bash',
  };
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1680,
    height: 960,
    minWidth: 1280,
    minHeight: 760,
    backgroundColor: '#030b07',
    autoHideMenuBar: true,
    title: 'eDEX-UI 2026',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    win.loadURL('http://127.0.0.1:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  ipcMain.handle('system:snapshot', () => gatherSystemSnapshot());
  ipcMain.handle('terminal:run', (_event, command) => {
    return new Promise((resolve) => {
      exec(command, { shell: process.env.SHELL || '/bin/bash', timeout: 15000 }, (error, stdout, stderr) => {
        resolve({
          ok: !error,
          code: error?.code ?? 0,
          stdout,
          stderr,
        });
      });
    });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
