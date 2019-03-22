import { Component, Inject, forwardRef } from '@angular/core';

import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { ModalsComponent } from '../modals.component';
import { ModalsService } from '../modals.service';

@Component({
  templateUrl: './wallet-verify-result.component.html',
  styleUrls: ['./wallet-verify-result.component.scss']
})
export class WalletVerifyResultComponent  {
  public verified: boolean;

  constructor(
    @Inject(forwardRef(() => ModalsService))
    private _modalsService: ModalsService,
    public dialogRef: MatDialogRef<ModalsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.verified = this.data.verified;
  }

  restore(): void {
    this.close();
    this._modalsService.open('createWallet', { data: { step: 4, disableBack: true, isRestore: true }, forceOpen: true });
  }
 
  close(): void {
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  }
}
