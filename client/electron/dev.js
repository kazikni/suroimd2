const {app, BrowserWindow} = require("electron")
const port=3000
app.once("ready", () => {
    const window = new BrowserWindow({
        autoHideMenuBar: false,
    })
    window.setIcon("public/favicon.ico")
    window.setTitle("Surgemd.io")
    window.loadURL(`http://localhost:${port}`,{
    })
});