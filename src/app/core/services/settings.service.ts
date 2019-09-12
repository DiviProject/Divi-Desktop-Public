import { Injectable, EventEmitter } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs/Rx';
import { ExchangeType } from '../models/exchange-type.enum';

export const DEFAULT_PAGE_SIZE: number = 25;
export const PAGE_SIZE_OPTIONS: Array<number> = [10, 25, 50, 100, 250];

@Injectable()
export class SettingsService {
  needsUpdate: boolean = false;
  public readonly onChange: EventEmitter<void>;
  private readonly minimodeSubject$: BehaviorSubject<boolean>;
  private readonly settingsSubject$: BehaviorSubject<any>;

  public get settings$(): Observable<any> {
    return this.settingsSubject$.asObservable();
  }

  public get minimode$(): Observable<boolean> {
    return this.minimodeSubject$.asObservable();
  }

  constructor() {
    this.onChange = new EventEmitter<void>();
    const settings = this.loadSettings();
    this.minimodeSubject$ = new BehaviorSubject<boolean>(!!settings.main.minimode);
    this.settingsSubject$ = new BehaviorSubject<any>(settings);
  }

  private defaultSettings: any = {
    main: {
      autostart: false,
      detachDatabases: true,
      advancedMode: false,
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
      primer: true,
      unlockTimeout: null,
      minimode: false
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
      rows: DEFAULT_PAGE_SIZE,
      notify: [],
      show: {
        sentTo: true,
        receivedWith: true,
        receivedFrom: true,
        selfPayment: true,
        partReceived: true,
        partSent: true,
        other: true
      },
      combineUtxo: {
        onSend: false
      },
      exchanges: [ExchangeType.Average]
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

    if (PAGE_SIZE_OPTIONS.indexOf(settings.display.rows) === -1) {
      settings.display.rows = DEFAULT_PAGE_SIZE;
    }

    if (!settings.display.notify.length) {
      settings.display.notify = [];
    }

    if (!settings.display.exchanges) {
      settings.display.exchanges = [...this.defaultSettings.display.exchanges];
    }

    if (settings.main.primer == undefined) {
      settings.main.primer = true;
    }

    if ( ( settings.combineUtxo == undefined ) || settings.combineUtxo.onSend ) {
      settings.combineUtxo = { onSend: false };
    }

    if (settings.combineUtxo.onSend == undefined) {
      settings.combineUtxo.onSendr = true;
    }

    return settings;
  }

  applySettings(settings: any): void {

    const oldSettings: string = localStorage.getItem('settings');
    const oldSettingsObj = JSON.parse(oldSettings);
    const newSettings: string = JSON.stringify(settings);

    localStorage.setItem('settings', newSettings);

    if (oldSettings !== newSettings) {
      this.needsUpdate = true;
      this.onChange.next();

      if (oldSettingsObj.main.minimode != settings.main.minimode) {
        this.minimodeSubject$.next(!!settings.main.minimode);
      }
      this.settingsSubject$.next(settings);
    }
  }
}
