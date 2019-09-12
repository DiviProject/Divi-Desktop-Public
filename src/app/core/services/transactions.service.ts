import { Injectable, OnDestroy } from '@angular/core';
import * as _ from 'lodash'

import { Observable } from 'rxjs';
import { share } from 'rxjs/operators';
import { RpcService, RpcStateService } from '../rpc/rpc.module';
import { CacheService } from '../cache/cache.service';
import { LocalStorage } from './local-storage.service';
import { AppSettingsService } from './app-settings.service';
import { DaemonService } from '../daemon/daemon.service';
import { Log } from 'ng2-logger';

const TRANSACTIONS_CACHE_KEY				= "TRANSACTIONS_CACHE";
const TRANSACTIONS_CACHE_KEY_PER_NETWORK	= (net: string) => `TRANSACTIONS_${net}`;
const TRANSACTIONS_CACHE_EXPIRATION			= ( 60 * 1 );
const LIST_TRANSACTIONS_DELAY				= ( 5 * 1000 );

@Injectable()
export class TransactionsService implements OnDestroy {
  private destroyed: boolean = false;
  private net: string = null;
  private shareObservable: any = null;
  private log: any = Log.create('transaction.service');

  constructor(
    private rpc: RpcService,
    private rpcState: RpcStateService,
    private cacheService: CacheService,
    private localStorage: LocalStorage,
    private appSettingsService: AppSettingsService,
    private daemonService: DaemonService
  ) {
    this.rpcState.observe('getwalletinfo', 'txcount')
      .takeWhile(() => !this.destroyed)
      .subscribe(txcount => {
        this.invalidate();
      });

    this.appSettingsService.onNetChangeObs
      .takeWhile(() => !this.destroyed)
      .subscribe(net => this.net = net);

    this.daemonService.state
      .takeWhile(() => !this.destroyed)
      .subscribe(state => {
        if (state.isWalletLoading) {
          this.localStorage.set(TRANSACTIONS_CACHE_KEY_PER_NETWORK(this.net), []);
        }
      });    
  }

  ngOnDestroy() {
    this.destroyed = true;
  }

  public getTransactions(): Observable<any[]> {
    const cachedTransactions = this.cacheService.get(TRANSACTIONS_CACHE_KEY);
    
    if (!!cachedTransactions) {
      return Observable.of(cachedTransactions);
    }

    if (!!this.shareObservable) {
      return this.shareObservable;
    }

    return this.shareObservable = Observable.create(obs => {
      this.rpc.call('listtransactions', ['*', 100000, 0])
      .subscribe((transactions) => { 
        transactions = transactions.filter(t => t.category !== 'move' || (t.category === 'move' && !!t.addresses));
        const moveTransactions = transactions.filter(t => t.category === 'move');
        moveTransactions.forEach(t => {
          const to = t.addresses[0] || {};
          t.account = to.account;
          t.address = to.address;
        });

        this.cacheService.set(TRANSACTIONS_CACHE_KEY, transactions, TRANSACTIONS_CACHE_EXPIRATION);
        const lastTransactions = transactions.sort((a, b) => a.time < b.time ? 1 : -1).slice(0, 1000);
        this.localStorage.set(TRANSACTIONS_CACHE_KEY_PER_NETWORK(this.net), lastTransactions);
        obs.next(transactions);
        obs.complete();
        setTimeout(_ => this.shareObservable = null, LIST_TRANSACTIONS_DELAY);
      }, err => {
        this.log.er('getTransactions: ', err);
        this.shareObservable = null;
        // when daemon not started
        const transactions = this.localStorage.get(TRANSACTIONS_CACHE_KEY_PER_NETWORK(this.net));
        obs.next(transactions || []);
        obs.complete();
      });
    }).pipe(share());
  }

  public invalidate(): void {
    this.cacheService.clear(TRANSACTIONS_CACHE_KEY);
  }

  public combineUtxos(whenCombined?: (txCount: number) => void): void {
    const chunkSize: number = 99; // If not using chunk the core hangs with large amount of UTXOs

    this.rpc.call('listunspent').subscribe(txs => {
      if (txs.length > 1) {
        var chunkObs = [];

        _.each(_.chunk(txs, chunkSize), chunk => {
          chunkObs.push(this.combineUtxoChunk(chunk));
        });

        Observable.forkJoin(chunkObs).subscribe(results => {
          if (whenCombined) {
            whenCombined(_.sum(results));
          }
        }, err => this.log.er('combineUtxos: forkJoin:', err));
      }
    }, err => this.log.er('combineUtxos: listunspent:',err));
  }

  private combineUtxoChunk(txs: any[]): Observable<number> {
    let utxoTx = { transactions: [], addresses: [] };

    return Observable.create(obs => {
      let amount: number = 0;

      _.each(txs, tx => {
        const utxo = { 'txid': tx.txid, 'vout': tx.vout };

        utxoTx.transactions.push(utxo);
        amount += tx.amount;
      });

      this.rpc.call('getaccountaddress', ['']).subscribe(address => {
        const addr = '{"' + address + '":' + amount + "}";

        utxoTx.addresses.push(JSON.parse(addr));

        this.rpc.call('createrawtransaction', [utxoTx.transactions, utxoTx.addresses[0]]).subscribe(hex => {
          this.rpc.call('signrawtransaction', [hex]).subscribe(signedHex => {
            this.rpc.call('sendrawtransaction', [signedHex.hex, true]).subscribe(() => {
              obs.next(txs.length);
              obs.complete();
            }, (err) => { obs.error(err) });
          }, (err) => { obs.error(err) });
        }, (err) => { obs.error(err) });
      });
    });
  }
}
