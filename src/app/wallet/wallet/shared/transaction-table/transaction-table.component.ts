import { Component, OnInit, Input, ViewChild, OnDestroy } from '@angular/core';
import { PageEvent } from '@angular/material';
import { Log } from 'ng2-logger'

import { Transaction } from '../transaction.model';
import { TransactionsStateService } from '../transactions-state.service';
import { BlockStatusService, ExportService, RpcService, RpcStateService } from '../../../../core';
import { DateFormatter } from 'app/core/util/utils';
import { ExportField } from 'app/core/models/export-field';

@Component({
  selector: 'transaction-table',
  templateUrl: './transaction-table.component.html',
  styleUrls: ['./transaction-table.component.scss']
})

export class TransactionsTableComponent implements OnInit, OnDestroy {
  private destroyed: boolean = false;
  public walletInitialized: boolean = true;
  @Input() display: any;
  @ViewChild('paginator') paginator: any;

  /* Determines what fields are displayed in the Transaction Table. */
  /* header and utils */
  private _defaults: any = {
    header: true,
    internalHeader: false,
    pagination: false,
    txDisplayAmount: 10,
    category: true,
    date: true,
    amount: true,
    confirmations: true,
    txid: false,
    senderAddress: true,
    receiverAddress: true,
    comment: true,
    blockHash: false,
    blockIndex: false,
    expand: false
  };

  /*
    This shows the expanded table for a specific unique identifier = (tx.txid + tx.getAmountObject().getAmount() + tx.category).
    If the unique identifier is present, then the details will be expanded.
  */
  private expandedTransactionID: string = undefined;
  pageEvent: PageEvent; /* MatPaginator output */
  log: any = Log.create('transaction-table.component');

  constructor(
    public txService: TransactionsStateService,
    public blockStatusService: BlockStatusService,
    private exportService: ExportService,
    private rpcState: RpcStateService
  ) {
  }

  ngOnInit(): void {
    this.display = Object.assign({}, this._defaults, this.display); // Set defaults
    this.txService.postConstructor(this.display.txDisplayAmount);

    this.rpcState.observe('ui:walletInitialized')
    .takeWhile(() => !this.destroyed)
    .subscribe(status => this.walletInitialized = status);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
  }

  public sort(fld: string): void {
    this.txService.sort(fld);
  }

  public filter(filters: any) {
    if (this.inSearchMode(filters.search)) {
      this.resetPagination(false);
    }
    this.txService.filter(filters);
  }

  public pageChanged(event: any): void {
    this.txService.MAX_TXS_PER_PAGE = event.pageSize;
    // increase page index because its start from 0
    this.txService.changePage(event.pageIndex++);
  }

  private inSearchMode(query: any): boolean {
    return (query !== undefined && query !== '');
  }

  public showExpandedTransactionDetail(tx: Transaction): void {
    const txid: string = tx.txid;
    if (this.expandedTransactionID === txid) {
      this.expandedTransactionID = undefined;
    } else {
      this.expandedTransactionID = txid;
    }
  }

  public expandPanel(matExpansionPanel: any, event: Event): void {
    event.stopPropagation(); // Preventing event bubbling
    matExpansionPanel.toggle();
  }

  public resetPagination(reload: boolean): void {
    if (this.paginator) {
      this.paginator.resetPagination(0)
      this.txService.changePage(0, reload);
    }
  }

  public goToDiviScan(txid: string): void {
    window.open(`https://diviscan.io/tx/${txid}`, '_blank')
  }

  public export(categories: any): void {
    this.txService.getTransactions({
      count: 10000,
      skip: 0
    }, this.txService.filters).subscribe((result) => {
      this.exportService.exportToCsv([
        new ExportField("Date of tx", (r, f) => DateFormatter.format(r.displayInfo.date) || new Date()),
        new ExportField("Type of tx", (r, f) => categories[r.category]),
        new ExportField("Account name", (r, f) => r.displayInfo.account),
        new ExportField("Address(es) of tx", (r, f) => r.displayInfo.address),
        new ExportField("Amount of tx", (r, f) => r.displayInfo.amount),
        new ExportField("TxID", (r, f) => r.txid)
      ], result.transactions, "transactions.csv");
    });
  }
}
