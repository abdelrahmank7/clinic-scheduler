// main.js - This is the main process of your Electron app.
const { app, BrowserWindow } = require("electron");
const path = require("path");

// This function creates the main browser window.
const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      // This is crucial for security. The preload script can expose
      // specific Node.js APIs to the renderer process.
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // This loads your built web application from the 'dist' folder.
  // The path is relative to the root of your project.
  win.loadFile(path.join(__dirname, "dist", "index.html"));
};

// When the Electron app is ready, create the window.
app.whenReady().then(() => {
  createWindow();

  // On macOS, it's common to re-create a window when the dock icon is clicked
  // and there are no other windows open.
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit the app when all windows are closed, except on macOS.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
