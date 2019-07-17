import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import * as _ from 'lodash';
import { BaseUserManagementService } from "./base-user-management.service";
import { RpcStateService } from "../rpc/rpc.module";

@Injectable()
export class UserSettingsService extends BaseUserManagementService {
    protected baseUrl: string = "";

    constructor(
        http: HttpClient,
        rpcState: RpcStateService
        ) {
        super(http, rpcState);
    }

    public getSettings(): Promise<any> {
        return this.http.get(super.getAbsoluteUri(`user/settings`), super.getDefaultOptions()).toPromise();
    }
}
