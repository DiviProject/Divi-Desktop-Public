import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs';
import { Log } from 'ng2-logger';

import { RpcService, RpcStateService, BlockStatusService, UpdateService, SecutiyService } from '../core';

/* modals */
import { CreateWalletComponent } from './createwallet/createwallet.component';
import { ColdstakeComponent } from './coldstake/coldstake.component';
import { DaemonComponent } from './daemon/daemon.component';
import { SyncingComponent } from './syncing/syncing.component';
import { UnlockwalletComponent } from './unlockwallet/unlockwallet.component';
import { EncryptwalletComponent } from './encryptwallet/encryptwallet.component';
import { MultiwalletComponent } from './multiwallet/multiwallet.component';

import {MatDialog, MatDialogRef} from '@angular/material';
import { ModalsComponent } from './modals.component';
import { AutoUpdateComponent } from './auto-update/auto-update.component';
import { ReleaseNotesComponent } from './release-notes/release-notes.component';
import { WalletVerifyResultComponent } from './wallet-verify-result/wallet-verify-result.component';
import { ShutdownComponent } from './shutdown/shutdown.component';
import { ChangePasswordComponent } from './change-password/change-password.component';

@Injectable()
export class ModalsService implements OnDestroy {

  public modal: any = null;
  private progress: Subject<Number> = new Subject<Number>();

  public enableClose: boolean = true;
  private isOpen: boolean = false;
  private manuallyClosed: any[] = [];

  private data: string;
  private destroyed: boolean = false;

  private log: any = Log.create('modals.service');

  messages: Object = {
    createWallet: CreateWalletComponent,
    coldStake: ColdstakeComponent,
    daemon: DaemonComponent,
    syncing: SyncingComponent,
    unlock: UnlockwalletComponent,
    encrypt: EncryptwalletComponent,
    multiwallet: MultiwalletComponent,
    autoUpdate: AutoUpdateComponent,
    releaseNotes: ReleaseNotesComponent,
    walletVerifyResult: WalletVerifyResultComponent,
    shutdown: ShutdownComponent,
    changePassword: ChangePasswordComponent
  };

  constructor (
    private _rpc: RpcService,
    private _rpcState: RpcStateService,
    private _blockStatusService: BlockStatusService,
    private _dialog: MatDialog,
    private _updateService: UpdateService,
    private _securityService: SecutiyService
  ) {

    /* Hook BlockStatus -> open syncing modal */
    this._blockStatusService.statusUpdates.asObservable().subscribe(status => {
      this.progress.next(status.syncPercentage);
      this.openSyncModal(status);
    });

    this.subscribeOnWalletInit();

    /* Hook daemon errors -> open daemon modal */
    this._rpcState.errorsStateCall.asObservable()
    .subscribe(
      status => {},
      error => {
          this.enableClose = true;
          // this.open('daemon', error);
      });

    this._updateService.isUpdateAvailableSub.subscribe((isUpdateAvailable) => {
      if (isUpdateAvailable) {
        this.open('autoUpdate');
      }
    });

    this._updateService.releaseInfoSub.subscribe((info) => {
      if (!!info) {
        this.open('releaseNotes', { forceOpen: true, info: info });
      }
    });

    window.ipc.on('app-event', (event, eventType) => {
      if (eventType === 'shutdown') {
        this.open('shutdown', { disableClose: true, forceOpen: true });
      }
    });
  }

  ngOnDestroy() {
    this.destroyed = true;
  }

  /**
    * Open a modal
    * @param {string} modal   The name of the modal to open
    * @param {any} data       Optional - data to pass through to the modal.
    */
  open(modal: string, data?: any): MatDialogRef<ModalsComponent> {
    if (!this.canAccess(modal, data)) {
      return;
    }

    const dialogRef = this._dialog.open(ModalsComponent, {
      disableClose: true,
      width: '100%',
      height: '100%',
      panelClass: 'cdk-modal-full',
      data: data,
    });
    if (modal in this.messages) {
      if (
        (data && data.forceOpen)
        || !this.wasManuallyClosed(this.messages[modal].name)
      ) {
        if (!this.wasAlreadyOpen(modal)) {
          this.modal = this.messages[modal];
          dialogRef.componentInstance.open(this.modal, data);

          this.isOpen = true;
          dialogRef.componentInstance.enableClose = !!!(data || {}).disableClose;
          dialogRef.afterClosed().subscribe(() => {
            this.close();
          });
        } else {
          dialogRef.close();
        }
      }
    } else {
      this.log.er(`modal ${modal} doesn't exist`);
    }
    return dialogRef;
  }

