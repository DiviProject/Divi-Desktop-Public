const { app } = require('electron');
const electron = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');
const rimraf = require('rimraf');
const os = require('os');

const OLD_EOL = /(?:\r\n|\r|\n)/g;

function getRootOrResourcePath() {
  var dir;
  // running from packaged
  if(__dirname.search('app.asar') > -1) {
    dir = __dirname.substring(0, __dirname.indexOf('app.asar')) + 'app.asar';
    dir = path.join(dir, 'dist/assets/icons/notification.png');
  } else {
    dir = '../../src/assets/icons/notification.png';
  }
  return dir;
}
exports.getRootOrResourcePath = getRootOrResourcePath;

function diviConfFilePath(testnet) {
  if (testnet) {
    return getRoamingTestNetPath("divi.conf");
  }
  return getRoamingDiviPath("divi.conf");
}
exports.diviConfFilePath = diviConfFilePath;

function getWalletDatFilePath(testnet, name) {
  if (testnet) {
    return getRoamingTestNet3Path(name || "wallet.dat");
  }
  return getRoamingDiviPath(name || "wallet.dat");
}
exports.getWalletDatFilePath = getWalletDatFilePath;

function getFolderPath(testnet, folder) {
  if (testnet) {
    return getRoamingTestNet3Path(folder);
  }
  return getRoamingDiviPath(folder);
}
exports.getFolderPath = getFolderPath;

function getRoamingDiviPath(path) {
  switch (process.platform) {
    case 'win32':
      return process.env.APPDATA + "\\DIVI\\" + (path || "");
    case 'darwin':
      return process.env.HOME + "/Library/Application\ Support/DIVI/" + (path || "");
    default:
      return process.env.HOME + "/.divi/" + (path || "");
  }
}
exports.getRoamingDiviPath = getRoamingDiviPath;

function getRoamingDiviDesktopPath(path) {
  switch (process.platform) {
    case 'win32':
      return process.env.APPDATA +"\\Divi\ Desktop\\" + (path || "");
    case 'darwin':
      return process.env.HOME + "/Library/Application\ Support/Divi\ Desktop/" + (path || "");
    default:
      return process.env.HOME + "/.config/divi-desktop/" + (path || "");
  }
}
exports.getRoamingDiviDesktopPath = getRoamingDiviDesktopPath;

function getRoamingTestNetPath(path) {
  switch (process.platform) {
    case 'win32':
      return process.env.APPDATA + "\\DIVITEST\\" + (path || "");
    case 'darwin':
      return process.env.HOME + "/Library/Application\ Support/DIVITEST/" + (path || "");
    default:
      return process.env.HOME + "/.divitest/" + (path || "");
  }
}

function getRoamingTestNet3Path(path) {
  switch (process.platform) {
    case 'win32':
      return process.env.APPDATA + "\\DIVITEST\\testnet3\\" + (path || "");
    case 'darwin':
      return process.env.HOME + "/Library/Application\ Support/DIVITEST/testnet3/" + (path || "");
    default:
      return process.env.HOME + "/.divitest/testnet3/" + (path || "");
  }
}

exports.getRoamingTestNetPath = getRoamingTestNetPath;
exports.getRoamingTestNet3Path = getRoamingTestNet3Path;

function getRoamingPath(path) {
  switch (process.platform) {
    case 'win32':
      return process.env.APPDATA + "\\" + (path || "");
    case 'darwin':
      return process.env.HOME + "/Library/Application\ Support/" + (path || "");
    default:
      return process.env.HOME + "/" + (path || "");
  }
}
exports.getRoamingPath = getRoamingPath;

function appendFile(which, string, testnet, callback){
  let line = string + os.EOL;
  let path = "";
  switch (which) {
    case 'divi':
      path = diviConfFilePath(testnet);
      fs.appendFile(path, line, function (err, response) {
        if(callback) callback(err, response);
      });
      break;
    default :
      throw new error("This file is not supported.");
  }
}
exports.appendFile = appendFile;

