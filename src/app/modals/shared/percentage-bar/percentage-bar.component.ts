import { Component, OnInit, Input } from '@angular/core';
import { Log } from 'ng2-logger';
import { MatDialog } from '@angular/material';

import { BlockStatusService, RpcStateService } from '../../../core/rpc/rpc.module';
import { DiviService } from '../../../core/services/divi.service';
import { RpcService, DaemonService } from '../../../core';
import { SnackbarService } from 'app/core/snackbar/snackbar.service';
import { DeleteConfirmationModalComponent } from '../../../wallet/shared/delete-confirmation-modal/delete-confirmation-modal.component';

@Component({
  selector: 'app-percentage-bar',
  templateUrl: './percentage-bar.component.html',
  styleUrls: ['./percentage-bar.component.scss']
})
export class PercentageBarComponent implements OnInit {

  private log: any = Log.create('app-percentage-bar.component');
  private stuckProgressTimeout: number = 5 * 60000; // 5 minutes
  private dialogsTimeout: number = 10000; // 10 sec
  private checkProgressTimeout: any;
  private isDialogOpened: boolean = false;
  private isDaemonStarted: boolean = false;
  private requireDaemonRestart: boolean = null;
  private requireDaemonRestartBlocksCount: number = 10;
  private destroyed: boolean = false;
  private connections: number = 1;

  @Input() sidebar: boolean = false;

  /* ui state */
  public initialized: boolean = false; // hide if no progress has been retrieved yet

  /* block state */
  public syncPercentage: number = 0;
  public syncString: string;

  constructor(
    private _blockStatusService: BlockStatusService,
    private dialog: MatDialog,
    private divi: DiviService,
    private rpc: RpcService,
    private rpcState: RpcStateService,
    private flashNotificationService: SnackbarService,
    private daemonService: DaemonService
  ) { }

  ngOnInit(): void {
    this.checkProgressTimeout = setTimeout(() => this.checkProgressIsStuck(0), this.stuckProgressTimeout);

    this._blockStatusService.statusUpdates.asObservable().subscribe(status => {
      clearTimeout(this.checkProgressTimeout);
      this.updateProgress(status);

      if (!this.isDaemonStarted) {
        return;
      }

      this.checkProgressTimeout = setTimeout(() => this.checkProgressIsStuck(status.syncPercentage), this.stuckProgressTimeout);
    });

    this.rpcState.observe(RpcStateService.DAEMON_STARTED_KEY)
      .subscribe(isDaemonStarted => {
        clearTimeout(this.checkProgressTimeout);
        this.isDaemonStarted = isDaemonStarted;
      });

    this.rpcState.observe('getnetworkinfo', 'connections')
      .takeWhile(() => !this.destroyed)
      .subscribe(connections => {
        this.connections = connections;
      });
  }

  updateProgress(status: any): void {
    this.initialized = true;
    
    if (this.requireDaemonRestart === null) {
      this.requireDaemonRestart = status.remainingBlocks > this.requireDaemonRestartBlocksCount;
    }

    this.syncPercentage = status.syncPercentage;
    if (this.syncPercentage === 100) {
      if (this.requireDaemonRestart) {
        this.flashNotificationService.open('Restarting daemon... Please wait 30 seconds for functionality to be restored to your wallet..');
        this.daemonService.restart().subscribe(_ => {}, err => this.log.er('updateProgress: daemon-restart:', err));
      }

      this.syncString = 'Fully synced';
      this.requireDaemonRestart = null;
    } else {
      this.syncString = `${this.syncPercentage.toFixed(2)} %`;
    }

    if (this.connections <= 0) {
      this.syncString = 'Not connected';
    }
  }

  showStuckProgressModal() {
    if (this.isDialogOpened) {
      return;
    }

    const dialogRef = this.dialog.open(DeleteConfirmationModalComponent);

    dialogRef.componentInstance.title = `Sync process is stuck`;
    dialogRef.componentInstance.message = `This seems to be taking longer than expected, would you like to retry?`;
    dialogRef.componentInstance.dialogContent = ` `;
    dialogRef.componentInstance.deleteButtonContent = `Yes`;

    dialogRef.componentInstance.onDelete.subscribe(() => {
      this.removeBlockData();
    });

    dialogRef.afterOpen().subscribe(_ => {
      this.isDialogOpened = true;
    });

    dialogRef.afterClosed().subscribe(_ => {
      const timeout = setTimeout(_ => {
        this.isDialogOpened = false;
        clearTimeout(timeout);
      }, this.dialogsTimeout);
    });
  }

  checkProgressIsStuck(currentProgress) {
    if ((currentProgress === 0) || (this.syncPercentage === currentProgress && this.syncPercentage !== 100)) {
      this.showStuckProgressModal();
    }
  }

  removeBlockData() {
    clearTimeout(this.checkProgressTimeout);
    this.flashNotificationService.open('Preparing to remove blocks data. This may take some time.');
    this.daemonService.stop().subscribe(() => {
      this.divi.call('remove-blocks')
        .subscribe(() => {
          this.divi.call('remove-chainstate')
            .subscribe(() => {
              this.restartDaemon();
            }, err => this.log.er('removeBlockData: remove-chainstate:', err));
        }, err => this.log.er('removeBlockData: remove-blocks:', err));
    }, err => this.log.er('removeBlockData: daemon-stop:', err));
  }

  restartDaemon() {
    this.flashNotificationService.open('Restarting daemon. Please wait 30 seconds before performing any other actions in the wallet.');
    this.daemonService.restart().subscribe(() => { }, err => this.log.er('resetDaemon:', err));
  }

  ngOnDestroy() {
    this.destroyed = true;
  }
}
