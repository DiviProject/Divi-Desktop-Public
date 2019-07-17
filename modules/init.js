const electron      = require('electron');
const log           = require('electron-log');

const ipc           = require('./ipc/ipc');
const rpc           = require('./rpc/rpc');
const zmq           = require('./zmq/zmq');
const primer        = require('./primer/primer');

const daemon        = require('./daemon/daemon');
const daemonManager = require('./daemon/daemonManager');
const multiwallet   = require('./multiwallet');
const notification  = require('./notification/notification');

let attemptsCount = 10;

exports.start = function (mainWindow) {

  // Initialize IPC listeners
  rpc.init();
  notification.init();

  /* Initialize ZMQ */
  zmq.init(mainWindow);
  // zmq.test(); // loop, will send tests
  primer.init(mainWindow);

  exports.startDaemonManager();
}

exports.startDaemonManager = function() {
  daemon.check()
    .then(()            => {})
    .catch(()           => daemonManager.init())
    .catch((error)      => log.error(error));
}

/*
  Start daemon when we get the GO sign from daemonManager.
  Listen for daemonManager errors too..

  Only happens _after_ daemonManager.init()
*/
daemonManager.on('status', (status, msg) => {

  // Done -> means we have a binary!
  if (status === 'done') {
    log.debug('daemonManager returned successfully, starting daemon!');
    multiwallet.get()
    .then(chosenWallets => daemon.start([], chosenWallets))
    .catch(err          => log.error(err));
  } else if (status === 'error' && attemptsCount > 0) {
    attemptsCount--;
    exports.startDaemonManager();
  } else if (status === 'error' && attemptsCount <= 0) {
    log.debug('daemonManager errored: ' + msg);

    if (msg === 'Request timed out') {
      log.error('Unable to fetch the latest clients.');

      // alert that we weren't able to update.
      electron.dialog.showMessageBox({
        type: 'warning',
        buttons: ['Stop', 'Retry'],
        message: 'Unable to check for updates, please check your connection. Do you want to retry?'
      }, (response) => {
        if (response === 0) {
          electron.app.quit();
        } else if(response === 1) {
          attemptsCount = 10;
          exports.startDaemonManager();
        }
      });
    } else {
      electron.app.quit();
    }
  }
});

electron.app.on('before-quit', function beforeQuit(event) {
  event.preventDefault();
  electron.app.removeListener('before-quit', beforeQuit);

  // destroy IPC listeners
  rpc.destroy();
  notification.destroy();

  daemon.stop().then(() => {});
});

electron.app.on('quit', (event, exitCode) => {
  log.debug('doedoe');
});

exports.stop = function() {
  return daemon.stop(true);
}