import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { Log } from 'ng2-logger';
import { Observable } from 'rxjs/Observable';

import { environment } from '../../../environments/environment';

import { RpcStateService } from '../../core';
import { ModalsService } from '../../modals/modals.module';
import { AppSettingsService } from 'app/core/services/app-settings.service';
import { PrimerService } from 'app/core/services/primer.service';
import { DaemonService } from 'app/core/daemon/daemon.service';

/*
 * The MainView is basically:
 * sidebar + router-outlet.
 * Will display the _main_ sidebar (not wallet picker)
 * and display wallet + market views.
 */
@Component({
  selector: 'app-main-view',
  templateUrl: './main-view.component.html',
  styleUrls: ['./main-view.component.scss']
})
export class MainViewComponent implements OnInit, OnDestroy {

  log: any = Log.create('main-view.component');
  private destroyed: boolean = false;

  /* UI States */

  title: string = '';
  testnet: boolean = false;

  /* errors */
  walletInitialized: boolean = undefined;
  daemonRunning: boolean = undefined;
  daemonError: any;
  /* version */
  daemonVersion: string;
  clientVersion: string = environment.version;
  unSubscribeTimer: any;
  time: string = '5:00';
  primerModalShown: boolean;
  public unlocked_until: number = 0;
  public encryptionStatus: string = null;

  constructor(
    private _router: Router,
    private _route: ActivatedRoute,
    private _rpcState: RpcStateService,
    private _modals: ModalsService,
    private appSettingsService: AppSettingsService,
    private primerService: PrimerService,
    private daemonService: DaemonService
  ) { }

  ngOnInit() {
    this.primerService.onAutoRestore.subscribe(() => {
      if (!this.primerModalShown) {
        this._modals.open('primer', { forceOpen: true });
        this.primerModalShown = true;
      }
    });
    this.primerService.init();
    this.daemonService.init();

    // Change the header title derived from route data
    // Source: https://toddmotto.com/dynamic-page-titles-angular-2-router-events
    this._router.events
      .filter(event => event instanceof NavigationEnd)
      .map(() => this._route)
      .map(route => {
        while (route.firstChild) {
          route = route.firstChild;
        }
        return route;
      })
      .filter(route => route.outlet === 'primary')
      .flatMap(route => route.data)
      .subscribe(data => this.title = data['title']);

    /* errors */
    this.daemonRunning = this._rpcState.get(RpcStateService.DAEMON_STARTED_KEY);
    // Updates the error box in the sidenav whenever a stateCall returns an error.
    this._rpcState.observe(RpcStateService.DAEMON_STARTED_KEY)
      .takeWhile(_ => !this.destroyed)
      .subscribe(isStarted => this.daemonRunning = isStarted);

    // Updates the error box in the sidenav if wallet is not initialized.
    this._rpcState.observe('ui:walletInitialized')
      .takeWhile(() => !this.destroyed)
      .subscribe(status => this.walletInitialized = status);

    this._rpcState.observe('getwalletinfo', 'unlocked_until')
      .takeWhile(() => !this.destroyed)
      .subscribe(unlocked_until => {
        if (this.unSubscribeTimer) {
          this.unSubscribeTimer.unsubscribe();
        }

        this.unlocked_until = unlocked_until;
        if (this.unlocked_until > 0) {
          this.checkTimeDiff(unlocked_until);
        }
      });
      
    this._rpcState.observe('getwalletinfo', 'encryptionstatus')
      .takeWhile(() => !this.destroyed)
      .subscribe(status => this.encryptionStatus = status);
      
    /* versions */
    // Obtains the current daemon version
    // th3brink: subversion match subversion.match(/\d+\.\d+.\d+.\d+/)
    this._rpcState.observe('getnetworkinfo', 'subversion')
      .takeWhile(() => !this.destroyed)
      .subscribe(subversion => this.daemonVersion = subversion.replace(/\//g, ''));

    this.appSettingsService.onNetChangeObs
      .takeWhile(() => !this.destroyed)
      .subscribe(net => this.testnet = net === 'test');

    this.appSettingsService.init();
  }

  ngOnDestroy() {
    this.destroyed = true;
  }
  /** Open createwallet modal when clicking on error in sidenav */
  createWallet() {
    this._modals.open('createWallet', { forceOpen: true });
  }

  /** Open syncingdialog modal when clicking on progresbar in sidenav */
  syncScreen() {
    this._modals.open('syncing', { forceOpen: true });
  }

  checkLocked(status: boolean) {
    return status;
  }

  checkTimeDiff(time: number) {
    const currentUtcTimeStamp = Math.floor((new Date()).getTime() / 1000);
    const diff = Math.floor(time - currentUtcTimeStamp);
    const minutes = Math.floor((diff % (60 * 60)) / 60);
    const sec = Math.ceil((diff % (60 * 60) % 60));
    this.startTimer(minutes, sec);
  }

  startTimer(min: number, sec: number): void {
    sec = this.checkSecond(sec);
    if (sec === 59) {
      min = min - 1;
    }
    if (min >= 0 && sec >= 0) {
      this.time = min + ':' + ('0' + sec).slice(-2);
      this.unSubscribeTimer = Observable.timer(1000).
        subscribe(() => this.startTimer(min, sec));
    } else {
      if (this.unSubscribeTimer) {
        this.unSubscribeTimer.unsubscribe();
      }
    }
  }

  checkSecond(sec: number): number {
    sec = sec > 0 ? (sec - 1) : 59;
    return sec;
  }

  // Paste Event Handle
  @HostListener('window:keydown', ['$event'])
  keyDownEvent(event: any) {
    if (event.metaKey && event.keyCode === 86 && navigator.platform.indexOf('Mac') > -1) {
      document.execCommand('Paste');
      event.preventDefault();
    }
  }

  /**
  // Sample code for open modal box
  openDemonConnectionModal() {
    const dialogRef = this.dialog.open(DaemonConnectionComponent);
    dialogRef.componentInstance.text = "Test";
  }*/
}
