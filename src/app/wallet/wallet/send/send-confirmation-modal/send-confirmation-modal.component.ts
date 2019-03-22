import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MatDialogRef } from '@angular/material';

import { SendService } from '../send.service';

import { Amount, Fee } from '../../../../core/util/utils';
import { TransactionBuilder } from '../transaction-builder.model';
import { DiviService } from 'app/core/services/divi.service';

@Component({
  selector: 'app-send-confirmation-modal',
  templateUrl: './send-confirmation-modal.component.html',
  styleUrls: ['./send-confirmation-modal.component.scss']
})
export class SendConfirmationModalComponent implements OnInit {

  @Output() onConfirm: EventEmitter<string> = new EventEmitter<string>();

  public dialogContent: string;
  public send: TransactionBuilder;

  // send-confirmation-modal variables
  transactionType: string = '';
  currency: string = '';
  sendAmount: Amount = new Amount(0);
  diviAmount: Amount = new Amount(0);
  sendAddress: string = '';
  receiverName: string = '';
  transactionAmount: Fee = new Fee(0);

  constructor(private dialogRef: MatDialogRef<SendConfirmationModalComponent>,
              private sendService: SendService,
              private diviService: DiviService) {
  }

  ngOnInit() {

    this.diviService.getDiviPrices()
      .subscribe(prices => {
        this.setDetails(prices);
      });
  }

  confirm(): void {
    this.onConfirm.emit();
    this.dialogClose();
  }

  dialogClose(): void {
    this.dialogRef.close();
  }

  /**
    * Set the confirmation modal data
    */
  setDetails(prices: any): void {
    this.getTransactionFee();

    this.sendAddress = this.send.toAddress;
    this.transactionType = this.send.input;
    this.sendAmount = new Amount(this.send.amount);
    this.diviAmount = new Amount(this.send.getDiviAmount(prices));
    this.receiverName = this.send.toLabel;
    this.currency = this.send.getCurrency().toUpperCase();
  }

  getTransactionFee() {
    this.transactionAmount = new Fee(this.sendService.getTransactionFee());
  }

}
