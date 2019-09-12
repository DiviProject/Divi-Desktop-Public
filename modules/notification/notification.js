const rxIpc        = require('rx-ipc-electron/lib/main').default;
const Observable   = require('rxjs/Observable').Observable;
const util = require('../util/util');
const notifier = require('node-notifier');
const player = require('node-wav-player');

function createNotification(title, message, icon, sound) {
  notifier.notify({
      title: title,
      message: message,
      icon: icon,
      sound: sound ? false : true,
      wait: true
  });

  if (sound) {
    playSound(sound);
  }
}

function playSound(soundFileName) {
  const fullSoundPath = util.getSoundPath(soundFileName);

  player.play({
    path: fullSoundPath
  }).then(() => {
    console.log(`playing wav ${fullSoundPath}`);
  }).catch((error) => {
    console.error(error);
  });
}

exports.init = function() {
  rxIpc.registerListener('notification',
    (title, desc, sound) => {
      const icon = util.getRootOrResourcePath();

      createNotification(title, desc, icon, sound);
      return Observable.create(observer => observer.complete(true));
    });
};

exports.destroy = function() {
  rxIpc.removeListeners('notification');
};
