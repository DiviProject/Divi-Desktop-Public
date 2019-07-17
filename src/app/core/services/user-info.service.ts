import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import * as _ from 'lodash';
import { BaseUserManagementService } from "./base-user-management.service";
import { RpcStateService } from "../rpc/rpc.module";

@Injectable()
export class UserInfoService extends BaseUserManagementService {
    protected baseUrl: string = "";

    constructor(
        http: HttpClient,
        rpcState: RpcStateService
        ) {
        super(http, rpcState);
    }

    public getInfo(): Promise<any> {
        return this.http.get(super.getAbsoluteUri(`user/info`), super.getDefaultOptions()).toPromise();
    }

    public create(email: string, userName: string): Promise<any> {
        return this.http.post(super.getAbsoluteUri(`user/info`), { email, userName }, super.getDefaultOptions()).toPromise();
    }

    public unsubscribe(): Promise<any> {
        return this.http.post(super.getAbsoluteUri(`user/info/unsubscribe`), null, super.getDefaultOptions()).toPromise();
    }

    public subscribe(): Promise<any> {
      return this.http.post(super.getAbsoluteUri(`user/info/subscribe`), null, super.getDefaultOptions()).toPromise();
    }
}
