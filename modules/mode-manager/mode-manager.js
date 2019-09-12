"use strict";

let mainWindowRef = null;

exports.init = function init(mainWindow) {
  mainWindowRef = mainWindow;
};

exports.set = function set(minimode) {
  if (minimode) {
    mainWindowRef.setMinimumSize(300, 600);
    mainWindowRef.setSize(300, 600);
    mainWindowRef.setMaximumSize(300, 600);
    mainWindowRef.center();
  } else {
    mainWindowRef.setMinimumSize(1024, 675);
    mainWindowRef.setSize(1024, 675);
    mainWindowRef.setMaximumSize(5000, 3000);
    mainWindowRef.center();
  }
};
