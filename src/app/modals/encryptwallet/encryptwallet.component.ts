import { Component, forwardRef, Inject, ViewChild } from '@angular/core';
import { Log } from 'ng2-logger';
import { MatDialogRef } from '@angular/material';

import { PasswordComponent } from '../shared/password/password.component';
import { IPassword } from '../shared/password/password.interface';

import { RpcService, RpcStateService, DaemonService, SnackbarService } from '../../core';
import { ModalsService } from '../modals.service';

@Component({
  selector: 'app-encryptwallet',
  templateUrl: './encryptwallet.component.html',
  styleUrls: ['./encryptwallet.component.scss']
})
export class EncryptwalletComponent {

  log: any = Log.create('encryptwallet.component');
  public password: string;

  @ViewChild('passwordElement') passwordElement: PasswordComponent;

  constructor(
    @Inject(forwardRef(() => ModalsService))
    private _modalsService: ModalsService,
    private _rpc: RpcService,
    private _rpcState: RpcStateService,
    private flashNotification: SnackbarService,
    public _dialogRef: MatDialogRef<EncryptwalletComponent>,
    private daemonService: DaemonService
  ) { }

  encryptwallet(password: IPassword): void {
    if (this.password) {
      if (this.password === password.password) {
        this._rpcState.set('ui:spinner', true);
          this._rpc.call('encryptwallet', [password.password])
            .subscribe(response => {
              this.flashNotification.open('Blockchain must be rescanned.');

              this.sleep(3000).then(() => {
                this.flashNotification.open('Restarting daemon... Please wait 30 seconds for functionality to be restored to your wallet..');

                this.daemonService.restart().subscribe(() => {
                    this._rpcState.set('ui:spinner', false);
                    this.flashNotification.open('Wallet successfully encrypted.', 'info');
                    this._dialogRef.close();
                  }, err => this.log.er('encryptwallet: daemon-restart:', err));
              });
            },
            // Handle error appropriately
            error => {
              this._rpcState.set('ui:spinner', false);
              this.flashNotification.open('Wallet failed to encrypt properly!', 'err');
              this.log.er('error encrypting wallet', error);
            });
      } else {
        this._rpcState.set('ui:spinner', false);
        this.flashNotification.open('The passwords do not match!', 'err');
      }

    } else {
      this.password = password.password;
      this.passwordElement.clear();
    }
  }

  clearPassword(): void {
    this.password = undefined;
  }

  sleep(time: number): Promise<any> {
    return new Promise((resolve) => setTimeout(resolve, time));
  }
}
