
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog, MatSlideToggleChange } from '@angular/material';
import { Subscription } from 'rxjs/Subscription';
import { Log } from 'ng2-logger';

import { ModalsService } from '../../../modals/modals.service';
import { RpcService, RpcStateService } from '../../../core';

import { ConsoleModalComponent } from './modal/help-modal/console-modal.component';
import { AuthScopes } from 'app/core/models/auth-scopes.enum';
import { BlockStatusService } from 'app/core/rpc/rpc.module';
import { SettingsService } from 'app/core/services/settings.service';


@Component({
  selector: 'app-status',
  templateUrl: './status.component.html',
  styleUrls: ['./status.component.scss']
})
export class StatusComponent implements OnInit, OnDestroy {

  peerListCount: number = 0;
  public walletInitialized: boolean;
  public coldStakingStatus: boolean;
  public stakingEnabled: boolean;
  public stakingDescription: string;
  public isUnlockedForStaking: boolean = false;
  public encryptionStatus: string = null;
  public encryptionStatusIcon: string = null;
  private stakinginfo: any = null;
  private _sub: Subscription;
  private destroyed: boolean = false;
  private showDebugConsole: boolean = false;

  private log: any = Log.create('status.component');


  constructor(
    public blockStatusService: BlockStatusService,
    private _rpc: RpcService,
    private _rpcState: RpcStateService,
    private _modalsService: ModalsService,
    public settingsService: SettingsService,
    private dialog: MatDialog) { }

  ngOnInit() {
    this._rpcState.observe('getnetworkinfo', 'connections')
      .takeWhile(() => !this.destroyed)
      .subscribe(connections => this.peerListCount = connections);
    
    this._rpcState.observe('ui:coldstaking')
      .takeWhile(() => !this.destroyed)
      .subscribe(status => this.coldStakingStatus = status);

    this._rpcState.observe('getwalletinfo', 'encryptionstatus')
      .takeWhile(() => !this.destroyed)
      .subscribe(encryptionstatus => {
        this.encryptionStatus = encryptionstatus;
        this.encryptionStatusIcon = this.getIconEncryption(this.encryptionStatus);
        this.isUnlockedForStaking = ['Unlocked, staking only', 'Unlocked', 'Unencrypted'].includes(this.encryptionStatus);
      });

    this._rpcState.observe('getstakinginfo')
      .takeWhile(() => !this.destroyed)
      .subscribe(status => {
        this.stakinginfo = status;
        this.stakingEnabled = false;
        if (!!this.stakinginfo) {
          const props = Object.keys(this.stakinginfo);
          this.stakingEnabled = props.filter(p => !!status[p]).length === props.length;

          if (!!props.filter(p => !status[p])[0]) {
            this.stakingDescription = this.getStakingDescription(props.filter(p => !status[p])[0]);
          }
        }
      });

    this._rpcState.observe('ui:walletInitialized')
      .takeWhile(() => !this.destroyed)
      .subscribe(status => this.walletInitialized = status);

      this.settingsService.onChange.subscribe(s => {
          const settings = this.settingsService.loadSettings();
          this.showDebugConsole = settings.main.advancedMode;
      });
  }

  getStakingDescription(status: string) {
    switch (status) {
      case 'enoughcoins':
        return 'Not enough coins';
      case 'mintablecoins':
        return 'Coins maturing';
      case 'walletunlocked':
        return 'Please unlock wallet';
      case 'staking status':
        return 'Please restart client';
      default:
        return 'Syncing';
    }
  }

  ngOnDestroy() {
    this.destroyed = true;
  }

  getIconNumber(): number {
    switch (true) {
      case this.peerListCount <= 0: return 0;
      case this.peerListCount < 4: return 2;
      case this.peerListCount < 8: return 3;
      case this.peerListCount < 12: return 4;
      case this.peerListCount < 16: return 5;
      case this.peerListCount >= 16: return 6;
      default: return 0;
    }
  }

  getIconEncryption(encryptionStatus: string) {
    switch (encryptionStatus) {
      case 'Unencrypted':
        return 'alert';
      case 'Unlocked':
        return 'lock/lock-off';
      case 'Unlocked, staking only':
        return 'lock/lock-stake';
      case 'Locked':
        return 'lock/lock';
      default:
        return null;
    }
  }

  getColdStakingStatus() {
    return (this.coldStakingStatus) ? 'enabled' : 'disabled';
  }

  lockwallet() {
    this._rpc.call('walletlock')
    .subscribe(
      success => {
        this._rpcState.stateCall('getwalletinfo');
        this.encryptionStatus = 'Locked';
      },
      error => console.error('walletlock error', error));
  }

  async unlockwallet(): Promise<void> {
    await this._modalsService.unlock(AuthScopes.UNLOCK_WALLET, null, true);
  }

  async unlockForStaking(): Promise<void> {
    await this._modalsService.unlock(AuthScopes.UNLOCK_WALLET, null, true, true);
  }

  encryptwallet(): void {
    this._modalsService.open('encrypt', {'forceOpen': true});
  }

  toggle() {
    switch (this.encryptionStatus) {
      case 'Unencrypted':
        this.encryptwallet();
        break;
      case 'Unlocked':
        this.lockwallet();
        break;
      case 'Unlocked, staking only':
      case 'Locked':
        this.unlockwallet();
        break;
      default:
        break;
    }
  }

  async toggleForStaking(value: MatSlideToggleChange) {
    const { checked } = value;
    if (!checked) {
      this.lockwallet();
      this.isUnlockedForStaking = false;
    } else {
      const result = await this._modalsService.unlock(AuthScopes.STAKING, null, true, true);
      this.isUnlockedForStaking = result;
    }
  }

  /* Open Debug Console Window */
  async openConsoleWindow(): Promise<void> {
    const isUnlocked = await this._modalsService.unlock(AuthScopes.CONSOLE_ACCESS);

    if (!isUnlocked) {
      return;
    }

    this.dialog.open(ConsoleModalComponent);
  }
}
