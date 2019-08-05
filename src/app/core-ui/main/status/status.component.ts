
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material';
import { Subscription } from 'rxjs/Subscription';
import { Log } from 'ng2-logger';

import { ModalsService } from '../../../modals/modals.service';
import { RpcService, RpcStateService } from '../../../core';

import { ConsoleModalComponent } from './modal/help-modal/console-modal.component';
import { AuthScopes } from 'app/core/models/auth-scopes.enum';
import { BlockStatusService } from 'app/core/rpc/rpc.module';


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

  private log: any = Log.create('status.component');


  constructor(
    public blockStatusService: BlockStatusService,
    private _rpc: RpcService,
    private _rpcState: RpcStateService,
    private _modalsService: ModalsService,
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
          this.stakingDescription = props.filter(p => !status[p]).map(p => `${p}: false`).join(', ');
        }
      });

    this._rpcState.observe('ui:walletInitialized')
      .takeWhile(() => !this.destroyed)
      .subscribe(status => this.walletInitialized = status);
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

  /* Open Debug Console Window */
  async openConsoleWindow(): Promise<void> {
    const isUnlocked = await this._modalsService.unlock(AuthScopes.CONSOLE_ACCESS);

    if (!isUnlocked) {
      return;
    }

    this.dialog.open(ConsoleModalComponent);
  }
}
