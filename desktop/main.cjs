const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('node:path');

const isSmokeTest = process.argv.includes('--smoke-test');

app.setAppUserModelId('com.mischen225.apd-infrared-link-simulator');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1180,
    minHeight: 720,
    show: !isSmokeTest,
    backgroundColor: '#071013',
    title: 'APD红外光链路综合仿真平台',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (/^https?:\/\//i.test(url)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  mainWindow.webContents.once('did-fail-load', (_event, code, description) => {
    console.error(`Desktop UI failed to load (${code}): ${description}`);
    if (isSmokeTest) app.exit(1);
  });

  mainWindow.webContents.once('did-finish-load', () => {
    if (isSmokeTest) {
      console.log('DESKTOP_SMOKE_TEST_OK');
      setTimeout(() => app.quit(), 250);
    }
  });

  void mainWindow.loadFile(path.join(__dirname, '..', 'dist-desktop', 'index.html'));
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
