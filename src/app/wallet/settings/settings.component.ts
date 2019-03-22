import { Component, OnInit, OnDestroy } from '@angular/core';
import { Location } from '@angular/common';

import { SettingsService } from './settings.service';
import { ModalsService } from '../../modals/modals.module';
import { RpcService, RpcStateService, DaemonService, SnackbarService, DiviService, AppSettingsService } from '../../core';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  providers: [
    SettingsService
  ]
})

export class SettingsComponent implements OnInit, OnDestroy {

  tab: string = 'main';
  net: string;
  settings: Object;
  hasChanged: boolean = false;

  public testnet: boolean;
  public daemonVersion: string;
  public clientVersion: string = environment.version;
  public encryptionStatus: string = null;
  private destroyed: boolean = false;
  public walletInited: boolean = false;

  constructor(
    private _settingsService: SettingsService,
    private _location: Location,
    private _modals: ModalsService,
    private divi: DiviService,
    private _rpc: RpcService,
    private _rpcState: RpcStateService,
    private flashNotificationService: SnackbarService,
    private daemonService: DaemonService,
    private appSettingsService: AppSettingsService
  ) { }

  ngOnInit() {
    /* Preload default settings if none found */
    if (localStorage.getItem('settings') == null) {
      const settings: string = JSON.stringify(this._settingsService.defaultSettings);
      localStorage.setItem('settings', settings);
    }
    this.settings = this._settingsService.loadSettings();

    this._rpcState.observe('getwalletinfo', 'encryptionstatus')
      .takeWhile(() => !this.destroyed)
      .subscribe(encryptionstatus => {
        this.encryptionStatus = encryptionstatus;
      });

    this._rpcState.observe('getnetworkinfo', 'subversion')
      .takeWhile(() => !this.destroyed)
      .subscribe(subversion => this.daemonVersion = subversion.replace(/\//g, ''));

    this.appSettingsService.onNetChangeObs
      .takeWhile(() => !this.destroyed)
      .subscribe(net => {
        this.net = net;
        this.testnet = net === 'test';
      });

    this._rpcState.observe('ui:walletInitialized')
      .takeWhile(() => !this.destroyed)
      .subscribe(status => this.walletInited = status);
  }

  ngOnDestroy() {
    this.destroyed = true;
  }

  settingsTab(tab: string) {
    this.tab = tab;
    if (tab === 'help') {
      // const dialogRef = this.dialog.open(ConsoleModalComponent);
    }
  }

  save() {
    if (this.hasChanged) {
      this._rpc.call('update-setting', ['net', this.net]).subscribe(() => {
        this.restartDaemon();
        this.appSettingsService.init();
      });
    }
  }

  private showWalletVerifyModal(verified: boolean): void {
    this._modals.open('walletVerifyResult', { forceOpen: true, verified: verified });
  }

  verifyWallet(): void {
    if (this._rpcState.get('locked')) {
      this._modals.open('unlock', {forceOpen: true, timeout: 30, callback: this.verifyWallet.bind(this)});
    } else {
      this._rpc.call('walletverify').subscribe((result: boolean) => {
        this.showWalletVerifyModal(result);
      }, (err) => {
        console.error(err);
        this.showWalletVerifyModal(false);
      });
    }
  }

  changePassword() {
    this._modals.open('changePassword', { forceOpen: true });
  }

  recover() {
    this._modals.open('createWallet', { data: { step: 4, disableBack: true, isRestore: true }, forceOpen: true });
  }

  backup() {
    if (this._rpcState.get('locked')) {
      this._modals.open('unlock', {forceOpen: true, timeout: 30, callback: this.openBackupModal.bind(this)});
    } else {
      this.openBackupModal();
    }
  }

  restartDaemon(args: Array<string> = []): void {
    this.flashNotificationService.open('Restarting daemon... Please wait 30 seconds for functionality to be restored to your wallet..');
    this.daemonService.restart(args)
      .subscribe(() => this.flashNotificationService.open('Daemon successfully restarted.'));
  }

  rescan() {
    this.restartDaemon(['-reindex']);
  }

  zapwallet() {
    this.restartDaemon(['-zapwallettxes=2']);
  }

  private openBackupModal(): void {
    this._modals.open('createWallet', { data: { step: 3, disableBack: true, isRestore: false }, forceOpen: true });
  }
  
  onSettingsChange(): void {
    this.apply();
  }

  apply() {
    this._settingsService.applySettings(this.settings);
  }

  netChanged() {
    this.hasChanged = true;
  }

  encryptwallet() {
    this._modals.open('encrypt', { forceOpen: true });
  }

  lockwallet() {
    this._rpc.call('walletlock')
    .subscribe(
      success => this._rpcState.stateCall('getwalletinfo'),
      error => console.error('walletlock error', error));
  }

  unlockwallet() {
    this._modals.open('unlock', { forceOpen: true, showStakeOnly: true });
  }

  clearCache() {
    this.flashNotificationService.open('Clearing cache... Please wait 30 seconds for functionality to be restored to your wallet..');
    this.daemonService.stop().subscribe(() => {
      this._rpc.call('clear-cache').subscribe(() => {
        this.daemonService.restart().subscribe(() => {});
      });
    });
  }
}
