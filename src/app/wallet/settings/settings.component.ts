import { Component, OnInit, OnDestroy } from '@angular/core';
import { Location } from '@angular/common';

import { ModalsService } from '../../modals/modals.module';
import { RpcService, RpcStateService, BlockStatusService, DaemonService, SnackbarService, DiviService, AppSettingsService, SettingsService, SecurityService, PAGE_SIZE_OPTIONS } from '../../core';
import { environment } from '../../../environments/environment';
import { UserSettingsService } from 'app/core/services/user-settings.service';
import { UserInfoService } from 'app/core/services/user-info.service';
import { AuthScopes } from 'app/core/models/auth-scopes.enum';
import { INotificationSetting, NotificationSettingsHelper } from 'app/core/models/notification-settings.model';
import { Log } from 'ng2-logger';
import { IExchangeSetting, ExchangeSettingsHelper } from 'app/core/models/exchange-settings.model';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})

export class SettingsComponent implements OnInit, OnDestroy {

  tab: string = 'main';
  net: string;
  settings: any;
  hasChanged: boolean = false;

  public PAGE_SIZE_OPTIONS: Array<number> = PAGE_SIZE_OPTIONS;
  public timeouts: any[] = [];
  public isLocked: boolean = true;
  public testnet: boolean;
  public daemonVersion: string;
  public clientVersion: string = environment.version;
  public encryptionStatus: string = null;
  private destroyed: boolean = false;
  public walletInited: boolean = false;
  private isFullySynced: boolean = false;
  private enableCombine: boolean = false;
  private log: any = Log.create('settings.component');
  private notifications: INotificationSetting[] = [];
  public exchanges: IExchangeSetting[] = [];
  public selectedExchange: string;

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
    private userInfoService: UserInfoService,
    private blockStatusService: BlockStatusService,
    private securityService: SecurityService
  ) {
    this.blockStatusService.isFullSynced
      .takeWhile(() => !this.destroyed)
      .subscribe((isFullSynced) => {
        this.isFullySynced = isFullSynced;
      });
  }

  ngOnInit() {
    this.timeouts = this.securityService.getTimeouts();
    this.settings = this._settingsService.loadSettings();
    this.notifications = NotificationSettingsHelper.getSettings(this.settings.display.notify);
    this.exchanges = ExchangeSettingsHelper.getSettings();
    this.selectedExchange = this.settings.display.exchanges[0];

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

    this._rpc.call('listunspent').subscribe(txs => {
      this.enableCombine = txs.length > 1;
    }, error => this.log.er('listunspent: ', error));
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
      }, error => this.log.er('save: update-setting: ', error));
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
      this.log.er('verifyWallet:', err);
      this.showWalletVerifyModal(false);
    });
  }

  checkEmail(): boolean {
    if (!this.userInfo) return false;

    const regexp = new RegExp('[a-zA-Z0-9_\\.\\+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-\\.]+'), test = regexp.test(this.userInfo.email);

    return test;
  }

  async updateUserInfo(): Promise<void> {
    let alertMessage = 'Your Email and username has been accepted, we will notify you when and if your nodes go down, Thank you.';

    if (this.userInfo.isSubscribed) {
      await this.userInfoService.subscribe();
    } else {
      await this.userInfoService.unsubscribe();
      alertMessage = 'Your user has been removed from the notifications module, we will NO LONGER NOTIFIY you.';
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
    this.flashNotificationService.open('Restarting daemon ... Please wait 30 seconds to use your wallet ...');
    this.daemonService.restart(args)
      .subscribe(() => this.flashNotificationService.open('Daemon successfully restarted.'), error => this.log.er('restartDaemon: ', error));
  }

  reindex() {
    this.restartDaemon(['-reindex']);
  }

  rescan() {
    this.restartDaemon(['-rescan']);
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

  onCryptoMarketChange(event: string) {
    this.settings.display.exchanges = [event];

    this.apply();
  }

  apply() {
    this.settings.display.notify = this.notifications.filter(x => !!x.enabled).map(x => x.value);

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
      success => this._rpcState.stateCall('getwalletinfo'), error => this.log.er('lockwallet: ', error));
  }

  async unlockwallet(showStakeOnly: boolean = true): Promise<void> {
    await this._modals.unlock(AuthScopes.UNLOCK_WALLET, null, showStakeOnly);
  }

  clearCache() {
    this.flashNotificationService.open('Clearing cache ... Please wait 30 seconds to use your wallet ...');
    this.daemonService.stop().subscribe(() => {
      this._rpc.call('clear-cache').subscribe(() => {
        this.daemonService.restart().subscribe(() => {}, error => this.log.er('clearCache: daemon-restart: ', error));
      }, error => this.log.er('clearCache: clear-cache:', error));
    }, error => this.log.er('clearCache: daemon-stop:', error));
  }

  onPrimerRestoreClick(): void {
    this._modals.open('primer', { forceOpen: true });
  }

  async onSetup2faClick(): Promise<void> {
    const isUnlocked = await this._modals.unlock(AuthScopes.SETUP_TFA, { description: 'Please unlock your wallet to setup 2-Factor Authentication.' });

    if (!isUnlocked) {
      return;
    }

    const modal = this._modals.open('tfaSettings', { forceOpen: true });
    await (modal.beforeClose().toPromise());
    await this.initUserSettings();
  }

  async onUninstallClick(): Promise<void> {
    const isUnlocked = await this._modals.unlock(AuthScopes.BACKUP);

    if (!isUnlocked) {
      return;
    }

    this._modals.open('uninstall', { forceOpen: true });
  }

  async combineUtxos(): Promise<void> {
    this.enableCombine = !await this._modals.combineUtxo();
  }
}
