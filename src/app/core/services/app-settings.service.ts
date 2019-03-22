import { Injectable } from "@angular/core";
import * as _ from 'lodash';
import { RpcStateService } from "../rpc/rpc.module";
import { BehaviorSubject } from "rxjs";
import { DiviService } from "./divi.service";

@Injectable()
export class AppSettingsService {
    private _net: string = null;
    public onNetChangeObs: BehaviorSubject<string> = new BehaviorSubject<string>(null);

    constructor(
        private rpcState: RpcStateService, 
        private diviService: DiviService
        ) {
        this.rpcState.observe('settings')
            .subscribe(net => this.setNet(net));
    }

    private setNet(net: string): void {
        this._net = net;
        this.onNetChangeObs.next(net);
    }

    public get net(): string {
        return this._net;
    }

    public init(): void {
        this.diviService.call('settings', ['get', 'net'])
            .take(1)
            .subscribe(net => this.rpcState.set('settings', net));
    }
}
