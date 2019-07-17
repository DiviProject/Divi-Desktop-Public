import { Injectable } from "@angular/core";
import * as _ from 'lodash';
import { RpcStateService } from "../rpc/rpc.module";
import { BehaviorSubject } from "rxjs";
import { UserSettingsService } from "./user-settings.service";
import { TfaScopesModel } from "../models/tfa-scopes.model";

@Injectable()
export class SecutiyService {
    public onChangeObs: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    constructor(
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
}
