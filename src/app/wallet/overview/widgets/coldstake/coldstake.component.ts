import { Component, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material';
import { Log } from 'ng2-logger';
import { Observable } from 'rxjs/Observable';

import { ModalsService } from 'app/modals/modals.service';
import { RpcService, RpcStateService } from 'app/core/rpc/rpc.module';
import { ColdstakeService } from './coldstake.service'

import { Amount } from '../../../../core/util/utils';
import { ZapColdstakingComponent } from './zap-coldstaking/zap-coldstaking.component';
import { RevertColdstakingComponent } from './revert-coldstaking/revert-coldstaking.component';

@Component({
  selector: 'app-coldstake',
  templateUrl: './coldstake.component.html',
  styleUrls: ['./coldstake.component.scss']
})
export class ColdstakeComponent {

  private log: any = Log.create('coldstake.component');

  constructor(
    private dialog: MatDialog,
    private _modals: ModalsService,
    private _rpc: RpcService,
    private _rpcState: RpcStateService,
    private _coldstake: ColdstakeService
  ) { }

  zap() {
    if (this._rpcState.get('locked')) {
      this._modals.open('unlock', {
        forceOpen: true,
        callback: this.openZapColdstakingModal.bind(this)
      });
    } else {
      this.openZapColdstakingModal();
    }
  }

  revert() {
    if (this._rpcState.get('locked')) {
      this._modals.open('unlock', {
        forceOpen: true,
        callback: this.openRevertColdstakingModal.bind(this)
      });
    } else {
      this.openRevertColdstakingModal();
    }
  }

  openRevertColdstakingModal() {
    const dialogRef = this.dialog.open(RevertColdstakingComponent);
  }

  openZapColdstakingModal(): void {
    const dialogRef = this.dialog.open(ZapColdstakingComponent);
  }

  openUnlockWalletModal(): void {
    this._modals.open('unlock', { forceOpen: true, showStakeOnly: false, stakeOnly: true }); // unlock
  }

  openColdStakeModal(): void {
    this._modals.open('coldStake', { forceOpen: true, type: 'cold' });
  }

  checkLockStatus(): boolean {
    return [
      'Unlocked',
      'Unlocked, staking only',
      'Unencrypted'
    ].includes(this._coldstake.encryptionStatus);
  }
}
