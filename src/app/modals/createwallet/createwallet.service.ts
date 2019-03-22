import { Injectable, OnDestroy } from '@angular/core';
import { Log } from 'ng2-logger';

@Injectable()
export class CreateWalletService  {
    private log: any = Log.create('createwallet.service');

    public isLocked: boolean;

    isWalletLocked(lockedStatus: boolean) {
        this.isLocked = lockedStatus;
        return lockedStatus;
    }
}