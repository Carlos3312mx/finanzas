const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "Planificador Financiero Personal",
    icon: path.join(__dirname, 'icon-512.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#08080c',
    autoHideMenuBar: true
  });

  // Cargar index.html
  win.loadFile(path.join(__dirname, 'index.html'));

  // Desactivar menú contextual (clic derecho) por defecto
  win.webContents.on('context-menu', (e) => {
    e.preventDefault();
  });

  // Desactivar atajos de zoom y refresco de desarrollador en producción
  win.webContents.on('before-input-event', (event, input) => {
    // Bloquear Ctrl+R y F5 para evitar refrescar la app de manera accidentada
    if (input.control && input.key.toLowerCase() === 'r' || input.key === 'F5') {
      event.preventDefault();
    }
    // Bloquear zoom (Ctrl + , Ctrl -)
    if (input.control && (input.key === '=' || input.key === '-')) {
      event.preventDefault();
    }
    // Bloquear DevTools (Ctrl+Shift+I o F12)
    if ((input.control && input.shift && input.key.toLowerCase() === 'i') || input.key === 'F12') {
      event.preventDefault();
    }
  });
}

// Inicialización de Electron
app.whenReady().then(() => {
  // Desactivar menús nativos del sistema en macOS/Windows
  Menu.setApplicationMenu(null);
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
