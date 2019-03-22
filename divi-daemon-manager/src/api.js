const _ = require('lodash');
const fs = require('fs');
const configPath = '/root/.divi/divi.conf';
const exec = require('child_process').exec;

module.exports = (app) => {
    app.get('/sayhello', (req, res) => {
      res.json('Hello World');
    });
    
    app.post('/externalip', (req, res) => {
      const externalIp = req.body.externalIp;
      setExternalIp(configPath, externalIp);
      res.json(externalIp);
    });
    
    app.post('/startdaemon', (req, res) => {
      startDiviDaemon();
      res.json('Started');
    });
}

function setExternalIp(filePath, ipAddress) {
  readWriteFileSync(filePath, 'externalip=', 'externalip=' + ipAddress);
}

function readWriteFileSync(filePath, searchFor, replaceWith) {
  const data = fs.readFileSync(filePath, 'utf-8');
  const newValue = data.replace(searchFor, replaceWith);

  fs.writeFileSync(filePath, newValue, 'utf-8');
}

function startDiviDaemon() {
  exec('sudo /root/divi_ubuntu/divid', function(err, stdout, stderr) {
    console.error(err);
  });
}