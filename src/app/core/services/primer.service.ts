import { Injectable, EventEmitter } from '@angular/core';
import { RpcService, BlockStatusService, RpcStateService } from '../rpc/rpc.module';
import { DaemonService } from '../daemon/daemon.service';
import { BehaviorSubject } from 'rxjs';
import { InvocationService } from './invocation.service';
import { SettingsService } from './settings.service';

@Injectable()
export class PrimerService {
  public isInProgressSub: BehaviorSubject<boolean> = new BehaviorSubject(false);
  public isErrorSub: BehaviorSubject<boolean> = new BehaviorSubject(false);
  public enableAbandon: BehaviorSubject<boolean> = new BehaviorSubject(false);
  public historyLogs: Array<string> = [];
  public onAutoRestore: EventEmitter<void> = new EventEmitter();
  public onSuccess: EventEmitter<void> = new EventEmitter();

  private lastRestore: Date = new Date(1900, 1, 1);
  private isAbandoned: boolean = false;

  constructor(
    private rpc: RpcService,
    private rpcState: RpcStateService,
    private daemonService: DaemonService,
    private invocationService: InvocationService,
    private settingsService: SettingsService,
    private blockStatusService: BlockStatusService
  ) {
  }

  public init(): void {
    window.ipc.on('primer', async (event, eventType, eventData) => {
      try {
        if (!this.isAbandoned) {
          await this.prepareEvent(eventType, eventData);
        }
      } catch (e) {
        this.onError(e);
      }
    });

    this.blockStatusService.statusUpdates.asObservable().subscribe(status => {
      const settings = this.settingsService.loadSettings();
      const isInited = !!this.rpcState.get(RpcStateService.WALLET_INITIALIZED_KEY);

      const nextValidRestore = new Date(this.lastRestore.getTime() + 60 * 1000 /* 1 mins */);
      if (nextValidRestore > new Date()) {
        return;
      }

      if (!isInited || !settings.main.primer) {
        return;
      }

      if (status.syncPercentage > 0 && status.syncPercentage < 70) {
        this.restore(false, true);
      }
    });
  }

  private async onError(e: any): Promise<void> {
    this.isInProgressSub.next(false);
    this.enableAbandon.next(false);
    this.isErrorSub.next(true);
    this.historyLogs.push('Error in primer. ');
    await (this.daemonService.restart().toPromise());
  }

  private async prepareEvent(eventType: string, eventData: any): Promise<void> {
    switch (eventType) {
      case 'start-download':
        this.enableAbandon.next(true);
        this.historyLogs.push('Start downloading backup...');
        this.historyLogs.push(`Downloaded: 0%...`);
        break;
      case 'download-progress':
        this.enableAbandon.next(true);
        this.historyLogs.pop();
        this.historyLogs.push(`Downloaded: ${(eventData.percent * 100).toFixed(2)}%...`);
        break;
      case 'backup-downloaded':
        this.enableAbandon.next(true);
        this.historyLogs.pop();
        this.historyLogs.push(`Downloaded: 100%...`);
        this.historyLogs.push('Backup downloaded.');
        break;
      case 'extracting-archive':
        this.enableAbandon.next(true);
        this.historyLogs.push(`Extracting...`);
        break;
      case 'archive-extracted':
        this.enableAbandon.next(true);
        this.historyLogs.push(`Backup extracted.`);
        this.historyLogs.push('Stopping daemon...');
        await this.invocationService.limited(() => (this.daemonService.stop().toPromise()), 3 * 60 * 1000); //3 mins max
        await this.invocationService.delay(10 * 1000);
        await (this.rpc.call('apply-primer-backup').toPromise());
        break;
      case 'restoring-from-backup':
        this.enableAbandon.next(false);
        this.historyLogs.push(`Restoring from primer backup...`);
        break;
      case 'restored-from-backup':
        this.enableAbandon.next(false);
        this.historyLogs.push('Starting daemon (up to 10 mins)...');
        await this.invocationService.limited(() => (this.daemonService.restart().toPromise()), 10 * 60 * 1000); //10 mins max
        this.lastRestore = new Date();
        this.historyLogs.push(`Restore successfully done.`);
        this.isInProgressSub.next(false);
        this.onSuccess.emit();
        break;
      case 'cleaning-tmp-data':
        this.enableAbandon.next(false);
        this.historyLogs.push(`Cleaning temp data...`);
        break;
      case 'abandon':
        this.enableAbandon.next(false);
        this.isInProgressSub.next(false);
        //this.lastRestore = new Date();
        this.historyLogs.push('Abandoning...');
        this.historyLogs.push('Starting daemon...');
        await this.invocationService.limited(() => (this.daemonService.restart().toPromise()), 10 * 60 * 1000); //10 mins max
        break;
      case 'retry':
          this.enableAbandon.next(false);
          this.historyLogs.push('Retrying...');
          await this.invocationService.delay(2 * 1000); //5 sec
          this.isInProgressSub.next(false);
          await this.restore(true);
          break;
      case 'error':
        this.enableAbandon.next(false);
        throw eventData;
    }
  }

  public clean(): void {
    this.historyLogs = [];
  }

  public async abandon(): Promise<void> {
    await (this.rpc.call('abandon-primer').toPromise());
  }

  public async retry(): Promise<void> {
    await (this.rpc.call('retry-primer-restore').toPromise());
  }

  public async restore(manual?: boolean, delayStart?: boolean): Promise<void> {
    const isInProgress = await (this.isInProgressSub.take(1).toPromise());
    if (isInProgress) {
      return Promise.resolve();
    }

    if (!manual) {
      this.onAutoRestore.emit();
    }

    if (!delayStart) {
      this.isInProgressSub.next(true);
      this.isErrorSub.next(false);
      this.historyLogs = [];

      try {
        await this.daemonService.stop();
        await (this.rpc.call('prepare-primer-backup').toPromise());
      } catch (e) {
        await this.onError(e);
      }
    }
  }
}
