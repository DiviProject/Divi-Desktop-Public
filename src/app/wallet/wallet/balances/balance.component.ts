import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { BlockStatusService, BalanceService } from '../../../core';

import { FullBalanceInfo } from '../../../core/models/full-balance-info';

@Component({
  selector: 'app-balance',
  templateUrl: './balance.component.html',
  styleUrls: ['./balance.component.scss']
})
export class BalanceComponent implements OnInit, OnDestroy {

  @Input() type: string; // "total_balance", "anon_balance", "balance", "staked_balance", "blind_balance"
  @Input() public types: string[] = ['total', 'spendable', 'unconfirmed', 'immature'];
  @Input() public tooltips: any = {};

  private destroyed: boolean = false;

  public balance: FullBalanceInfo = new FullBalanceInfo();

  constructor(
    public blockStatusService: BlockStatusService,
    private balanaceService: BalanceService
  ) { }

  ngOnInit() {
    this.balanaceService.balance
      .takeWhile(() => !this.destroyed)
      .subscribe((fullBalance: FullBalanceInfo) => {
        this.balance = fullBalance;
      });
  }

  /* UI */
  getTypeOfBalance(): string {

    switch (this.type) {
      // total_balance
      case 'balance':
        return 'TOTAL BALANCE';
      case 'balance':
        return 'PUBLIC BALANCE';
      case 'anon_balance':
        return 'PRIVATE BALANCE';
      case 'blind_balance':
        return 'BLIND BALANCE';
      case 'staked_balance':
        return 'STAKE';
      case 'fiat_balance':
        return 'USD BALANCE'
    }

    return this.type;
  }

  isVisible(type: string): boolean {
    return this.types.indexOf(type) > -1;
  }

  ngOnDestroy() {
    this.destroyed = true;
  }
}
