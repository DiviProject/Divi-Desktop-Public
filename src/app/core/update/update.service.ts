import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from "rxjs/BehaviorSubject";

import { RpcService, RpcStateService } from '../rpc/rpc.module';
import { environment } from 'environments/environment';
import { DaemonService } from '../daemon/daemon.service';
import { Log } from 'ng2-logger';

const RELEASE_KEY = "release";

@Injectable()
export class UpdateService implements OnDestroy {
  public historyLogs: Array<string> = [];

  private log: any = Log.create('update.service');

  public isInProgressSub: BehaviorSubject<boolean> = new BehaviorSubject(false);
  public isUpdateAvailableSub: BehaviorSubject<boolean> = new BehaviorSubject(false);
  public releaseInfoSub: BehaviorSubject<any> = new BehaviorSubject(null);

  private checkUpdateTimeoutInterval = 60000; //1 min
  private checkUpdateTimeout = null;
  private destroyed: boolean = false;

  constructor(private _rpc: RpcService, private _rpcState: RpcStateService, private daemonService: DaemonService) {
    this.init();
  }

  public ngOnDestroy(): void {
    this.destroyed = true;
  }

  private init(): void {
    window.ipc.on('auto-updater', (event, eventType, eventData) => {
      this.prepareEvent(eventType, eventData);
    });

    this._rpcState.observe('ui:walletInitialized')
      .take(1)
      .subscribe(_ => this.check(1));

    this.isUpdateAvailableSub.takeWhile(_ => !this.destroyed)
      .subscribe(isUpdateAvailable => {
        if (isUpdateAvailable) {
          clearTimeout(this.checkUpdateTimeout);
        } else {
          this.check();
        }
      });
  }

  private prepareEvent(eventType: string, eventData: any): void {
    switch(eventType) {
      case 'checking-for-update':
        this.historyLogs = [];
        this.isUpdateAvailableSub.next(false);
        this.historyLogs.push('Checking for update...');
        break;
      case 'update-available':
        this.isUpdateAvailableSub.next(true);
        this.historyLogs.push(`Update available. Version: ${eventData.version}.`);
        break;
      case 'update-not-available':
        this.check();
        this.showReleaseInfo(eventData);
        this.historyLogs.push('Update not available.');
        break;
      case 'error':
        this.isInProgressSub.next(false);
        this.historyLogs.push('Error in auto-updater. ' + JSON.stringify(eventData));
        clearTimeout(this.checkUpdateTimeout);
        break;
      case 'download-progress':
        this.historyLogs.pop();
        this.historyLogs.push(`Downloaded: ${Math.round(eventData.percent)}%...`);
        break;      
      case 'update-downloaded':
        this.historyLogs.pop();
        this.historyLogs.push(`Downloaded: 100%...`);
        this.historyLogs.push('Update downloaded.');
        this.install();
        break;
    }
  }

  public update(): void {
    this.historyLogs.push(`Downloaded: 0%...`);
    this.isInProgressSub.next(true);
    this._rpc.call('download-update').subscribe(_ => {}, err => this.log.er('update:', err));
  }

  private check(timeout?: number): void {
    clearTimeout(this.checkUpdateTimeout);

    this.checkUpdateTimeout = setTimeout(() => {
      this._rpc.call('check-update').subscribe(_ => {}, err => this.log.er('check:', err));
    }, timeout || this.checkUpdateTimeoutInterval);
  }

  private install(): void {
    this.historyLogs.push('Stopping daemon...');

    this.daemonService.stop().subscribe(_ => {
      this.installUpdate();
    }, err => this.log.er('install:', err));
  }

  private installUpdate(): void {
    this._rpc.call('install-update').subscribe(_ => {
      this.isInProgressSub.next(false);
    }, _ => this.isInProgressSub.next(false));
  }

  public showReleaseInfo(releaseInfo): void {
    const release = localStorage.getItem(RELEASE_KEY);
    if (release === releaseInfo.version || environment.version !== releaseInfo.version) {
      return;
    }
    localStorage.setItem(RELEASE_KEY, releaseInfo.version);
    this.releaseInfoSub.next(releaseInfo);
  }
}
