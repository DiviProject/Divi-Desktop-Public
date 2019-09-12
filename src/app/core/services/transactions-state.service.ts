import { Injectable, OnDestroy } from '@angular/core';
import { Log } from 'ng2-logger'
import * as _ from 'lodash'
import { Transaction } from '../../wallet/wallet/shared/transaction.model';

import { RpcStateService, BlockStatusService, TransactionsService, AppSettingsService, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '..';
import { Observable } from 'rxjs';

const DAY_IN_SECONDS = 24 * 60 * 60;

@Injectable()
export class TransactionsStateService implements OnDestroy {

  log: any = Log.create('transaction.service id:' + Math.floor((Math.random() * 1000) + 1));
  private destroyed: boolean = false;
  private listeningForUpdates: boolean = false;

  /* Stores transactions objects. */
  txs: Transaction[] = [];

  /* Pagination stuff */
  txCount: number = 0;
  currentPage: number = 0;
  totalPageCount: number = 0;
  syncSub: any = null;

  filters: any = {
    watchonly: undefined,
    category: undefined,
    search: undefined,
    type: undefined,
    sort: undefined,
    sortDirection: undefined
  };

  /* states */
  loading: boolean = true;
  testnet: boolean = false;
  alreadyRetryingLoadTx: boolean = false;

  /* How many transactions do we display per page and keep in memory at all times.
     When loading more transactions they are fetched JIT and added to txs. */
  MAX_TXS_PER_PAGE: number = DEFAULT_PAGE_SIZE;
  PAGE_SIZE_OPTIONS: Array<number> = PAGE_SIZE_OPTIONS;

  constructor(
    private rpcState: RpcStateService,
    private blockStatusService: BlockStatusService,
    private transactionsService: TransactionsService,
    private appSettingsService: AppSettingsService
  ) {
    this.syncSub = this.blockStatusService.isFullSynced.subscribe(_ => {
      if (!!this.syncSub) {
        this.syncSub.unsubscribe();
        return;
      }

      this.loadTransactions();
    });
  }

  ngOnDestroy() {
    this.destroyed = true;
  }

  postConstructor(MAX_TXS_PER_PAGE: number): void {
    this.MAX_TXS_PER_PAGE = MAX_TXS_PER_PAGE;

    // load the first transactions
    this.loadTransactions();

    // register the updates, every block / tx!
    this.registerUpdates();
    this.listeningForUpdates = true;
  }

  registerUpdates(): void {

    // prevent multiple listeners
    if (this.listeningForUpdates) {
      return;
    }

    // It doesn't get called sometimes ?
    // this.rpc.state.observe('blocks').throttle(val => Observable.interval(30000/*ms*/)).subscribe(block =>  {
    this.rpcState.observe('getblockchaininfo', 'blocks')
      .takeWhile(() => !this.destroyed)
      .distinctUntilChanged() // only update when blocks changes
      .skip(1) // skip the first one (shareReplay)
      .debounceTime(30 * 1000/*ms*/)
      .subscribe(block => {
        this.loadTransactions();
      });

    this.rpcState.observe('getwalletinfo', 'txcount')
      .takeWhile(() => !this.destroyed)
      .distinctUntilChanged() // only update when txcount changes
      .skip(1) // skip the first one (shareReplay)
      .subscribe(txcount => {
        this.loadTransactions();
      });

    this.rpcState.observe('ui:walletInitialized')
      .takeWhile(() => !this.destroyed)
      .distinctUntilChanged()
      .subscribe(status => {
        if (!status) {
          return;
        }
        this.loadTransactions();
      });

      this.appSettingsService.onNetChangeObs
        .takeWhile(() => !this.destroyed)
        .subscribe(_ => this.loadTransactions());

    /* check if testnet -> block explorer url */
    this.rpcState.observe('getblockchaininfo', 'chain').take(1)
      .subscribe(chain => this.testnet = chain === 'test');
  }

  filter(filters: any, reload: boolean = true): void {
    this.filters = filters;

    if (reload) {
      this.loadTransactions();
    }
  }

  changePage(page: number, reload: boolean = true): void {
    if (page < 0) {
      return;
    }

    this.currentPage = page;

    if (reload) {
      this.loadTransactions();
    }
  }

  sort(fld: string, dir: string, reload: boolean = true): void {
    this.filters.sort = fld;
    this.filters.sortDirection = dir;

    if (reload) {
      this.loadTransactions();
    }
  }

  getTransactions(paginationParams: any, filters: any): Observable<any> {
    const options = {
      ...filters,
      ...paginationParams
    }

    return Observable.create(obs => {
      this.transactionsService.getTransactions().subscribe(transactions => {
        const filtered = this.applyFilters([options], transactions);
        const newTxs: Array<any> = filtered.items.map(tx => new Transaction(tx));

        obs.next({
          transactions: newTxs,
          total: filtered.total
        });
        obs.complete();
      }, err => obs.error(err));
    });
  }

  /** Load transactions over RPC, then parse JSON and call addTransaction to add them to txs array. */
  loadTransactions(): void {
    this.loading = true;

    const options = {
      'count': +this.MAX_TXS_PER_PAGE,
      'skip': +this.MAX_TXS_PER_PAGE * this.currentPage,
    };

    this.getTransactions(options, this.filters).subscribe(result => {
        this.txs = result.transactions;
        this.txCount = result.total;

        this.loading = false;
        this.alreadyRetryingLoadTx = false;
    }, (error) => this.loadTransactionsFailed(error));
  }

  loadTransactionsFailed(error): void {
    this.retryLoadTransaction();
  }

  private applyFilters(params: any[], transactions: any[] = []): any {
    const result = {
      total: 0,
      items: []
    };

    const query = params[0];

    if (!query) {
      return result;
    }

    transactions = transactions.filter(t => {
      if (t.confirmations < 0) {
        return false;
      }

      if (query.category && query.category !== 'all' && t.category !== query.category) {
        return false;
      }

      return true;
    });

    if (!query.sort) {
      query.sort = 'blocktime';
    }

    query.sortDirection = query.sortDirection || "desc";
    transactions = transactions.filter(t =>
      (!query.from || t.blocktime >= (query.from.getTime() / 1000))
      && (!query.to || t.blocktime < (query.to.getTime() / 1000) + DAY_IN_SECONDS));

    transactions = _.orderBy(transactions, [query.sort], [query.sortDirection]);

    result.total = transactions.length;
    result.items = transactions.slice(query.skip, query.skip + query.count);

    return result;
  }

  // TODO: remove shitty hack
  // When the transaction
  retryLoadTransaction() {
    if (this.alreadyRetryingLoadTx || this.destroyed) {
      return; // abort
    }

    setTimeout(this.loadTransactions.bind(this), 1000);
  }

}
