import { Component, OnDestroy } from '@angular/core';

import { RpcStateService, BlockStatusService } from '../../core';

import { Log } from 'ng2-logger';

@Component({
  selector: 'app-syncing',
  templateUrl: './syncing.component.html',
  styleUrls: ['./syncing.component.scss']
})
export class SyncingComponent implements OnDestroy {

  log: any = Log.create('syncing.component');
  private destroyed: boolean = false;

  remainder: any;
  lastBlockTime: Date;
  increasePerMinute: string;
  estimatedTimeLeft: string;
  manuallyOpened: boolean;
  syncPercentage: number;
  nPeers: number;

  /* modal stuff */
  alreadyClosedOnce: boolean = false;


  constructor(
    private _blockStatusService: BlockStatusService,
    private _rpcState: RpcStateService
  ) {
    _rpcState.observe('getnetworkinfo', 'connections')
      .takeWhile(() => !this.destroyed)
      .subscribe(connections => this.nPeers = connections);

    this._blockStatusService.statusUpdates.asObservable().subscribe(status => {

      this.remainder = status.remainingBlocks < 0
        ? 'waiting for peers...'
        : status.remainingBlocks;

      this.increasePerMinute = status.syncPercentage === 100
        ? 'DONE'
        : status.syncPercentage.toFixed(2).toString() + ' %';

      this.estimatedTimeLeft = status.syncPercentage === 100
        ? 'DONE'
        : status.estimatedTimeLeft;

      this.manuallyOpened = status.manuallyOpened;
      this.syncPercentage = status.syncPercentage;

      if (status.syncPercentage === 100 && !this.manuallyOpened) {
        this.closeOnceHackishly();
      }
    });

    this._blockStatusService.getLastBlockTimeStamp((timeStamp: number) => {
      this.lastBlockTime = new Date(timeStamp * 1000);
    });
  }

  closeOnceHackishly() {
    if (!this.alreadyClosedOnce) {
        document.body.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        this.alreadyClosedOnce = true;
      }
  }

  ngOnDestroy() {
    this.destroyed = true;
  }
}
