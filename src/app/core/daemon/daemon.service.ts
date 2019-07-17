import { Injectable, OnDestroy } from '@angular/core';

import { RpcService, RpcStateService, PeerService } from '../rpc/rpc.module';

import { Observable, BehaviorSubject } from 'rxjs';

@Injectable()
export class DaemonService implements OnDestroy {
  private destroyed: boolean = false;
  
  public state: BehaviorSubject<any> = new BehaviorSubject<any>({
    isFullyLoaded: false,
    isWalletLoading: false,
    errorMessage: ''
  });

  constructor(private rpc: RpcService, private rpcState: RpcStateService, private peerService: PeerService) {
  }

  public ngOnDestroy(): void {
    this.destroyed = true;
  }

  public init(): void {
    this.rpcState.observe(RpcStateService.WALLET_INITIALIZED_KEY)
      .takeWhile(_ => !this.destroyed)
      .subscribe(inited => inited ? this.peerService.update() : null);

    this.rpcState.errorsStateCall.asObservable()
      .takeWhile(_ => !this.destroyed)
      .subscribe(errState => {
          this.state.next({ 
            isFullyLoaded: errState.error === false,
            isWalletLoading: !!errState.error && !!errState.error.message && errState.error.message.indexOf("Loading wallet...") >= 0, 
            errorMessage: (errState.error || {}).message 
          });
      });
  }

  public stop(isRestart: boolean = true, attempts: number = 60): Observable<void> {
    return this.rpc.call('stop-daemon', [isRestart, attempts]);
  }

  public restart(args: Array<string> = []): Observable<void> {
    return this.rpc.call('restart-daemon', args);
  }
}