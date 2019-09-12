import { Injectable, OnDestroy } from '@angular/core';
import { Log } from 'ng2-logger';

import { RpcStateService, UpdateService, SecurityService, RpcService, SettingsService } from '../core';

/* modals */
import { CreateWalletComponent } from './createwallet/createwallet.component';
import { SyncingComponent } from './syncing/syncing.component';
import { UnlockwalletComponent } from './unlockwallet/unlockwallet.component';
import { EncryptwalletComponent } from './encryptwallet/encryptwallet.component';
import { MultiwalletComponent } from './multiwallet/multiwallet.component';

import { MatDialog, MatDialogRef } from '@angular/material';
import { ModalsComponent } from './modals.component';
import { AutoUpdateComponent } from './auto-update/auto-update.component';
import { ReleaseNotesComponent } from './release-notes/release-notes.component';
import { WalletVerifyResultComponent } from './wallet-verify-result/wallet-verify-result.component';
import { ShutdownComponent } from './shutdown/shutdown.component';
import { ChangePasswordComponent } from './change-password/change-password.component';
import { Verify2faComponent } from './verify-2fa/verify-2fa.component';
import { PrimerComponent } from './primer/primer.component';
import { CombineUtxoComponent } from './combine-utxo/combine-utxo.component';
import { UninstallComponent } from './uninstall/uninstall.component';
import { TfaSettingsComponent } from './tfa-settings/tfa-settings.component';
import { AuthScopes } from 'app/core/models/auth-scopes.enum';

@Injectable()
export class ModalsService implements OnDestroy {

  public modal: any = null;

  public enableClose: boolean = true;
  private isOpen: boolean = false;
  private manuallyClosed: any[] = [];

  private destroyed: boolean = false;

  private log: any = Log.create('modals.service');

  messages: Object = {
    createWallet: CreateWalletComponent,
    syncing: SyncingComponent,
    unlock: UnlockwalletComponent,
    encrypt: EncryptwalletComponent,
    multiwallet: MultiwalletComponent,
    autoUpdate: AutoUpdateComponent,
    releaseNotes: ReleaseNotesComponent,
    walletVerifyResult: WalletVerifyResultComponent,
    shutdown: ShutdownComponent,
    changePassword: ChangePasswordComponent,
    verify2fa: Verify2faComponent,
    primer: PrimerComponent,
    combineUtxo: CombineUtxoComponent,
    uninstall: UninstallComponent,
    tfaSettings: TfaSettingsComponent
  };

  constructor(
    private _rpc: RpcService,
    private _rpcState: RpcStateService,
    private _dialog: MatDialog,
    private _updateService: UpdateService,
    private _securityService: SecurityService,
    private _settingsService: SettingsService
  ) {

    this.subscribeOnWalletInit();

    /* Hook daemon errors -> open daemon modal */
    this._rpcState.errorsStateCall.asObservable()
      .subscribe(
        status => { },
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
    const settings = this._settingsService.loadSettings();
    if (!!settings.main.minimode) {
      return;
    }

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
          this.open('encrypt', { forceOpen: true });
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

  verify2faToken(): Promise<{ token?: string, success: boolean }> {
    return new Promise(async (res, rej) => {
      const modal = this.open("verify2fa", {
        data: {
          callback: async (token: string) => {
            res({ token, success: true });
          }
        }, forceOpen: true
      });

      await (modal.afterClosed().toPromise());
      res({ success: false })
    });
  }

  combineUtxo(): Promise<boolean> {
    return new Promise(async (res, rej) => {
      const modal = this.open("combineUtxo", {
        data: {
          callback: async (isCombined: boolean) => {
            res(isCombined);
          }
        }, forceOpen: true
      });

      await (modal.afterClosed().toPromise());
      res(false);
    });
  }

  async getAccessToScope(scope: string): Promise<boolean> {
    const onFail = async () => {
      if (scope === AuthScopes.UNLOCK_WALLET) {
        try {
          await (this._rpc.call('walletlock').toPromise())
        } catch (e) {
          // suppress
        }
      }
    }

    try {
      const isScopeSelected = await this._securityService.isScopeSelected(scope);

      if (isScopeSelected) {
        //verify
        const result = await this.verify2faToken();

        if (!result.success) {
          await onFail();
          return false;
        }
      }

      return true;
    } catch(e) {
      console.log(e);
      await onFail();
      return false;
    }
  }

  async unlock(scope: string, data?: any, showStakeOnly?: boolean, stakeOnly?: boolean): Promise<boolean> {
    const isUnlocked = this._securityService.isUnlocked();
    let isUnlockedForStaking = this._securityService.isUnlockedForStaking();

    if (isUnlocked) {
      isUnlockedForStaking = true;
    }

    if (!isUnlocked || !isUnlockedForStaking) {
      //unlock
      const modal = this.open('unlock', { data, forceOpen: true, showStakeOnly, stakeOnly, timeout: 30 });
      await (modal.afterClosed().toPromise());
      if (this._securityService.isUnlocked() || this._securityService.isUnlockedForStaking()) {
        await this._securityService.refresh();

        if (scope === AuthScopes.STAKING) {
          return this._securityService.isUnlockedForStaking();
        }
      } else {
        return false;
      }
    }

    const hasAccess = await this.getAccessToScope(scope);
    return hasAccess;
  }

  async alwaysUnlock(scope: string = AuthScopes.UNLOCK_WALLET, showStakeOnly?: boolean): Promise<boolean> {
    const isUnlocked = this._securityService.isAlwaysUnlocked();

    if (!isUnlocked) {
      //unlock
      const modal = this.open('unlock', { data: { alwaysUnlocked: true }, forceOpen: true, showStakeOnly, timeout: 30 });
      await (modal.afterClosed().toPromise());
      if (this._securityService.isAlwaysUnlocked()) {
        await this._securityService.refresh();
      } else {
        return false;
      }
    }

    const hasAccess = await this.getAccessToScope(scope);
    return hasAccess;
  }
}
