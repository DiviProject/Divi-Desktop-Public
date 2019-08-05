import { Injectable } from "@angular/core";
import * as _ from 'lodash';
import { RpcStateService, RpcService } from "../rpc/rpc.module";
import { BehaviorSubject } from "rxjs";
import { UserSettingsService } from "./user-settings.service";
import { TfaScopesModel } from "../models/tfa-scopes.model";

@Injectable()
export class SecurityService {
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
        await this.rpcState.stateCall('getwalletinfo');
    }

    async lock(): Promise<void> {
        await (this.rpc.call('walletlock').toPromise());
        await this.rpcState.stateCall('getwalletinfo');
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
