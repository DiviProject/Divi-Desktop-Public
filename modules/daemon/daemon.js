const electron = require('electron');
const log      = require('electron-log');
const spawn    = require('child_process').spawn;
const rxIpc    = require('rx-ipc-electron/lib/main').default;

const _options      = require('../options');
const rpc           = require('../rpc/rpc');
const cookie        = require('../rpc/cookie');
const daemonManager = require('../daemon/daemonManager');
const multiwallet   = require('../multiwallet');
const util          = require('../util/util');
const manageRoaming = require('../manageRoaming/init');
const readline      = require('readline');
const userSettings  = require('../user/settings');


let daemon = undefined;
let chosenWallets = [];

const defaultArgs = ["-maxconnections=1000", "-spendzeroconfchange"];

function daemonData(data, logger) {
  data = data.toString().trim();
  logger(data);
}

exports.restart = function (args) {
  return (new Promise((resolve, reject) => { 
    exports.stop(true).then(() => {
        exports.start(args, chosenWallets)
          .then(() => {
            resolve();
          })
          .catch(error => {
            reject();
            log.error(error);
          });
    });
  }));
}

function getNetArgs(testnet) {
  let netArg = [];
  
  if (testnet) {
    netArg.push('-testnet');
    netArg.push('-daemon');
    netArg.push('-datadir=' + util.getRoamingTestNetPath());
  }

  return netArg;
}

function tryFewTimes(func, attempts, interval) {
  return new Promise((resolve, reject) => {
    const invoke = (attemptsLeft) => {
      func().then(() => {
        resolve();
      })
      .catch((err) => {
        if (attemptsLeft <= 0 && attempts !== -1) {
          reject(err);
          return;
        }
  
        setTimeout(() => invoke(--attemptsLeft), interval);
      });
    };
    invoke(attempts);
  });
}

exports.start = function (args = [], wallets) {
  return (new Promise((resolve, reject) => {
    userSettings.get('net').then(net => {
      const testnet = net === "test";

      manageRoaming.initFolders(testnet);
      let path = util.diviConfFilePath(testnet);
      if (util.isFileEmpty(path)) {
        return manageRoaming.initDiviConf(testnet).then(() => {
          exports.start(args, wallets).then(resolve).catch(reject);
        });
      }

      chosenWallets    = wallets || chosenWallets;

      rpc.init();

      exports.check().then(() => {
        resolve(undefined);
      }).catch(() => {
        let options      = _options.get();
        const daemonPath = options.customdaemon
                         ? options.customdaemon
                         : daemonManager.getPath();
  
        const netArg = getNetArgs(testnet);

        wallets = wallets.map(wallet => `-wallet=${wallet}`);

        daemon = undefined;

        const child = spawn(daemonPath, [...process.argv,  ...netArg, ...wallets, ...defaultArgs, ...args])
          .on('close', code => {
            if (code !== 0) {
              reject();
            }
          });

        // TODO change for logging
        child.stdout.on('data', data => daemonData(data, console.log));
        child.stderr.on('data', data => daemonData(data, console.log));

        daemon = child;

        tryFewTimes(() => exports.check(), -1, 1000).then(resolve, reject);
      });
    });
  }));
}

exports.check = function() {
  return new Promise((resolve, reject) => {
    const _timeout = rpc.getTimeoutDelay();
    rpc.call('getnetworkinfo', null, (error, response) => {
      if (error) {
        reject(error);
      } else if (response) {
        resolve(response);
      }
    });
    rpc.setTimeoutDelay(_timeout);
  });
}

function stopDaemon() {
  return new Promise((resolve, reject) => {
    rpc.call('stop', null, (error, response) => {
      if (error && error.status === 502) {
        resolve(response);
      } else {
        reject(error);
      }
    });
  });
}

exports.stop = function(restarting, attempts) {
  return new Promise((resolve, reject) => {
    const success = () => {
      if (!restarting) {
        resolve();
        electron.app.quit();
      } else if (restarting) {
        resolve();
      }
    };

    const unsuccess = (err) => {
      log.error('Stop Daemon ERROR: ', err);
      log.error('Calling SIGINT!');

      if (!!daemon) {
        daemon.kill('SIGINT');
      }
      resolve();
    }

    if (!!daemon) {
      tryFewTimes(() => stopDaemon(), attempts || 180, 1000)
        .then(() => success(), (err) => unsuccess(err));
    } else {
      success();
    }
  });
}
