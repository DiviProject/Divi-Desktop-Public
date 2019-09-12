"use strict";

const fs = require('fs');
const utils = require('../util/util');
const path = require('path');
const mkdirp = require('mkdirp');
const got = require('got');
const unzip = require('unzip-stream');
const rimraf = require("rimraf");
const fse = require('fs-extra');
const log = require('electron-log');

const MAINNET_PRIMER_BACKUP_URL = "https://divi-primer.nyc3.digitaloceanspaces.com/primer.zip";
const TESTENT_PRIMER_BACKUP_URL = "https://divi-primer.nyc3.digitaloceanspaces.com/testnet/primer.zip";

const MAINNET_PRIMER_BACKUP_NAME = "primer";
const TESTENT_PRIMER_BACKUP_NAME = "primer-testnet";

let downloadRequest;
let isAbandoned;

function _download(url, destination) {
    isAbandoned = false;
    const promise = new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(destination);
        const stream = got.stream(url);

        stream.pipe(fileStream);
        stream.on('error', (err) => reject(err));
        stream.on('request', (req) => {
            downloadRequest = req;
        });
        stream.on('downloadProgress', (progress) => sendEvent('download-progress', progress));
        stream.on('end', () => {
            try {
                fs.accessSync(destination, fs.F_OK | fs.R_OK);
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    });

    return promise;
}

function _abandonDownload() {
    if (downloadRequest) {
        isAbandoned = true;
        downloadRequest.abort();
    }
}

function _extract(path, destination) {
    const promise = new Promise((resolve, reject) => {
        var unzipExtractor = unzip.Extract({ path: destination });
        unzipExtractor.on('error', reject);
        unzipExtractor.on('close', resolve);
        fs.createReadStream(path)
            .pipe(unzipExtractor)
            .on('error', reject);
    });

    return promise;
}

function _copyAndReplace(source, destination) {
    const promise = new Promise((resolve, reject) => {
        fse.copy(source, destination, {
            overwrite: true
        }, function (error) {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });

    return promise;
}

function _remove(path, options) {
    const promise = new Promise((resolve, reject) => {
        rimraf(path, options || {}, (err) => {
            if (err) {
              log.error(err);
            }

            return resolve();
        });
    });

    return promise;
}

let mainWindowRef = null;

exports.init = function(mainWindow) {
  mainWindowRef = mainWindow;
  isAbandoned = false;
};

function sendEvent(eventType, eventData) {
    if (!mainWindowRef || (!!isAbandoned && eventType !== 'abandon' && eventType !== 'retry')) {
        return;
    }
    mainWindowRef.webContents.send('primer', eventType, eventData);
}

async function wrapper(action) {
    try {
        await action();
    } catch (e) {
        if (!isAbandoned) {
            sendEvent('error', e);
            log.error(e);
            throw e;
        }
    }
}

class PrimerManager {
    constructor(isTestnet) {
        this.url = isTestnet ? TESTENT_PRIMER_BACKUP_URL : MAINNET_PRIMER_BACKUP_URL;
        this.pkgName = isTestnet ? TESTENT_PRIMER_BACKUP_NAME : MAINNET_PRIMER_BACKUP_NAME;
        this.corePath = isTestnet ? utils.getRoamingTestNet3Path() : utils.getRoamingDiviPath();
        this.tempPath = require('temp-dir');
        this.tempZipPath = path.join(this.tempPath, `${this.pkgName}.zip`);
        this.tempUnzipPath = path.join(this.tempPath, `${this.pkgName}-unzip`);
    }

    async clean() {
      await wrapper(async () => {
          await _remove(this.tempZipPath);
          await _remove(this.tempUnzipPath);
        });
    }

    async prepare() {
        isAbandoned = false;
        await wrapper(async () => {
            sendEvent('start-download', null);
            await this.clean();
            mkdirp.sync(this.tempPath);
            mkdirp.sync(this.tempUnzipPath);
            await _download(this.url, this.tempZipPath);
            sendEvent('backup-downloaded', this.tempZipPath);
            sendEvent('extracting-archive', null);
            await _extract(this.tempZipPath, this.tempUnzipPath);
            sendEvent('archive-extracted', this.tempUnzipPath);
        });
    }

    async cleanOldFiles() {
        const oldFiles = [
            '.lock',
            'db.log',
            'fee_estimates.dat',
            'mnpayments.dat',
            'netfulfilled.dat',
            'mncache.dat',
            'peers.dat'
        ];
        const oldDirectories = [
            'database',
            'sporks',
            'blocks',
            'chainstate',
            'zerocoin'
        ];

        for (var i = 0; i < oldDirectories.length; i++) {
            await _remove(path.join(this.corePath, oldDirectories[i], '**', '*'));
        }

        for (var i = 0; i < oldFiles.length; i++) {
            await _remove(path.join(this.corePath, oldFiles[i]));
        }
    }

    async apply() {
        await wrapper(async () => {
            sendEvent('restoring-from-backup', null);
            await this.cleanOldFiles();
            await _copyAndReplace(this.tempUnzipPath, this.corePath);
            sendEvent('cleaning-tmp-data', null);
            await this.clean();
            sendEvent('restored-from-backup', null);
        });
    }

    async abandon() {
        _abandonDownload();
        sendEvent('abandon', null);
    }

    retry() {
        _abandonDownload();
        sendEvent('retry', null);
    }
}

exports.Manager = PrimerManager;
