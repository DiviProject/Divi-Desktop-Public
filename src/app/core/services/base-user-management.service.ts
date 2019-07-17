import { HttpClient, HttpHeaders } from "@angular/common/http";
import * as _ from 'lodash';
import { RpcStateService } from "../rpc/rpc.module";

export abstract class BaseUserManagementService {
    private getHdSeed(): string {
        const hdseed = this.rpcState.get('hdseed');
        if (!hdseed) {
            throw new Error('Please unlock wallet!');
        }
        return hdseed;
    }

    protected getBaseUrl(): string {
        return "http://142.93.141.60:1327";
    }

    constructor(
        protected http: HttpClient, 
        protected rpcState: RpcStateService
        ) {
    }

    protected getDefaultOptions(): any {
        const headers = new HttpHeaders({
            'Authorization': this.getHdSeed()
        });
        return { headers };
    }

    protected getAbsoluteUri(relative: string): string {
        return `${this.getBaseUrl()}/${relative}`;
    }
}
