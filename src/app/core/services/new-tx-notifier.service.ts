import { Injectable, OnDestroy } from '@angular/core';
import { Log } from 'ng2-logger';

import { NotificationService } from '../notification/notification.service';
import { RpcStateService } from 'app/core/rpc/rpc-state/rpc-state.service';

@Injectable()
export class NewTxNotifierService implements OnDestroy {

  log: any = Log.create(
    'new-tx-notifier.service id:' + Math.floor((Math.random() * 1000) + 1)
  );
  private destroyed: boolean = false;
  private lastTxId: string = undefined;

  constructor(
    private _rpcState: RpcStateService,
    private _notification: NotificationService,
    //private _transactionsService: TransactionsService
  ) {
    this._rpcState.observe('getwalletinfo', 'txcount')
      .takeWhile(() => !this.destroyed)
      .subscribe(txcount => {
        this.checkForNewTransaction();
      });
  }

  // TODO: trigger by ZMQ in the future
  checkForNewTransaction(): void {

    // this._transactionsService.getTransactions()
    //   .subscribe((txs: any) => {
    //     // if no transactions: stop
    //     if (txs.length === 0) {
    //       return;
    //     }

    //     // not initialized yet
    //     if (this.lastTxId === undefined) {
    //       this.lastTxId = txs[0].txid;
    //     } else {
    //       txs.some((tx) => {
    //         // we hit our last transaction, abort notifications
    //         if (this.lastTxId === tx.txid) {
    //           return true;
    //         }
    //         this.notifyNewTransaction(tx);
    //       })
    //       // update tip
    //       this.lastTxId = txs[0].txid;
    //     }
    //   });
  }

  private notifyNewTransaction(tx: any) {
    if (tx.category === 'receive') {
      this._notification.sendNotification(
        'Incoming transaction', tx.amount + ' DIVI received'
      );
    } else if (tx.category === 'stake') {
      this._notification.sendNotification(
        'New stake reward', tx.amount + ' DIVI received'
      );
    }
  }

  ngOnDestroy() {
    this.destroyed = true;
  }
}
