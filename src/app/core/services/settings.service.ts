import { Injectable } from '@angular/core';

@Injectable()
export class SettingsService {

  needsUpdate: boolean = false;

  private defaultSettings: Object = {
    main: {
      autostart: false,
      detachDatabases: true,
      feeAmount: 0.01,
      feeCurrency: 'divi',
      stake: true,
      reserveAmount: 0,
      reservceCurrency: 'divi',
      stakeInterval: 30,
      minRing: 3,
      maxRing: 100,
      autoRing: false,
      secureMessaging: false,
      thin: false,
      thinFullIndex: false,
      thinIndexWindow: 4096,
      primer: true
    },
    network: {
      upnp: false,
      proxy: false,
      proxyIP: '127.0.0.1',
      proxyPort: 9050,
      socketVersion: 5
    },
    display: {
      language: 'default',
      units: 'divi',
      rows: 20,
      addresses: true,
      notify: {
        message: true,
        sentTo: false,
        receivedWith: false,
        receivedFrom: false,
        selfPayment: false,
        partReceived: true,
        partSent: false,
        other: false
      },
      show: {
        sentTo: true,
        receivedWith: true,
        receivedFrom: true,
        selfPayment: true,
        partReceived: true,
        partSent: true,
        other: true
      }
    },
    i2p: {},
    tor: {}
  };

  loadSettings(): any {
    let settings = JSON.parse(localStorage.getItem('settings'));

    if (!settings) {
      settings = this.defaultSettings;
      this.applySettings(settings);
    }

    if (settings.main.primer == undefined) {
      settings.main.primer = true;
    }

    return settings;
  }

  applySettings(settings: Object): void {

    const oldSettings: string = localStorage.getItem('settings');
    const newSettings: string = JSON.stringify(settings);

    localStorage.setItem('settings', newSettings);

    if (oldSettings !== newSettings) {
      this.needsUpdate = true;
    }
  }
}
