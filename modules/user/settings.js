const util = require('../util/util');

exports.get = (setting) => {
  const path = util.getRoamingDiviDesktopPath('Settings');
  return new Promise((resolve, reject) => {
    if (!util.isFileEmptySync(path)) {
      util.getConfValue(path, setting, (error, setting) => resolve(setting));
    } else {
      exports.set('initialized', 'false').then(res => resolve(''))
    }
  });
};

exports.set = (setting, value) => {
  const path = util.getRoamingDiviDesktopPath('Settings');
  return new Promise((resolve, reject) => {
    util.setConfValue(path, setting, value, () => resolve());
  });
};

exports.handle = (method, setting, value) => {
  switch (method) {
    case 'get':
      return exports.get(setting);
    case 'set':
      return exports.set(setting, value);
    default:
      return Promise.reject('unsupported method');
  }
};
