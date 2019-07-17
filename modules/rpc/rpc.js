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
const PrimerManager = require('../primer/primer').Manager;


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
  const primerManager = new PrimerManager(TESTNET);

  // Make sure that rpc-channel has no active listeners.
  // Better safe than sorry.
  destroyIpcListener();

  // Register new listener
  log.info('registration')
  rxIpc.registerListener('rpc-channel', (method, params) => {
    const args = params || [];

    return Observable.create(observer => {
      const onSuccess = (result) => {
        observer.next(result || undefined);
        observer.complete();
      };

      const onError = (err) => {
        log.error(err);
        observer.error(err);
      }

      const handle = (err, result) => {
        try {
          if (!err) {
            return onSuccess(result);
          }
  
          onError(err);
        } catch (internalErr) {
          if (internalErr.message == 'Object has been destroyed') {
            // suppress error
          } else {
            log.error(internalErr);
          }
        }
      }

      switch (method) {
        case 'restart-daemon':
          return daemon.restart(args).then(onSuccess, onError);
        case 'stop-daemon':
          return daemon.stop(args[0], args[1]).then(onSuccess, onError);
        case 'restart-app':
          app.relaunch();
          app.exit();
          return onSuccess();
        // primer
        case 'prepare-primer-backup':
          primerManager.prepare();
          return onSuccess();
        case 'apply-primer-backup':
          primerManager.apply();
          return onSuccess();
        case 'abandon-primer':
          primerManager.abandon();
          return onSuccess();
        // primer
        case 'clear-cache':
          return _util.removeFolders(TESTNET, ['blocks', 'chainstate', 'sporks', 'zerocoin'], handle);
        case 'update-setting':
          return userSettings.set(params[0], params[1]).then(onSuccess, onError);
        case 'append-file':
          return _util.appendFile(params[0], params[1], TESTNET, handle);
        case 'cleanup-for-resore':
          return _util.renameWalletDatFile(TESTNET, `wallet_${new Date().getTime()}.dat`, handle);
        case 'remove-blocks':
          return _util.removeFolder(TESTNET, 'blocks', handle);
        case 'remove-chainstate':
          return _util.removeFolder(TESTNET, 'chainstate', handle);
        case 'remove-daemon':
          _util.removeDaemon();
          return onSuccess();
        case 'settings':
          return userSettings.handle(params[0], params[1], params[2]).then(onSuccess, onError);
        case 'external-link':
          shell.openExternal(params[0]);
          return onSuccess();
        // auto-updater
        case 'check-update':
          autoUpdater.checkForUpdates();
          return onSuccess();
        case 'download-update':
          autoUpdater.downloadUpdate();
          return onSuccess();
        case 'install-update':
          autoUpdater.quitAndInstall();  
          return onSuccess();
        // rpc call's
        default: 
          return exports.call(method, params, handle);
      }
    });
  });
}

function destroyIpcListener() {
  rxIpc.removeListeners('rpc-channel');
}
