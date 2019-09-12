import { Injectable } from "@angular/core";
import { RpcStateService, BlockStatusService } from "../../core/rpc/rpc.module";
import * as _ from 'lodash';
import { FullBalanceInfo } from "../models/full-balance-info";

import { Observable, BehaviorSubject } from "rxjs";
import { Log } from "ng2-logger";

@Injectable()
export class BalanceService {
    public balance: BehaviorSubject<FullBalanceInfo> = new BehaviorSubject<FullBalanceInfo>(new FullBalanceInfo());
    private timeout: any = null;
    private log: any = Log.create('balance.service');

    constructor(
        private rpcState: RpcStateService,
        private blockStatusService: BlockStatusService
        ) {

        this.blockStatusService.isFullSynced
            .subscribe((isFullSynced) => {
                clearTimeout(this.timeout);

                if (isFullSynced) {
                    this.initBalance();
                }
            });
    }

    private initBalance(): void {
        this.getFullBalanceInfo().subscribe(b => {
            this.balance.next(b);

            this.timeout = setTimeout(() => {
                this.initBalance();
            }, 1000);
        }, err => this.log.er('initBalance: ', err));
    }

    private getFullBalanceInfo(): Observable<FullBalanceInfo> {
        const walletInfo = this.rpcState.get('getwalletinfo') || {}

        return Observable.of({
            total: walletInfo.balance + walletInfo.immature_balance + walletInfo.unconfirmed_balance,
            spendable: walletInfo.balance,
            unconfirmed: walletInfo.unconfirmed_balance,
            immature: walletInfo.immature_balance
        });
    }
}
