import { Component, OnInit } from '@angular/core';
import { MatDialogRef, MatDialog } from '@angular/material';

import { RpcService, RpcStateService } from 'app/core';
import { ModalsService } from 'app/modals/modals.module';
import { WalletFixedConfirmationComponent } from './wallet-fixed-confirmation/wallet-fixed-confirmation.component';
import { AuthScopes } from 'app/core/models/auth-scopes.enum';

@Component({
  selector: 'app-fix-wallet-modal',
  templateUrl: './fix-wallet-modal.component.html',
  styleUrls: ['./fix-wallet-modal.component.scss']
})
export class FixWalletModalComponent implements OnInit {

  constructor(
    private _rpc: RpcService,
    private _modals: ModalsService,
    private dialogRef: MatDialogRef<FixWalletModalComponent>,
    private dialog: MatDialog
  ) { }

  ngOnInit() {
  }

  async fix(): Promise<void> {
    const isUnlocked = await this._modals.unlock(AuthScopes.FIX_WALLET);

    if (!isUnlocked) {
      return;
    }

    this.scanChain();
  }

  scanChain() {
    this._rpc.call('scanchain', [0]).subscribe(
      (result: any) => {
        this.dialog.open(WalletFixedConfirmationComponent);
      },
      (error: any) => {}
    )
  }

  dialogClose(): void {
    this.dialogRef.close();
  }
}