function isFileEmpty(path){
  if (isFileEmptySync(path)) {
    return true;
  }
  const stats = fs.statSync(path);
  return (stats.isFile() && stats.size < 1);
}
exports.isFileEmpty = isFileEmpty;

function isFileEmptySync(path){
    if (!path) return false;
    return !fs.existsSync(path);
}
exports.isFileEmptySync = isFileEmptySync;

function removeFolder(testnet, folder, callback) {
  const folderPath = getFolderPath(testnet, folder);

  if (!fs.existsSync(folderPath)) {
    callback(null, 'complete');
    return;
  }

  rimraf(folderPath, {}, (err) => {
    callback(null, 'complete');
  });
}
exports.removeFolder = removeFolder;

function removeFolders(testnet, folders, callback) {
  if (folders.length === 0) {
    callback(null, 'complete');
    return;
  }
  
  const folder = folders.splice(0, 1);
  const folderPath = getFolderPath(testnet, folder);

  if (!fs.existsSync(folderPath)) {
    removeFolders(testnet, folders, callback);
    return;
  }

  rimraf(folderPath, {}, (err) => {
    removeFolders(testnet, folders, callback);
  });
}
exports.removeFolders = removeFolders;

function removeWalletDatFile(testnet, callback) {
  const walletDatPath = getWalletDatFilePath(testnet);

  if (!fs.existsSync(walletDatPath)) {
    callback(null, 'complete');
    return;
  }

  fs.unlink(walletDatPath, (err) => {
    if (err) throw err;
    callback(null, 'complete');
  });
}
exports.removeWalletDatFile = removeWalletDatFile;

function renameWalletDatFile(testnet, newName, callback) {
  const walletDatPath = getWalletDatFilePath(testnet);
  const newWalletDatPath = getWalletDatFilePath(testnet, newName);

  if (!fs.existsSync(walletDatPath)) {
    callback(null, 'complete');
    return;
  }

  fs.rename(walletDatPath, newWalletDatPath, (err) => {
    if (err) return callback(err);
    callback(null, 'complete');
  });
}
exports.renameWalletDatFile = renameWalletDatFile;

function removeDaemon() {
  const dividPath = getRoamingDiviDesktopPath('divid');
  deleteFolderRecursive(dividPath);
}

exports.removeDaemon = removeDaemon;

function removeFileLine(filePath, removeLine, callback) {
  function overwriteOldConf(newtext) {
    newtext = newtext.replace(OLD_EOL, os.EOL);
    fs.writeFile (filePath, newtext, function(err) {
      if (err) throw err;
      callback(null, 'complete');
    });
  }
  function updateText(text){
    let newtext = '';
    text = text.replace(OLD_EOL, os.EOL);
    const lines = text.split(os.EOL);
    let found = false;
    for(let i = 0; i < lines.length; ++i){
      let line = lines[i];
      if(line.includes(removeLine)){
        found = true;
      } else {
        newtext += line + os.EOL;
      }
    }
    if (found) {
      overwriteOldConf(newtext);
    } else {
      callback(null, 'Information not found in ' + filePath);
    }
  }
  function getConfData(){
    fs.readFile(filePath, 'utf-8', (err, data) => {
      if (err) throw err;
      updateText(data);
    });
  }
  getConfData();
}
exports.removeFileLine = removeFileLine;

function isTextInFile(filePath, text, callback) {
  let textInFile = false;
  if (!fs.existsSync(filePath)) {
    return callback(null, textInFile);
  }
  function getConfData(){
    fs.readFile(filePath, 'utf-8', (err, data) => {
      if (err) {
        if (callback) callback(err, textInFile);
        throw err;
      }
      data = data.replace(OLD_EOL, os.EOL);
      const lines = data.split(os.EOL);
      if (data) {
        for(let i = 0; i < lines.length; ++i){
          let line = lines[i];
          if(line && line.length > 0 && line.includes(text)){
            textInFile = true;
          }
        }
        callback(null, textInFile);
      } else {
        callback(null, textInFile);
      }
    });
  }
  getConfData();
}
exports.isTextInFile = isTextInFile;

