import { Component, ViewChild, Inject } from '@angular/core';
import { Log } from 'ng2-logger';

import { MatDialogRef } from '@angular/material';
import { ModalsComponent } from '../modals.component';
import { MAT_DIALOG_DATA } from '@angular/material';
import { PasswordComponent } from '../shared/password/password.component';
import { SnackbarService, RpcService, RpcStateService } from 'app/core';

@Component({
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss']
})
export class ChangePasswordComponent {
  @ViewChild('passwordElement') passwordElement: PasswordComponent;

  // constants
  log: any = Log.create('change-password.component');

  public label: string;
  public buttonText: string;

  private oldPassword: string;
  private newPassword: string;
  private confPassword: string;

  public currentStep: number = 1;
  //1 - old password
  //2 - new password 
  //3 - confirmation

  constructor(
    public dialogRef: MatDialogRef<ModalsComponent>,
    private flashNotification: SnackbarService,
    private rpc: RpcService,
    private rpcState: RpcStateService,
    @Inject(MAT_DIALOG_DATA) public data: any  ) {
      this.initLabels();
  }

  back(): void {
    this.currentStep--;
    this.initLabels();
    this.passwordElement.clear();
  }

  initLabels(): void {
    if (this.currentStep === 3) {
      this.label = "Enter confirmation";
      this.buttonText = "Change";
    }

    if (this.currentStep === 2) {
      this.label = "Enter new password";
      this.buttonText = "Next";
    }

    if (this.currentStep === 1) {
      this.label = "Enter old password";
      this.buttonText = "Next";
    }
  }

  next(event: any): void {
    if (this.currentStep === 1) {
      this.oldPassword = event.password;
    }
    
    if (this.currentStep === 2) {
      this.newPassword = event.password;

      if (this.newPassword === this.oldPassword) {
        this.flashNotification.open('The old password and new password should be different.', 'err');
        return;
      }
    }

    if (this.currentStep === 3) {
      this.confPassword = event.password;

      if (this.confPassword !== this.newPassword) {
        this.flashNotification.open('The passwords do not match!', 'err');
      } else {
        this.rpcState.set('ui:spinner', true);

        this.rpc.call('walletpassphrasechange', [this.oldPassword, this.newPassword])
          .subscribe(_ => {
            this.rpcState.set('ui:spinner', false);
            this.flashNotification.open('Password successfully changed!');
            this.closeModal();
          }, err => {
            this.flashNotification.open('The wallet passphrase entered was incorrect.', 'err');
            this.log.er('walletpassphrasechange: ', err);
            this.rpcState.set('ui:spinner', false);
          });
      }
    }

    if (this.currentStep !== 3) {
      this.currentStep++;
      this.passwordElement.clear();
    }

    this.initLabels();
  }

  closeModal(): void {
    this.dialogRef.componentInstance.close();
  }
}
