import { Component, OnInit, ViewChild } from '@angular/core';
import { TransactionsStateService } from '../../../core/services/transactions-state.service';

@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss']
})

export class HistoryComponent implements OnInit {

  @ViewChild('transactions') transactions: any;

  sortby: string = 'blocktime';
  sortdirection: string = 'desc';
  fromDate: Date = null;
  toDate: Date = null;

  sortFields: Array<any> = [
    { title: 'Sort by date', value: 'blocktime' },
    { title: 'Sort by amount', value: 'amount' },
    { title: 'Sort by category', value: 'category' }
  ];

  sortDirections: Array<any> = [
    { title: 'Ascending', value: 'asc' },
    { title: 'Descending', value: 'desc' }
  ];

  categories: Array<any> = [
    { title: 'All',                value: 'all'               },
    { title: 'Sent',               value: 'send'              },
    { title: 'Received',           value: 'receive'           },
    { title: 'Rewards',            value: 'mn_reward'         },
    { title: 'Lottery',            value: 'lottery'           },
    { title: 'Transfers',          value: 'move'              },
    { title: 'Allocated',          value: 'allocated'         },
    { title: 'Staked',             value: 'stake_reward'      },
    // { title: 'Balance Transfers',  value: 'internal_transfer' },
    // { title: 'Immature',         value: 'immature'          },
    // { title: 'Coinbase',         value: 'coinbase'          },
    // { title: 'Orphan',           value: 'orphan'            },
    // { title: 'Orphaned stake',   value: 'orphaned_stake'    },
  ];

  types: Array<any> = [
    { title: 'All types', value: 'all'      },
    { title: 'Standard',  value: 'standard' },
    { title: 'Anonymous', value: 'anon'     },
    { title: 'Blind',     value: 'blind'    },
  ];

  filters: any = {
    category: undefined,
    search:   undefined,
    sort:     undefined,
    sortDirection:     undefined,
    type:     undefined
  };

  public selectedTab: number = 0;

  constructor(public txService: TransactionsStateService) {
    this.default();
  }

  ngOnInit(): void {
    /* may be used if we concatenate some filters http://bit.ly/2Buav9B */
  }

  default(): void {
    this.selectedTab = 0;
    this.filters = {
      category: 'all',
      type:     'all',
      sort:     'blocktime',
      sortDirection: 'desc',
      search:   ''
    };
  }

  onDateChange(): void {
    this.filters.from = this.fromDate;
    this.filters.to = this.toDate;

    this.filter();
  }

  changeCategory(index: number): void {
    this.selectedTab = index;
    this.transactions.resetPagination(false);
    this.filters.category = this.categories[index].value;
    this.filter();
  }

  sortList(event: any): void {
    this.filters.sort = event.value;
    this.filter();
  }

  filter(): void {
    this.transactions.filter(this.filters);
  }

  sort(changed: string): void {
    if (changed === 'fld') {
      this.sortdirection = 'desc';
    }

    this.transactions.sort(this.sortby, this.sortdirection);
  }

  clear(): void {
    this.default();
    this.filter();
  }

  public onExportToCsvClick(): void {
    const dictionary = {};
    this.categories.forEach(c => dictionary[c.value] = c.title);
    this.transactions.export(dictionary);
  }
}
