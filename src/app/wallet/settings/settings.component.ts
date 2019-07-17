import { Component, OnInit, OnDestroy } from '@angular/core';
import { Location } from '@angular/common';

import { ModalsService } from '../../modals/modals.module';
import { RpcService, RpcStateService, DaemonService, SnackbarService, DiviService, AppSettingsService, SettingsService } from '../../core';
import { environment } from '../../../environments/environment';
import { UserSettingsService } from 'app/core/services/user-settings.service';
import { UserInfoService } from 'app/core/services/user-info.service';
import { AuthScopes } from 'app/core/models/auth-scopes.enum';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})

export class SettingsComponent implements OnInit, OnDestroy {

  tab: string = 'main';
  net: string;
  settings: Object;
  hasChanged: boolean = false;

  public isLocked: boolean = true;
  public testnet: boolean;
  public daemonVersion: string;
  public clientVersion: string = environment.version;
  public encryptionStatus: string = null;
  private destroyed: boolean = false;
  public walletInited: boolean = false;
  
  public userSettings: {
    twoFactorAuthEnabled: boolean,
    twoFactorAuthScopes: string,
    twoFactorAuthScopesTemp: string
  } = null; 

  public userInfo: {
    email: string,
    userName: string,
    isSubscribed: boolean
  } = null; 

  constructor(
    private _settingsService: SettingsService,
    private _location: Location,
    private _modals: ModalsService,
    private divi: DiviService,
    private _rpc: RpcService,
    private _rpcState: RpcStateService,
    private flashNotificationService: SnackbarService,
    private daemonService: DaemonService,
    private appSettingsService: AppSettingsService,
    private userSettingsService: UserSettingsService,
    private userInfoService: UserInfoService
  ) { }

  ngOnInit() {
    this.settings = this._settingsService.loadSettings();

    this._rpcState.observe('getwalletinfo', 'encryptionstatus')
      .takeWhile(() => !this.destroyed)
      .subscribe(encryptionstatus => this.encryptionStatus = encryptionstatus);

    this._rpcState.observe('locked')
      .takeWhile(() => !this.destroyed)
      .subscribe(isLocked => this.onLockedStateChanged(isLocked));

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

    //const walletInfo = this._rpcState.get('getwalletinfo') || {};
    this.onLockedStateChanged(this._rpcState.get('locked'));
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

  async onLockedStateChanged(isLocked: boolean): Promise<void> {
    this.isLocked = isLocked != undefined ? isLocked : this.isLocked;
    
    if (isLocked != undefined && !isLocked) {
      await this.initUserSettings();
      await this.initUserInfo();
    }
  }

  async initUserSettings(): Promise<void> {
    this.userSettings = await this.userSettingsService.getSettings();
    this.userSettings.twoFactorAuthScopesTemp = this.userSettings.twoFactorAuthScopes;
    this._rpcState.set('userSettings', this.userSettings);
  }

  async initUserInfo(): Promise<void> {
    this.userInfo = await this.userInfoService.getInfo();
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

  async verifyWallet(): Promise<void> {
    const isUnlocked = await this._modals.unlock(AuthScopes.WALLET_VERIFY);
    
    if (!isUnlocked) {
      return;
    }

    this._rpc.call('walletverify').subscribe((result: boolean) => {
      this.showWalletVerifyModal(result);
    }, (err) => {
      console.error(err);
      this.showWalletVerifyModal(false);
    });
  }

  checkEmail(): boolean {
    if (!this.userInfo) return false;

    const regexp = new RegExp('[a-zA-Z0-9_\\.\\+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-\\.]+'), test = regexp.test(this.userInfo.email);

    return test;
  }

  async updateUserInfo(): Promise<void> {
    let alertMessage = 'Email and username accepted, we will notify you if your nodes go down. Thank you.';

    if (this.userInfo.isSubscribed) {
      await this.userInfoService.subscribe();
    } else {
      await this.userInfoService.unsubscribe();
      alertMessage = 'Email and username accepted, we won\'t notify you if your nodes go down. Thank you.';
    }

    await this.userInfoService.create(this.userInfo.email, this.userInfo.userName);
    this.flashNotificationService.open(alertMessage);
  }

  changePassword() {
    this._modals.open('changePassword', { forceOpen: true });
  }

  recover() {
    this._modals.open('createWallet', { data: { step: 4, disableBack: true, isRestore: true }, forceOpen: true });
  }

  async backup(): Promise<void> {
    const isUnlocked = await this._modals.unlock(AuthScopes.BACKUP);

    if (!isUnlocked) {
      return;
    }

    this.openBackupModal();
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

  async unlockwallet(showStakeOnly: boolean = true): Promise<void> {
    await this._modals.unlock(AuthScopes.UNLOCK_WALLET, null, showStakeOnly);
  }

  clearCache() {
    this.flashNotificationService.open('Clearing cache... Please wait 30 seconds for functionality to be restored to your wallet..');
    this.daemonService.stop().subscribe(() => {
      this._rpc.call('clear-cache').subscribe(() => {
        this.daemonService.restart().subscribe(() => {});
      });
    });
  }

  onPrimerRestoreClick(): void {
    this._modals.open('primer', { forceOpen: true });
  }

  async onSetup2faClick(): Promise<void> {
    const isUnlocked = await this._modals.unlock(AuthScopes.SETUP_TFA, { description: 'Please unlock your wallet to begin setting up 2-factor authentication.' });

    if (!isUnlocked) {
      return;
    }

    const modal = this._modals.open('tfaSettings', { forceOpen: true });
    await (modal.beforeClose().toPromise());
    await this.initUserSettings();
  }
}
