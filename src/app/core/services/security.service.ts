import { Injectable } from "@angular/core";
import * as _ from 'lodash';
import { RpcStateService, RpcService } from "../rpc/rpc.module";
import { BehaviorSubject } from "rxjs";
import { UserSettingsService } from "./user-settings.service";
import { TfaScopesModel } from "../models/tfa-scopes.model";

@Injectable()
export class SecurityService {
    public getTimeouts(): any[] {
        return [
            { value: 60, title: "1 minute" },
            { value: 120, title: "2 minutes" },
            { value: 180, title: "3 minutes" },
            { value: 300, title: "5 minutes" }, 
            { value: 600, title: "10 minutes" },
            { value: 1200, title: "20 minutes" },
            { value: 1800, title: "30 minutes" },
            { value: 0, title: "Always" }
        ];
    }

    public onChangeObs: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    private isAutoUnlockEnabled: boolean = false;
    private unlockData: any = null;

    constructor(
        private rpc: RpcService,
        private rpcState: RpcStateService,
        private userSettingsService: UserSettingsService
        ) {
        this.rpcState.observe('getwalletinfo', 'encryptionstatus')
            .subscribe(status => this.onChangeObs.next(status === "Unlocked" || status === "Unencrypted"));
    }

    isUnlocked(): boolean {
        const walletinfo = this.rpcState.get('getwalletinfo');
        return !!walletinfo && (walletinfo.encryptionstatus === "Unlocked" || walletinfo.encryptionstatus === "Unencrypted");
    }

    isUnlockedForStaking(): boolean {
        const walletInfo = this.rpcState.get('getwalletinfo');
        return !!walletInfo && (walletInfo.encryptionstatus === "Unlocked, staking only");
    }
    
    isAlwaysUnlocked(): boolean {
        const walletinfo = this.rpcState.get('getwalletinfo');

        return !!walletinfo && (walletinfo.unlocked_until === 0 && walletinfo.encryptionstatus === "Unlocked") 
        || walletinfo.encryptionstatus === "Unencrypted";
    }

    async isScopeSelected(scope: string): Promise<boolean> {
        const settings = await this.userSettingsService.getSettings();
        const scopes = new TfaScopesModel(settings.twoFactorAuthScopes);

        if (!settings.twoFactorAuthEnabled) {
            return false;
        }

        return scopes.exists(scope);
    }

    async unlock(password: string, timeout: number, stakeOnly?: boolean): Promise<void> {
        if (this.isAutoUnlockEnabled && !this.unlockData) {
            this.unlockData = {password, timeout, stakeOnly};
        }
        await (this.rpc.call('walletpassphrase', [password, timeout, stakeOnly]).toPromise());
        await this.refresh();
    }

    async lock(): Promise<void> {
        await (this.rpc.call('walletlock').toPromise());
        await this.refresh();
    }

    async refresh(): Promise<void> {
        const result = await (this.rpc.call('getwalletinfo').toPromise());
        this.rpcState.set('getwalletinfo', result);
    }

    public turnOnAutoUnlock(): void {
        this.isAutoUnlockEnabled = true;
    }

    public turnOffAutoUnlock(): void {
        this.isAutoUnlockEnabled = false;
        delete this.unlockData;
    }

    public async autoUnlock(): Promise<void> {
        if (!this.isAutoUnlockEnabled || !this.unlockData) {
            throw new Error('Autounlock disabled');
        }
        await this.unlock(this.unlockData.password, this.unlockData.timeout, this.unlockData.stakeOnly);
    }
}
