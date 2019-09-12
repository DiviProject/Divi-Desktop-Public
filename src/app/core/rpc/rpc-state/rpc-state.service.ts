import { Injectable, OnDestroy } from '@angular/core';
import { Log } from 'ng2-logger';
import { Subject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';


import { StateService } from 'app/core/state/state.service';
import { RpcService } from 'app/core/rpc/rpc.service';

@Injectable()
export class RpcStateService extends StateService implements OnDestroy {
  public static DAEMON_STARTED_KEY = "DAEMON:STARTED";
  public static WALLET_INITIALIZED_KEY = "ui:walletInitialized";
  public static WALLET_STATUS_KEY = "ui:walletStatus";

  private log: any = Log.create('rpc-state.class');
  private destroyed: boolean = false;

  private _enableState: boolean = true;

  /** errors gets updated everytime the stateCall RPC requests return an error */
  public errorsStateCall: Subject<any> = new Subject<any>();

  constructor(private _rpc: RpcService) {
    super();

    this.registerStateCall('getwalletinfo', 1000);
    this.registerStateCall('getblockchaininfo', 5000);
    this.registerStateCall('getnetworkinfo', 10000);
    this.registerStateCall('getstakinginfo', 10000);
    this.registerStateCall('listunspent', 10000);

    // TODO: get rid of these
    this.walletEncryptionStatusChange();
    this.initWalletState();
  }

  /**
   * Make an RPC Call that saves the response in the state service.
   *
   * @param {string} method  The JSON-RPC method to call, see ```./divid help```
   *
   * The rpc call and state update will only take place while `this._enableState` is `true`
   *
   * @example
   * ```JavaScript
   * this._rpcState.stateCall('getwalletinfo');
   * ```
   */
  stateCall(method: string): void {
    if (!this._enableState) {
      return;
    } else {
      this._rpc.call(method)
      .subscribe(
        response => this.stateCallSuccess(method, response),
        error => this.stateCallError(method, error));
    }
  }

  /** Register a state call, executes every X seconds (timeout) */
  registerStateCall(method: string, timeout: number, params?: Array<any> | null): void {
    if (timeout) {
      // loop procedure
      const _call = () => {
        if (this.destroyed) {
          // RpcState service has been destroyed, stop.
          return;
        }
        if (!this._enableState) {
          // re-start loop after timeout - keep the loop going
          setTimeout(_call, timeout);
          return;
        }
        this._rpc.call(method, params)
          .subscribe(
            success => {
              this.stateCallSuccess(method, success);

              // re-start loop after timeout
              setTimeout(_call, timeout);
            },
            error => {
              this.stateCallError(method, error);
              setTimeout(_call, timeout);
            });
      };

      // initiate loop
      _call();
    }
  }

  /** Updates the state whenever a state call succeeds */
  private stateCallSuccess(method: string, response: any) {
    this.set(RpcStateService.DAEMON_STARTED_KEY, true);

    // no error
    this.errorsStateCall.next({
      error: false,
      electron: this._rpc.isElectron
    });

    this.set(method, response);
  }

  /** Updates the state when the state call errors */
  private stateCallError(method: string, error: any) {
    this.log.er(`stateCallError(): RPC Call ${method} returned an error:`, error);

    this.set(RpcStateService.DAEMON_STARTED_KEY, ![0, 502].includes(error.status));

    this.errorsStateCall.next({
      error: error.target ? error.target : error,
      electron: this._rpc.isElectron
    });
  }

  ngOnDestroy() {
    this.destroyed = true;
  }

  private walletEncryptionStatusChange() {
    this.observe('getwalletinfo', 'encryptionstatus')
      .takeWhile(() => !this.destroyed)
      .subscribe(async status => {
        if (['Unencrypted', 'Unlocked, staking only', 'Unlocked'].includes(status)) {
          this.stateCall('getstakinginfo');
        }

        if (['Unencrypted', 'Unlocked'].includes(status)) {
          //cache hdseed
          const { hdseed } = await (this._rpc.call('dumphdinfo').toPromise());
          this.set('hdseed', hdseed);
        }

        this.set('locked', ['Locked', 'Unlocked, staking only'].includes(status));
      });
  }

  // TODO: get rid of this after improve-router
  private initWalletState() {
    this.observe('getwalletinfo')
      .takeWhile(() => !this.destroyed)
      .subscribe(response => {
        this.set(RpcStateService.WALLET_INITIALIZED_KEY, true);
        this.set(RpcStateService.WALLET_STATUS_KEY, {
          isBackedUp: !!localStorage.getItem("wallet:is-backed-up") || response.encryptionstatus !== "Unencrypted",
          isEncrypted: response.encryptionstatus !== "Unencrypted"
        });
        this._rpc.call('global-store:set', ['wallet:unlocked-for-staking', response.encryptionstatus === 'Unlocked, staking only']);
      });

    this.errorsStateCall.asObservable()
      .distinctUntilChanged()
      .subscribe(update => {
        // if error exists & != false
        if (update.error && [0, 502].includes(update.error.status)) {
          this.set(RpcStateService.WALLET_INITIALIZED_KEY, false);
        }
      });
  }
}
