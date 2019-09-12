import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MatDialogRef } from '@angular/material';

import { SendService } from '../send.service';

import { Amount, Fee } from '../../../../core/util/utils';
import { TransactionBuilder } from '../transaction-builder.model';
import { Log } from 'ng2-logger';
import { PriceService } from 'app/core/services/price.service';
import { ExchangeType } from 'app/core/models/exchange-type.enum';
import { SettingsService } from 'app/core';

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

  private log: any = Log.create('send-confirmation.modal');

  constructor(private dialogRef: MatDialogRef<SendConfirmationModalComponent>,
              private sendService: SendService,
              private priceService: PriceService,
              private settingsService: SettingsService) {
  }

  async ngOnInit(): Promise<void> {
    const prices = await this.priceService.getPrices();
    const settings = this.settingsService.loadSettings();
    this.setDetails(prices[settings.display.exchanges[0]]);
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