  private canAccess(modal: string, data?: any): boolean {
    if (modal !== 'encrypt') {
      return true;
    }

    const status = this._rpcState.get('ui:walletStatus')
    if (status.isBackedUp) {
      return true;
    }

    this.open('createWallet', { forceOpen: true })
      .afterClosed().subscribe(() => {
        const s = this._rpcState.get('ui:walletStatus');
        if (JSON.stringify(status) !== JSON.stringify(s) && !s.isEncrypted) {
          this.open('encrypt', {forceOpen: true});
        }
      });

    return false;
  }

  /** Close the modal */
  close(): void {
    if (!!this.modal && !this.wasManuallyClosed(this.modal.name)) {
      this.manuallyClosed.push(this.modal.name);
    }
    this.isOpen = false;
    this.modal = undefined;
  }

  /**
    * Check if a modal was manually closed
    * @param {any} modal  The modal to check
    */
  wasManuallyClosed(modal: any): boolean {
    return this.manuallyClosed.includes(modal);
  }

  /** Check if the modal is already open */
  wasAlreadyOpen(modalName: string): boolean {
    return (this.modal === this.messages[modalName]);
  }


  /** Get progress set by block status */
  getProgress() {
    return (this.progress.asObservable());
  }

  /**
    * Open the Sync modal if it needs to be opened
    * @param {any} status  Blockchain status
    */
  openSyncModal(status: any): void {
    // Open syncing Modal
    if (!this.isOpen && !this.wasManuallyClosed(this.messages['syncing'].name)
      && (status.networkBH <= 0
      || status.internalBH <= 0
      || status.networkBH - status.internalBH > 50)) {
        this.open('syncing');
    }
  }

  /**
    * Open the Createwallet modal if wallet is not initialized
    */
  openInitialCreateWallet(): void {
    var dontShow = localStorage.getItem("wallet:doNotShowEncrypt") === 'true';
    if (dontShow) {
      return;
    }

    this._rpcState.observe('ui:walletStatus')
      .take(1)
      .subscribe(status => {
        if (!status || (status.isBackedUp && status.isEncrypted)) {
          return;
        }

        const m = this.open('createWallet', { forceOpen: true });

        m.afterClosed().subscribe(() => {
          const s = this._rpcState.get('ui:walletStatus');
          if (JSON.stringify(status) !== JSON.stringify(s) && !s.isEncrypted) {
            this.open('createWallet', { forceOpen: true });
          }
        });
      });
  }

  subscribeOnWalletInit(): void {
    this.openInitialCreateWallet();
  }

  unlock(): Observable<void> {
    return Observable.create(obs => {
      if (this._securityService.isUnlocked()) {
        obs.next();
        obs.complete();
      } else {
        const modal = this.open('unlock', { data: { }, forceOpen: true, timeout: 30 });
        modal.afterClosed().subscribe(() => {
          if (this._securityService.isUnlocked()) {
            this._rpcState.stateCall('getwalletinfo');
            obs.next();
            obs.complete();
          }
        });
      }
    });
  }

  alwaysUnlock(): Observable<void> {
    return Observable.create(obs => {
      if (this._securityService.isAlwaysUnlocked()) {
        obs.next();
        obs.complete();
      } else {
        const modal = this.open('unlock', { data: { alwaysUnlocked: true }, forceOpen: true, timeout: 30 });
        modal.afterClosed().subscribe(() => {
          if (this._securityService.isAlwaysUnlocked()) {
            this._rpcState.stateCall('getwalletinfo');
            obs.next();
            obs.complete();
          }
        });
      }
    });
  }
}
