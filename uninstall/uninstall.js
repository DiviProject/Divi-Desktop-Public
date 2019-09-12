const fs = require('fs');

console.log('Removing Divi files');

const appPath = process.cwd().replace('uninstall', '');

console.log(appPath);
console.log('Uninstall process started');

if (appPath.toLowerCase().indexOf('divi') <= 0) {
  console.log('Not Divi directory. Exiting');
  return;
}

setTimeout(() => {
  removeBinaries(appPath);
  removeUserData();
  removeDiviDesktop();
}, 10000);

function removeBinaries(appPath) {
  console.log('Removing app folder');

  removeFolder(appPath);
}

function removeDiviDesktop() {
  const diviDesktopPath = getRoamingDiviDesktopPath();

  removeFolder(diviDesktopPath);
}

function removeUserData() {
  const livePath = getRoamingDiviPath();
  const testnetPath = getRoamingTestNetPath();

  console.log('Removing user data');

  removeFolder(livePath);
  removeFolder(testnetPath);
}

function removeFolder(path) {
  if(fs.existsSync(path)) {
    fs.readdirSync(path).forEach((file) => {
      let curPath = path + '/' + file;
console.log(curPath);
      if(fs.lstatSync(curPath).isDirectory()) {
        removeFolder(curPath);
      } else {
        try {
          if (curPath.indexOf('uninstall') <= 0) {
            console.log(`Removing file: ${curPath}`);
            fs.unlinkSync(curPath);
          }
        } catch (e) {
          console.log(e);
        }
      }
    });
    try {
      if (path.indexOf('uninstall') <= 0) {
        console.log(`Removing directory: ${path}`);
        fs.rmdirSync(path);
      }
    } catch (e) {
      console.log(e);
    }
  }
}

function getRoamingDiviPath() {
  switch (process.platform) {
    case 'win32':
      return process.env.APPDATA + "\\DIVI\\";
    case 'darwin':
      return process.env.HOME + "/Library/Application\ Support/DIVI/";
    default:
      return process.env.HOME + "/.divi/";
  }
}

function getRoamingDiviDesktopPath() {
  switch (process.platform) {
    case 'win32':
      return process.env.APPDATA +"\\Divi\ Desktop\\";
    case 'darwin':
      return process.env.HOME + "/Library/Application\ Support/Divi\ Desktop/";
    default:
      return process.env.HOME + "/.config/divi-desktop/";
  }
}

function getRoamingTestNetPath() {
  switch (process.platform) {
    case 'win32':
      return process.env.APPDATA + "\\DIVITEST\\";
    case 'darwin':
      return process.env.HOME + "/Library/Application\ Support/DIVITEST/";
    default:
      return process.env.HOME + "/.divitest/";
  }
}