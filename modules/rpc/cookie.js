const fs   = require('fs');
const os   = require('os');
const path = require('path');
const log  = require('electron-log');
const util = require('../util/util');
const userSettings  = require('../user/settings');

/*
** returns Divi config folder
*/
function findCookiePath() {

  var homeDir = os.homedir ? os.homedir() : process.env['HOME'];

  var dir,
      appName = 'Divi';
  switch (process.platform) {
    case 'linux': {
      dir = prepareDir(homeDir, '.' + appName.toLowerCase()).result;
      break;
    }

    case 'darwin': {
      dir = prepareDir(homeDir, 'Library', 'Application Support', appName).result;
      break;
    }

    case 'win32': {
      dir = prepareDir(process.env['APPDATA'], appName)
           .or(homeDir, 'AppData', 'Roaming', appName).result;
      break;
    }
  }

  if (dir) {
    return dir;
  } else {
    return false;
  }
}

/*
** directory resolver
*/
function prepareDir(dirPath) {
  // jshint -W040
  if (!this || this.or !== prepareDir || !this.result) {
    // if dirPath couldn't be resolved
    if (!dirPath) {
      // return this function to be chained with .or()
      return { or: prepareDir };
    }

    //noinspection JSCheckFunctionSignatures
    dirPath = path.join.apply(path, arguments);
    mkDir(dirPath);

    try {
      fs.accessSync(dirPath, fs.W_OK);
    } catch (e) {
      // return this function to be chained with .or()
      return { or: prepareDir };
    }
  }

  return {
    or: prepareDir,
    result: (this ? this.result : false) || dirPath
  };
}

/*
** create a directory
*/
function mkDir(dirPath, root) {
  var dirs = dirPath.split(path.sep);
  var dir = dirs.shift();
  root = (root || '') + dir + path.sep;

  try {
    fs.mkdirSync(root);
  } catch (e) {
    if (!fs.statSync(root).isDirectory()) {
      throw new Error(e);
    }
  }

  return !dirs.length || mkDir(dirs.join(path.sep), root);
}

getUsername = (testnet) => {
  return new Promise((resolve, reject) => {
    util.getConfValue(util.diviConfFilePath(testnet), 'rpcuser', (err, value) => {
      if (value === 'RandomName') {
        util.setConfValue(util.diviConfFilePath(testnet), 'rpcuser', 'TempName', (err, value) => {
          resolve('TempName')
        });
      } else {
        resolve(value)
      }
    });
  });
};

getPassword = (testnet) => {
  return new Promise((resolve, reject) => {
    util.getConfValue(util.diviConfFilePath(testnet), 'rpcpassword', (err, value) => {
      if (value === 'SuperSecretRandomPasswordChangeOrBePwned') {
        let newPass = 'TempSuperPass' + Date.now();
        util.setConfValue(util.diviConfFilePath(testnet), 'rpcpassword', newPass, (err, value) => {
          resolve(newPass);
        });
      } else {
        resolve(value);
      }
    });
  });
};

/*
** returns the current RPC cookie
** RPC cookie is regenerated at every divid startup
*/
function getAuth(options, testnet) {
  return getUsername(testnet)
    .then(username => getPassword(testnet)
      .then(password => username + ':' + password));
}

exports.getAuth = getAuth;
