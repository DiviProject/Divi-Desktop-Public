import { Component, OnInit, OnDestroy } from '@angular/core';
import { RpcStateService, DaemonService } from '../../core';
import { TransactionsStateService } from '../../core/services/transactions-state.service';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss'],
})
export class OverviewComponent implements OnInit, OnDestroy {
  testnet: boolean = false;
  destroyed: boolean = false;
  walletInited: boolean = false;
  walletLoadingStatus: string = "Loading wallet...";
  constructor(
    private rpcState: RpcStateService,
    private txService: TransactionsStateService,
    private daemonService: DaemonService
    ) { }

  ngOnInit() {
    // check if testnet -> Show/Hide Anon Balance
    this.rpcState.observe('getblockchaininfo', 'chain').take(1)
     .subscribe(chain => this.testnet = chain === 'test');

    this.initWalletStatus();
    this.initTransactions();
  }

  ngOnDestroy() {
    this.destroyed = true;
  }

  initTransactions(): void {
    this.txService.MAX_TXS_PER_PAGE = 5;
    this.txService.changePage(0, false);
    this.txService.filter({
      category: 'all',
      type:     'all',
      sort:     'blocktime',
      search:   ''
    });
  }

  initWalletStatus(): void {
    this.daemonService.state
      .takeWhile(_ => !this.destroyed)
      .subscribe(state => {
        this.walletInited = state.isFullyLoaded;
        this.walletLoadingStatus = state.isWalletLoading ? state.errorMessage : '';

        if (state.isWalletLoading) {
          this.initTransactions();
        }
      });
  }
}
