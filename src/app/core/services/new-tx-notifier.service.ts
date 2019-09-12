import { Injectable, OnDestroy } from '@angular/core';
import { Log } from 'ng2-logger';

import { NotificationService } from '../notification/notification.service';
import { RpcStateService } from 'app/core/rpc/rpc-state/rpc-state.service';
import { NotificationType } from '../models';
import { TransactionsService } from './transactions.service';

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
    private _transactionsService: TransactionsService
  ) {
    this._rpcState.observe('getwalletinfo', 'txcount')
      .takeWhile(() => !this.destroyed)
      .subscribe(txcount => this.checkForNewTransaction());

      this._rpcState.observe('ui:walletInitialized')
      .take(1)
      .subscribe(txcount => this.checkForNewTransaction());
  }

  checkForNewTransaction(): void {
    this._transactionsService.getTransactions()
      .subscribe((txs: any) => {
        const orderedTxs = [...txs].sort((a: any, b: any) => a.confirmations - b.confirmations);

        // if no transactions: stop
        if (orderedTxs.length === 0) {
          return;
        }

        // not initialized yet
        if (this.lastTxId === undefined) {
          this.lastTxId = orderedTxs[0].txid;
        } else {
          orderedTxs.some((tx) => {
            // we hit our last transaction, abort notifications
            if (this.lastTxId === tx.txid) {
              return true;
            }
            this.notifyNewTransaction(tx);
          });
          // update tip
          this.lastTxId = orderedTxs[0].txid;
        }
      });
  }

  private notifyNewTransaction(tx: any) {
    if (tx.category === 'receive') {
      this._notification.sendNotification(
        NotificationType.IncomingTransaction,
        {
          title: 'Incoming transaction',
          desc: Math.abs(tx.amount) + ' DIVI received'
        }
      );
    } else if (tx.category === 'stake_reward') {
      this._notification.sendNotification(
        NotificationType.IncomingReward,
        {
          title: 'New stake reward',
          desc: Math.abs(tx.amount) + ' DIVI received',
          customSound: 'caching'
        }
      );
    } else if (tx.category === 'send') {
      this._notification.sendNotification(
        NotificationType.TransactionSentSuccessfully,
        {
          title: 'Transaction sent successfully',
          desc: Math.abs(tx.amount) + ' DIVI sent',
          customSound: 'caching'
        }
      );
    } else if (tx.category === 'mn_reward') {
      this._notification.sendNotification(
        NotificationType.TransactionSentSuccessfully,
        {
          title: 'New masternode reward',
          desc: Math.abs(tx.amount) + ' DIVI received'
        }
      );
    }
  }

  ngOnDestroy() {
    this.destroyed = true;
  }
}
