const Observable  = require('rxjs/Observable').Observable;
const rxIpc       = require('rx-ipc-electron/lib/main').default;
const log         = require('electron-log');

/* Constants */
const ZMQ_CHANNEL = "zmq";

const SPY_ON_ZMQ = true;

/* references */
let mainReference = null;

exports.init = function (mainWindow) {
    /* 
        Store a reference of the main window (electron),
        which we need for rx-ipc-electron (need to get webContents).
    */
    mainReference = mainWindow;
}

/*
    Sends a message to the Angular frontend, on the channel "zmq".
    Subchannels can be anything "wtxhash", "smsg", .. (divi-core)
    TODO (maybe): promise structure?
*/
exports.send = function(subchannel, ...data) {
    try {
      rxIpc.runCommand(ZMQ_CHANNEL, mainReference.webContents, subchannel, ...data)
        .subscribe(
        (returnData) => {
        },
        (error) => {
          log.error("zmq.send: subchan: " + subchannel + " data: " + data + " error: ", error);
        },
        () => { }
        );
    } catch (error) {
      log.error("zmq.send: failed to runCommand (maybe window closed): ", error);
    }

  }

  exports.test = function() {
    exports.send("wtxhash", "somehashtoget");
    setTimeout(exports.test, 30 * 1000);
  }
