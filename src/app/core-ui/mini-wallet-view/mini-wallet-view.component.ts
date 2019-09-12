import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { SettingsService } from 'app/core/services/settings.service';
import { RpcStateService, BlockStatusService } from 'app/core/rpc/rpc.module';
import { DaemonService } from 'app/core/daemon/daemon.service';
import { BalanceService } from 'app/core/services/balance.service';
import { TransactionsStateService } from 'app/core/services/transactions-state.service';
import { FullBalanceInfo } from 'app/core/models/full-balance-info';

const TX_COUNT = 10;

@Component({
  selector: 'app-mini-wallet-view',
  templateUrl: './mini-wallet-view.component.html',
  styleUrls: ['./mini-wallet-view.component.scss']
})
export class MiniWalletViewComponent implements OnInit, OnDestroy {
  constructor(
    private settingsService: SettingsService,
    private rpcState: RpcStateService,
    private daemonService: DaemonService,
    private balanaceService: BalanceService,
    public blockStatusService: BlockStatusService,
    public txService: TransactionsStateService
    ) {
  }

  @HostListener('window:keydown', ['$event'])
  keyDownEvent(event: any) {
    if (event.metaKey && event.keyCode === 86 && navigator.platform.indexOf('Mac') > -1) {
      document.execCommand('Paste');
      event.preventDefault();
    }
  }

  public onExitClick(): void {
    const settings = this.settingsService.loadSettings();
    settings.main.minimode = false;
    this.settingsService.applySettings(settings);
  }

  public balance: FullBalanceInfo = new FullBalanceInfo();
  public peersCount: number = 0;
  public encryptionStatus: string = '';
  public stakingDescription: string = '';
  public stakingEnabled: boolean = false;

  destroyed: boolean = false;
  walletInited: boolean = false;

  ngOnInit() {
    this.daemonService.init();

    this.initWalletStatus();
    this.initBalance();
    this.initTransactions();

    this.rpcState.observe('getnetworkinfo', 'connections')
      .takeWhile(() => !this.destroyed)
      .subscribe(connections => this.peersCount = connections);

    this.rpcState.observe('getwalletinfo', 'encryptionstatus')
      .takeWhile(() => !this.destroyed)
      .subscribe(encryptionstatus => {
        this.encryptionStatus = encryptionstatus;
      });

    this.rpcState.observe('getstakinginfo')
      .takeWhile(() => !this.destroyed)
      .subscribe(status => {
        if (!!status) {
          const props = Object.keys(status);

          this.stakingEnabled = props.filter(p => !!status[p]).length === props.length;
          this.stakingDescription = this.getStakingDescription(status);
        }
      });
  }

  ngOnDestroy() {
    this.destroyed = true;
  }

  getStakingDescription(status: any) {
    if (this.stakingEnabled) {
      return 'Staking enabled';
    } else if (!status['enoughcoins']) {
      return 'Not enough coins';
    } else if (!status['mintablecoins']) {
      return 'Coins maturing';
    } else if (!status['walletunlocked']) {
      return 'Please unlock wallet';
    } else if (!status['mnsync']) {
      return 'Syncing';
    } else if (!status['staking status']) {
      return 'Please restart client';
    }

    return 'Syncing';
  }

  initWalletStatus(): void {
    this.daemonService.state
      .takeWhile(_ => !this.destroyed)
      .subscribe(state => {
        this.walletInited = state.isFullyLoaded;

        if (state.isFullyLoaded) {
          this.initTransactions();
        }
      });
  }

  initBalance(): void {
    this.balanaceService.balance
      .takeWhile(() => !this.destroyed)
      .subscribe((fullBalance: FullBalanceInfo) => {
        this.balance = fullBalance;
      });

    this.rpcState.stateCall('getwalletinfo');
  }

  initTransactions(): void {
    this.txService.MAX_TXS_PER_PAGE = TX_COUNT;
    this.txService.changePage(0);
    this.txService.filter({
      category: 'all',
      type: 'all',
      sort: 'blocktime',
      search: ''
    });
  }
}