function deleteFolderRecursive(path) {
  if( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach(function(file, index){
      let sep = "/";
      if (process.platform === 'win32') {
        sep = "\\";
      }
      const curPath = path + sep + file;
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
}
exports.deleteFolderRecursive = deleteFolderRecursive;

function getConfValue(filePath, param, callback, sync) {
  let value = '';
  if(!fs.existsSync(filePath) ) {
    if (callback) return callback(null, value);
  }

  const getValue = (err, data) => {
    if (err) {
      if (callback) callback(err, value);
      throw err;
    }
    data = data.replace(OLD_EOL, os.EOL);
    const lines = data.split(os.EOL);
    if (lines) {
      for(let i = 0; i < lines.length; ++i){
        let line = lines[i];
        if(line && line.length > 0 && line.includes(param)){
          paramValue = line.split('=');
          value = paramValue[1] || '';
        }
      }
      if (callback) callback(null, value);
    } else {
      if (callback) callback(null, value);
    }
    if (sync) return value;
  };
  function getConfData(){
    if (sync) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return getValue(null, data);
    } else {
      fs.readFile(filePath, 'utf-8', (err, data) => {
        data = data.replace(OLD_EOL, os.EOL);
        getValue(err, data);
      });
    }

  }
  return getConfData();
}
exports.getConfValue = getConfValue;

function getSettingValue(setting) {
  return getConfValue(getRoamingDiviDesktopPath('Settings'), setting, undefined, true);
}

exports.getSettingValue = getSettingValue;

function setConfValue(filePath, param, value, callback, commentOut) {
  function overwriteOldConf(newtext) {
    newtext = newtext.replace(OLD_EOL, os.EOL);
    fs.writeFile (filePath, newtext, function(err) {
      if (err) throw err;
      if (callback) callback(null, 'complete');
    });
  }
  function writeNewConf(newtext) {
    newtext = newtext.replace(OLD_EOL, os.EOL);
    fs.appendFile(filePath, newtext, function(err) {
      if (err) throw err;
      if (callback) callback(null, 'complete');
    });
  }
  function updateText(text){
    let newtext = '';
    text = text.replace(OLD_EOL, os.EOL);
    const lines = text.split(os.EOL);
    let found = false;
    let foundParam = false;
    for(let i = 0; i < lines.length; ++i) {
      let line = lines[i];
      if (line.includes(param)) {
        foundParam = true;
      }
      if(line.includes(param) && !line.includes(value) && line[0] !== '#'){
        found = true;
        paramValue = line.split('=');
        paramValue[1] = value;
        if (commentOut) newtext += '# ';
        newtext += paramValue[0] + '=' + paramValue[1] + os.EOL;
      } else {
        newtext += line + os.EOL;
      }
    }
    newtext = newtext.replace(OLD_EOL, os.EOL);
    if (found) {
      overwriteOldConf(newtext);
    } else if (foundParam) {
      if (callback) callback(null, 'Information not found in ' + filePath);
    } else {
      newtext += param + '=' + value + os.EOL;
      overwriteOldConf(newtext);
    }
  }
  function getConfData(){
    if (exports.isFileEmptySync(filePath)) {
      writeNewConf(param + '=' + value + os.EOL);
    } else {
      fs.readFile(filePath, 'utf-8', (err, data) => {
        if (err) throw err;
        data = data.replace(OLD_EOL, os.EOL);
        updateText(data);
      });
    }
  }
  getConfData();
}
exports.setConfValue = setConfValue;

function createMissingFolder(dir) {
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
  }
}
exports.createMissingFolder = createMissingFolder;

function createMissingFile(filePath) {
  //If you want to force the file to be empty then you want to use the 'w' flag:
  if(!fs.existsSync(filePath) ) {
    const fd = fs.openSync(filePath, 'w');
    //That will truncate the file if it exists and create it if it doesn't.
    //Wrap it in an fs.closeSync call if you don't need the file descriptor it returns.
    fs.closeSync(fs.openSync(filePath, 'w'));
  }
}
exports.createMissingFile = createMissingFile;

