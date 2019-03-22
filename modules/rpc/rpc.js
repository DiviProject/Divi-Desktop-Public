const log         = require('electron-log');
const http        = require('http');
const rxIpc       = require('rx-ipc-electron/lib/main').default;
const Observable  = require('rxjs/Observable').Observable;
const { app, dialog, shell } = require('electron');

const cookie      = require('./cookie');
const _options    = require('../options');
const _util       = require('../util/util');
const daemon      = require('../daemon/daemon');
const userSettings= require('../user/settings');
const {autoUpdater} = require("electron-updater");


/* spyOnRpc will output all RPC calls being made */
const spyOnRpc = false;

let HOSTNAME;
const MAIN_PORT = 51473;
const TESTNET_PORT = 51475;
let PORT;
let TIMEOUT = 30000;
let auth;
let TESTNET = false;

exports.init = function(callback) {
  const testnet =  _util.getSettingValue('net') === 'test';
  const options = _options.get();
  HOSTNAME = options.rpcbind || 'localhost';
  TESTNET = testnet;
  PORT    = TESTNET ? TESTNET_PORT : MAIN_PORT;
  cookie.getAuth(_options.get(), testnet).then(_auth => {
    auth     = _auth;
    initIpcListener();

    if (callback) {
      callback();
    }
  });
}

exports.destroy = function() {
  destroyIpcListener();
}

/*
** execute a single RPC call
*/
exports.call = function(method, params, callback) {
  if (!auth) {
    return exports.init(() => {
      exports.call(method, params, callback);
    });
  }

  if (!callback) {
    callback = function (){};
  }

  const timeout = [ 'extkeyimportmaster', 'extkeygenesisimport'].includes(method) ? 240 * 1000 : TIMEOUT; // TODO: replace
  const postData = JSON.stringify({
    method: method,
    params: params
  });

  const rpcOptions = {
    hostname: HOSTNAME,
    port:     PORT,
    path:     '/',
    method:   'POST',
    headers:  { 'Content-Type': 'application/json' }
  };

  rpcOptions.auth = rpcOptions.auth || auth;
  rpcOptions.headers['Content-Length'] = postData.length;

  const request = http.request(rpcOptions, response => {
    let data = '';
    response.setEncoding('utf8');
    response.on('data', chunk => data += chunk);
    response.on('end', () => {
      // TODO: more appropriate error handling
      if (response.statusCode === 401) {
        callback({
          status: 401,
          message: 'Unauthorized'
        });
        return ;
      }
      if (response.statusCode === 503) {
        callback({
          status: 503,
          message: 'Service Unavailable',
        });
        return ;
      }

      try {
        data = JSON.parse(data);
      } catch(e) {
        log.error('ERROR: should not happen', e, data);
        callback(e);
      }

      if (data.error !== null) {
        callback(data);
        return ;
      }

      callback(null, data);
    });
  });

  request.on('error', error => {
    switch (error.code) {
      case 'ECONNRESET':
        callback({
          status: 0,
          message: 'Timeout'
        });
        break;
      case 'ECONNREFUSED':
        callback({
          status: 502,
          message: 'Daemon not connected, retrying connection',
          _error: error
        });
        break;
      default:
        callback(error);
    }
  });

  request.setTimeout(timeout, error => {
    return request.abort();
  });

  request.write(postData);
  request.end();
}

exports.getTimeoutDelay = () => { return TIMEOUT }
exports.setTimeoutDelay = function(timeout) { TIMEOUT = timeout }


/*
 * All IPC-related stuff, below here.
*/

function initIpcListener() {

  // Make sure that rpc-channel has no active listeners.
  // Better safe than sorry.
  destroyIpcListener();

  // Register new listener
  rxIpc.registerListener('rpc-channel', (method, params) => {
    const args = params || [];

    return Observable.create(observer => {
      if (['restart-daemon'].includes(method)) {
        daemon.restart(args).then(() => observer.next(true));
      } else if (['stop-daemon'].includes(method)) {
        daemon.stop(args[0], args[1]).then(() => {
          observer.next();
          observer.complete();
        });
      } else if (['restart-app'].includes(method)) {
        app.relaunch();
        app.exit();
      } else if (['clear-cache'].includes(method)) {
        _util.removeFolders(TESTNET, ['blocks', 'chainstate', 'sporks', 'zerocoin'], (error, response) => {
          if (error) {
            log.error(error);
            observer.error(error);
          } else {
            observer.next(response || undefined);
            observer.complete();
          }
        });
      } else if (['update-setting'].includes(method)) {
        const setting = params[0];
        const value = params[1];
        userSettings.set(setting, value).then(() => {
          observer.next();
          observer.complete();
        });
      } else if (['append-file'].includes(method)) {
        const file = params[0];
        const line = params[1];
        _util.appendFile(file, line, TESTNET, (error, response) => {
          if (error) {
            log.error(error);
            observer.error(error);
          } else {
            observer.next(response || undefined);
            observer.complete();
          }
        });
      } else if (['cleanup-for-resore'].includes(method)) {
        const walletName = `wallet_${new Date().getTime()}.dat`;
        _util.renameWalletDatFile(TESTNET, walletName, (err) => {
          if (err) return observer.error(err);
          observer.next();
          observer.complete();
        });
      } else if (['remove-blocks'].includes(method)) {
        _util.removeFolder(TESTNET, 'blocks', (error, response) => {
          if (error) {
            log.error(error);
            observer.error(error);
          } else {
            observer.next(response || undefined);
            observer.complete();
          }
        });
      } else if (['remove-chainstate'].includes(method)) {
        _util.removeFolder(TESTNET, 'chainstate', (error, response) => {
          if (error) {
            log.error(error);
            observer.error(error);
          } else {
            observer.next(response || undefined);
            observer.complete();
          }
        });
      } else if (['remove-daemon'].includes(method)) {
        _util.removeDaemon();
        observer.next();
        observer.complete();
      } else if (['settings'].includes(method)) {
        const _method = params[0];
        const setting = params[1];
        const value = params[2];
        userSettings.handle(_method, setting, value).then((response) => {
          observer.next(response || undefined);
          observer.complete();
        }).then(error => {
            log.error(error);
            observer.error(error);
        });
      } else if (['check-update'].includes(method)) {
        autoUpdater.checkForUpdates();
      } else if (['external-link'].includes(method)) {
        shell.openExternal(params[0]);
      } else if (['download-update'].includes(method)) {
        autoUpdater.downloadUpdate();  
      } else if (['install-update'].includes(method)) {
        autoUpdater.quitAndInstall();  
      } else {
        exports.call(method, params, (error, response) => {
          try {
            if(error) {
              log.error(error);
              observer.error(error);
            } else {
              observer.next(response || undefined);
              observer.complete();
            }
          } catch (err) {
            if (err.message == 'Object has been destroyed') {
              // suppress error
            } else {
              log.error(err);
            }
          }
        });
      }
    });
  });
}

function destroyIpcListener() {
  rxIpc.removeListeners('rpc-channel');
}
