import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Observer } from 'rxjs'; // use this for testing atm
import { Log } from 'ng2-logger';

import { RpcService } from '../rpc.service';
import { RpcStateService } from '../rpc-state/rpc-state.service';

@Injectable()
export class PeerService implements OnDestroy {

  private loopTimeout = null;
  private log: any = Log.create('peer.service');
  private destroyed: boolean = false;

  // TODO: Peer interface
  private _peerList: Observable<Array<Object>>;
  private _observerPeerList: Observer<Array<Object>>;

  private _highestBlockHeightInternal: Observable<number>;
  private _observerHighestBlockHeightInternal: Observer<number>;

  private _highestBlockHeightNetwork: Observable<number>;
  private _observerHighestBlockHeightNetwork: Observer<number>;

  constructor(private _rpc: RpcService, private rpcState: RpcStateService) {
    this.rpcState.observe('settings').subscribe(() => this._observerHighestBlockHeightNetwork.next(-1))

    this._peerList = Observable.create(
      observer => this._observerPeerList = observer
    ).publishReplay(1).refCount();
    this._peerList.subscribe().unsubscribe();

    // setup observable for internal block height
    this._highestBlockHeightInternal = Observable.create(
      observer => this._observerHighestBlockHeightInternal = observer
    ).publishReplay(1).refCount();
    this._highestBlockHeightInternal.subscribe().unsubscribe();

    // setup observable for network block height
    this._highestBlockHeightNetwork = Observable.create(
      observer => this._observerHighestBlockHeightNetwork = observer
    ).publishReplay(1).refCount();

    this._highestBlockHeightNetwork.subscribe().unsubscribe();

    /* Initiate peer list loop */
    this.update();
  }

  private updateStartingHeight() {
    clearTimeout(this.loopTimeout);

    this._rpc.call('getpeerinfo').subscribe(
      (peerinfo: Array<Object>) => this.setPeerListForStartingHeight(peerinfo),
      error => this.log.er(`updateBlockchainInfo(): getblockchaininfo error`, error)
    );

    this._rpc.call('getblockcount').subscribe(
      blockcount => this._observerHighestBlockHeightInternal.next(blockcount),
      error => this.log.er(`updatePeerListLoop(): getblockcount error`, error)
    );

    if (!this.destroyed) {
      this.loopTimeout = setTimeout(this.updateStartingHeight.bind(this), 10000);
    }
  }

  private setPeerListForStartingHeight(peerList: Array<Object>) {
    if (!!peerList && !!peerList.length) {
      this._observerHighestBlockHeightNetwork.next(this.calculateStartingHeightNetwork(peerList));
    }

    this._observerPeerList.next(peerList);
  }

  private calculateStartingHeightNetwork(peerList: Array<Object>): number {
    let highestBlockHeightNetwork = -1;

    peerList.forEach(peer => {
      const networkHeightByPeer = (<any>peer).startingheight;

      if (highestBlockHeightNetwork < networkHeightByPeer || highestBlockHeightNetwork === -1) {
        highestBlockHeightNetwork = networkHeightByPeer;
      }
    });

    return highestBlockHeightNetwork;
  }

  public update(): void {
    this.updateStartingHeight();
  }

  getBlockCount(): Observable<number> {
    return this._highestBlockHeightInternal;
  }

  getBlockCountNetwork(): Observable<number> {
    return this._highestBlockHeightNetwork;
  }

  getPeerList(): Observable<Array<Object>> {
    return this._peerList;
  }

  // TODO: destroy other observables
  ngOnDestroy() {
    this.destroyed = true;
  }
}
