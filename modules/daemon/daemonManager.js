const { app, dialog } = require('electron');
const EventEmitter    = require('events').EventEmitter;

const _    = require('lodash');
const Q    = require('bluebird');
const fs   = require('fs');
const got  = require('got');
const path = require('path');
const log  = require('electron-log');
const _util= require('../util/util');

const ClientBinariesManager = require('../clientBinaries/clientBinariesManager').Manager;
let options;

const daemonObjectName = 'divid';

const BINARY_URL = 'https://divi-blockchain.ams3.digitaloceanspaces.com/releases/1.0.4/clientBinaries.json';

//const ALLOWED_DOWNLOAD_URLS_REGEX = new RegExp('*', 'i');

class DaemonManager extends EventEmitter {
  constructor() {
    super();
    this._availableClients = {};
  }

  getPath() {
    return this._availableClients[daemonObjectName].binPath;
  }

  init(_options) {
    options = _options;
    // TODO: reactivate when prompt user in GUI works
    // check every hour
    // setInterval(() => this._checkForNewConfig(true), 1000 * 60 * 60);
    this._resolveBinPath();
    return this._checkForNewConfig();
  }

  getClient(clientId) {
    return this._availableClients[clientId.toLowerCase()];
  }

  _writeLocalConfig(json) {
    fs.writeFileSync(
      path.join(app.getPath('userData'), 'clientBinaries.json'),
      JSON.stringify(json, null, 2)
    );
  }

  _checkForNewConfig() {
    const nodeType = daemonObjectName;
    let binariesDownloaded = false;
    let nodeInfo;

    this._emit('loadConfig', 'Fetching remote client config');

    // fetch config
    return got(BINARY_URL, {
      timeout: 5000,
      json: true
    })
    .then((res) => {
      return res.body;
    })
    .catch((err) => {
      log.warn('Error fetching client binaries config from repo', err);
      this._emit('error', err.message);
    })
    .then((latestConfig) => {
      // scan for node
      const mgr = new ClientBinariesManager(latestConfig);
      mgr.logger = log;

      this._emit('scanning', 'Scanning for binaries');

      return mgr.init({
        folders: [ path.join(app.getPath('userData'), daemonObjectName, 'unpacked') ]
      })
      .then(() => {
        const clients = mgr.clients;

        this._availableClients = {};

        const available = _.filter(clients, c => !!c.state.available);

        if (!available.length) {
          if (_.isEmpty(clients)) {
            throw new Error('No client binaries available for this system!');
          }

          this._emit('downloading', 'Downloading binaries');

          return Q.map(_.values(clients), (c) => {
            binariesDownloaded = true;

            return mgr.download(c.id, {
              downloadFolder: path.join(app.getPath('userData'))
              //urlRegex: ALLOWED_DOWNLOAD_URLS_REGEX,
            });
          });
        }
      })
      .then(() => {

        this._emit('filtering', 'Filtering available clients');

        _.each(mgr.clients, (client) => {
          if (client.state.available) {
            const idlcase = client.id.toLowerCase();

            this._availableClients[idlcase] = {
              binPath: client.activeCli.fullPath,
              version: client.version
            };
          }
        });

        this._emit('done');

        // return this.startDaemon();
      });
    })
    .catch((err) => {
      log.error(err);

      this._emit('error', err.message);

      // show error
      if (err.message.indexOf('Hash mismatch') !== -1) {
        // show hash mismatch error
        dialog.showMessageBox({
          type: 'warning',
          buttons: ['OK'],
          message: 'Checksum mismatch in downloaded node!',
          detail: `${nodeInfo.algorithm}:${nodeInfo.checksum}\n\nPlease install the ${nodeInfo.type} node version ${nodeInfo.version} manually.`
        }, () => {
          app.quit();
        });

        // throw so the main.js can catch it
        throw err;
      }
    });
  }

    // TODO: emit to GUI

  _emit(status, msg) {
    log.debug(`Status: ${status} - ${msg}`);
    this.emit('status', status, msg);
  }


  _resolveBinPath() {
    log.debug('Resolving path to client binary ...');

    let platform = process.platform;

    // "win32" -> "win" (because nodes are bundled by electron-builder)
    if (platform.indexOf('win') === 0) {
      platform = 'win';
    } else if (platform.indexOf('darwin') === 0) {
      platform = 'mac';
    }

    log.debug(`Platform: ${platform}`);

    let binPath = path.join(app.getPath('userData'), daemonObjectName, 'unpacked', daemonObjectName);

    if (platform === 'win') {
      binPath += '.exe';
    }

    log.debug(`Client binary path: ${binPath}`);

    this._availableClients[daemonObjectName] = {
      binPath
    };
  }
}

module.exports = new DaemonManager();
