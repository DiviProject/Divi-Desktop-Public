import { Component, Inject } from '@angular/core';
import { ModalsComponent } from '../modals.component';
import { TransactionsService } from "../../core/services/transactions.service";

import { SnackbarService } from '../../core/snackbar/snackbar.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';

@Component({
  selector: 'app-combine-utxo',
  templateUrl: './combine-utxo.component.html',
  styleUrls: ['./combine-utxo.component.scss']
})

export class CombineUtxoComponent {
  private callback: Function = null;
  constructor(
    public dialogRef: MatDialogRef<ModalsComponent>,
    public transactionService: TransactionsService,
    private flashNotification: SnackbarService,
    @Inject(MAT_DIALOG_DATA) data: any,
  ) {
    this.callback = data.data.callback;
  }

  async ngOnInit() {
  }

  async combine(): Promise<void> {
    this.transactionService.combineUtxos(txCount => {
      this.flashNotification.open(`${txCount} were combined to create a larger spendable output.`, 'warn');
      if (!!this.callback) {
        this.callback(true);
      }
      this.close();
    });
  }

  close(): void {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    if (!!this.callback) {
      this.callback(false);
    }
  }
}
