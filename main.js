const { app, BrowserWindow, Menu, session } = require('electron');
const Store = require('electron-store');
const path = require('path');

class SessionManager {
  constructor() {
    this.store = new Store();
  }

  async restoreSessionCookies(url) {
    const cookies = this.store.get(`${url}_cookies`);
    if (cookies) {
      const ses = session.defaultSession;
      await ses.cookies.set({ url, name: 'session_cookie', value: cookies });
    }
  }

  async saveSessionCookies(url, cookies) {
    if (cookies.length > 0) {
      const sessionCookies = cookies.map(cookie => ({ name: cookie.name, value: cookie.value }));
      this.store.set(`${url}_cookies`, sessionCookies);
    }
  }

  clearSessionCookies(url) {
    this.store.delete(`${url}_cookies`);
  }
}

let mainWindow;

app.on('ready', async () => {
  const sessionManager = new SessionManager();

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1300,
      height: 900,
      webPreferences: {
        nodeIntegration: true
      },
      icon: path.join(__dirname, 'icon.png')
    });

    mainWindow.loadURL('https://class.utp.edu.pe');

    mainWindow.webContents.on('did-finish-load', async () => {
      const ses = mainWindow.webContents.session;

      try {
        const cookies = await ses.cookies.get({ url: 'https://class.utp.edu.pe' });
        await sessionManager.saveSessionCookies('https://class.utp.edu.pe', cookies);
      } catch (error) {
        console.error('Error al obtener las cookies de sesión:', error);
      }
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    const template = [
      {
        label: 'File',
        click: () => {
          // Puedes agregar funcionalidad para la opción "File" aquí si es necesario
        }
      },
      {
        label: 'View',
        submenu: [
          { label: 'Reload', role: 'reload' },
          { label: 'Toggle Developer Tools', role: 'toggleDevTools' }
        ]
      },
      // Agregar las opciones directamente al menú principal
      {
        label: 'Class UTP',
        click: () => loadPageWithCookies('https://class.utp.edu.pe')
      },
      {
        label: 'Portal UTP',
        click: () => loadPageWithCookies('https://portal.utp.edu.pe')
      },
      {
        label: 'Info UTP',
        click: () => loadPageWithCookies('https://info.utp.edu.pe')
      },
      {
        label: 'Biblioteca UTP',
        click: () => loadPageWithCookies('https://tubiblioteca.utp.edu.pe/cgi-bin/koha/TB-user.pl?ref=%2Fcgi-bin%2Fkoha%2FTB-search.pl')
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  async function loadPageWithCookies(url) {
    mainWindow.loadURL(url);
    const ses = mainWindow.webContents.session;

    try {
      await sessionManager.restoreSessionCookies(url);
    } catch (error) {
      console.error(`Error al restaurar cookies de ${url}:`, error);
    }

    mainWindow.webContents.on('did-finish-load', async () => {
      const cookies = await ses.cookies.get({ url });
      await sessionManager.saveSessionCookies(url, cookies);
    });
  }

  app.on('before-quit', () => {
    sessionManager.clearSessionCookies('https://class.utp.edu.pe');
    // Limpia cookies de otros sitios UTP si es necesario
  });

  app.whenReady().then(createWindow);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
});
