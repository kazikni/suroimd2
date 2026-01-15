const { app, BrowserWindow, protocol, net, Menu } = require('electron');
const path = require('path');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      devTools: true,
    },
  });
  win.setTitle("Surgemd.io");
  win.loadURL("app://main/");
  Menu.setApplicationMenu(null)
}

app.whenReady().then(() => {
  protocol.handle('app', async (request) => {
    const fullUrl = new URL(request.url);
    const pathname = decodeURIComponent(fullUrl.host+"/"+fullUrl.pathname)

    let filePath;
    if (!pathname || pathname.endsWith('/')) {
      filePath = path.join(__dirname, `../${pathname}`, 'index.html');
    } else {
      filePath = path.join(__dirname, '../', pathname);
    }
    if (filePath.endsWith('/')) filePath = filePath.slice(1);

    return await net.fetch(`file://${filePath}`);
  });

  createWindow();
});
