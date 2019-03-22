const log     = require('electron-log');
const options = require('./options.js').get();

exports.init = function () {

  log.transports.console.level = 'info';
  log.transports.file.level    = 'debug';

  log.transports.file.appName = process.platform == 'linux'
    ? 'divi-desktop'
    : 'Divi Desktop';
  let logPath = options.testnet
    ? 'testnet/divi-desktop.log'
    : 'divi-desktop.log';
  log.transports.file.file = log.transports.file
    .findLogPath(log.transports.file.appName)
    .replace('log.log', logPath);

  switch (options.verbose) {
    case 1:
      log.transports.console.level = 'debug';
      break ;
    case 2:
      log.transports.console.level = 'debug';
      process.argv.push('-printtoconsole');
      break ;
    case 3:
      log.transports.console.level = 'silly';
      process.argv.push('-debug');
      process.argv.push('-printtoconsole');
      break ;
  }

  log.daemon = log.info;

  return log;
}
