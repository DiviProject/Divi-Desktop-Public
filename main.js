const electron      = require('electron');
const app           = electron.app;
const dialog        = electron.dialog;
const BrowserWindow = electron.BrowserWindow;
const path          = require('path');
const fs            = require('fs');
const url           = require('url');
const platform      = require('os').platform();
const rxIpc         = require('rx-ipc-electron/lib/main').default;
const Observable    = require('rxjs/Observable').Observable;
const packageJson   = require('./package.json');
const util          = require('./modules/util/util');
const {autoUpdater} = require("electron-updater");
const globalStore   = require('./modules/global-store/global-store');

const DOUBLE_SHUTDOWN_INTERVAL_DELAY = ( 30 * 1000 );	//30 seconds in ms = 30 * 1000

/* correct appName and userData to respect Linux standards */
if (process.platform === 'linux') {
  app.setName('divi-desktop');
  app.setPath('userData', `${app.getPath('appData')}/${app.getName()}`);
}

const roamingDtPath = util.getRoamingDiviDesktopPath();
const dividPath = util.getRoamingDiviDesktopPath('divid');
const settingsPath = util.getRoamingDiviDesktopPath('Settings');
let client = "";

/* check for paths existence and create */
[ app.getPath('userData'),
].map(path => !fs.existsSync(path) && fs.mkdir(path));

const log     = require('./modules/logger').init();

process.on('uncaughtException', (err) => { log.error(err); });

autoUpdater.logger = log;
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let tray;
let mainMenu;

if (!fs.existsSync(roamingDtPath)) {
  util.createMissingFolder(roamingDtPath);
}

if (!fs.existsSync(settingsPath)) {
  util.createMissingFile(settingsPath);
}

/* remove divid when there is a newer version of the app */
if (packageJson.version) {
  client = util.getConfValue(settingsPath, 'client', undefined, true);
  if (packageJson.version !== client) {
    util.deleteFolderRecursive(dividPath);
    util.setConfValue(settingsPath, 'client', packageJson.version);
  }
}

const options = require('./modules/options').parse();
const init    = require('./modules/init');

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  initMainWindow();
  init.start(mainWindow);
});

function sendUpdaterStatus(eventType, eventData) {
  mainWindow.webContents.send('auto-updater', eventType, eventData);
}

autoUpdater.on('checking-for-update', () => {
  sendUpdaterStatus('checking-for-update', null);
})
autoUpdater.on('update-available', (info) => {
  sendUpdaterStatus('update-available', info);
})
autoUpdater.on('update-not-available', (info) => {
  sendUpdaterStatus('update-not-available', info);
})
autoUpdater.on('error', (err) => {
  sendUpdaterStatus('error', err);
})
autoUpdater.on('download-progress', (progressObj) => {
  sendUpdaterStatus('download-progress', progressObj);
})
autoUpdater.on('update-downloaded', (info) => {
  app.isQuiting = true;
  sendUpdaterStatus('update-downloaded', info);
});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  log.info("window-all-closed");
  app.isQuiting = true;
  setInterval( app.quit, DOUBLE_SHUTDOWN_INTERVAL_DELAY );
  app.quit();

  tray = null;
  mainMenu = null;
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow == null) {
    initMainWindow();
    app.isQuiting = false;
  }

  mainWindow.show();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
app.on('browser-window-created', function (e, window) {
  window.setMenu(null);
});

/*
** initiates the Main Window
*/
function initMainWindow() {
  tray = makeTray();

  // Create the browser window.
  mainWindow = new BrowserWindow({
    // width: on Win, the width of app is few px smaller than it should be
    // (this triggers smaller breakpoints) - this size should cause
    // the same layout results on all OSes
    // minWidth/minHeight: both need to be specified or none will work
    width:     1024,
    minWidth:  1024,
    height:    675,
    minHeight: 675,
    icon: path.join(__dirname, 'resources/icon.png'),
    transparent: false,

    frame: true,

    webPreferences: {
      backgroundThrottling: false,
      webviewTag: false,
      nodeIntegration: false,
      sandbox: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false
    },
  });

  // th3brink: Added for debugging integrations of divi && Remove after integration
  // mainWindow.openDevTools();

  // and load the index.html of the app.
  if (options.dev) {
    mainWindow.loadURL('http://localhost:4200');
  } else {
    mainWindow.loadURL(url.format({
      protocol: 'file:',
      pathname: path.join(__dirname, 'dist/index.html'),
      slashes: true
    }));

    mainMenu = makeMainMenu();
  }

  // Open the DevTools.
  if (options.devtools) {
    mainWindow.webContents.openDevTools()
  }

  // handle external URIs
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    electron.shell.openExternal(url);
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    log.info('mainWindow closed');
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  });

  function close() {
    mainWindow.webContents.send('app-event', 'shutdown');

    app.isDaemonStopping = true;

    init.stop().then(() => {
      app.isQuiting = true;

      if (mainWindow) {
        mainWindow.close();
      }
      setInterval( app.quit, DOUBLE_SHUTDOWN_INTERVAL_DELAY );
      app.quit();
    });
  }

  //reboot or shutdown on win
  mainWindow.on('session-end', (event) => {
    if (event && event.preventDefault) {
      event.preventDefault();
    }
    close();
  });

  //reboot or shutdown on linux & mac
  mainWindow.on('shutdown', (event) => {
    event.preventDefault();
    close();
  });

  mainWindow.on('close', (event) => {
    if (app.isQuiting) {
      setInterval( app.quit, DOUBLE_SHUTDOWN_INTERVAL_DELAY );
      app.quit();
      return;
    }

    event.preventDefault();

    if(!app.isQuiting && !app.isDaemonStopping){

      var isMac = process.platform === 'darwin';
      if (isMac && !globalStore.get('wallet:unlocked-for-staking')) { // skip confirmation
        return close();
      } else if (isMac && !!globalStore.get('wallet:unlocked-for-staking')) { // unlocked for staking
        return dialog.showMessageBox({
          cancelId: -1,
          type: 'question',
          buttons: ['No', 'Yes'],
          title: 'Confirm',
          icon: path.join(__dirname, 'resources/icon.png'),
          message: 'Are you sure you want to close Divi?'
        }, function (response) {
          if (response === 1) { // Exit
            close();
          }
        });
      }

      dialog.showMessageBox({
        cancelId: -1,
        type: 'question',
        buttons: ['Cancel', 'Minimize (Hide app)', 'Exit (Close app)'],
        title: 'Confirm',
        icon: path.join(__dirname, 'resources/icon.png'),
        message: 'How would you like to close Divi?'
      }, function (response) {
        if (response === 2) { // Exit
          close();
        } else if (response === 1 ) { // Minimize
          if (platform === 'linux') {
            mainWindow.minimize();
          } else {
            mainWindow.hide();
          }
        }
      })
      // mainWindow.hide();
    }

    return false;
  });
}

function makeMainMenu() {
  var isMac = process.platform === 'darwin';

  if (!isMac) {
    return;
  }

  var template = [{
    label: "Edit",
    submenu: [
        { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
        { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
        { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" },
        { label: "Quit", accelerator: "CmdOrCtrl+Q", selector: "quit:", click: () => mainWindow.close() }
    ]}
  ];

  electron.Menu.setApplicationMenu(electron.Menu.buildFromTemplate(template));
}

/*
** creates the tray icon and menu FOR LINUX AND WIN only
*/
function makeTray() {
  // Default tray image + icon
  // Determine appropriate icon for platform
  if (platform === 'darwin') {
     trayImage = path.join(__dirname, 'resources/linux/24x24.png');
  }
  else if (platform === 'win32' || platform === 'linux') {
    trayImage = path.join(__dirname, 'resources/icon.png');
  }

  // The tray context menu
  const contextMenu = electron.Menu.buildFromTemplate((options.devtools ? [
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          click() { mainWindow.webContents.reloadIgnoringCache(); }
        },
        {
          label: 'Open Dev Tools',
          click() { mainWindow.openDevTools(); }
        }
      ]
    },
  ]: []).concat([
    {
      label: 'Window',
      submenu: [
        {
          label: 'Close',
          click() {
            mainWindow.hide();
          }
        },
        {
          label: 'Hide',
          click() { mainWindow.hide(); }
        },
        {
          label: 'Show',
          click() { mainWindow.show(); }
        },
        {
          label: 'Maximize',
          click() { mainWindow.maximize(); }
        } /* TODO: stop full screen somehow,
        {
          label: 'Toggle Full Screen',
          click () {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
           }
        }*/
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About ' + app.getName(),
          click() { electron.shell.openExternal('https://www.diviproject.org/#about'); }
        },
        {
          label: 'Visit Divi.io',
          click() { electron.shell.openExternal('https://www.diviproject.org'); }
        },
        {
          label: 'Visit Electron',
          click() { electron.shell.openExternal('https://electron.atom.io'); }
        }
      ]
    },
    {
      label: 'Exit',
      click() {
          mainWindow.hide();
          app.isQuiting = true;
          setInterval( app.quit, DOUBLE_SHUTDOWN_INTERVAL_DELAY );
          app.quit();
      }
    }
  ]));

  // Create the tray icon
  let _tray = new electron.Tray(trayImage);

  // TODO, tray pressed icon for OSX? :)
  // if (platform === "darwin") {
  //   tray.setPressedImage(imageFolder + '/osx/trayHighlight.png');
  // }

  // Set the tray icon
  _tray.setToolTip('Divi ' + app.getVersion());
  _tray.setContextMenu(contextMenu);

  // Always show window when tray icon clicked
  _tray.on('click', function () {
    mainWindow.show();
  });

  return _tray;
}
