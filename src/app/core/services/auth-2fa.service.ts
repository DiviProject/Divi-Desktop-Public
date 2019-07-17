import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import * as _ from 'lodash';
import { BaseUserManagementService } from "./base-user-management.service";
import { RpcStateService } from "../rpc/rpc.module";

@Injectable()
export class Auth2faService extends BaseUserManagementService {
    constructor(
        http: HttpClient, 
        rpcState: RpcStateService
        ) {
        super(http, rpcState);
    }

    public verify(token: string): Promise<any> {
        return this.http.post(super.getAbsoluteUri(`auth-2fa/verify`), { token }, super.getDefaultOptions()).toPromise();
    }

    public info(): Promise<any> {
        return this.http.get(super.getAbsoluteUri(`auth-2fa/info`), super.getDefaultOptions()).toPromise();
    }

    public enable(token: string, scopes: string): Promise<any> {
        return this.http.post(super.getAbsoluteUri(`auth-2fa/enable`), { token, scopes }, super.getDefaultOptions()).toPromise();
    }

    public disable(token: string): Promise<any> {
        return this.http.post(super.getAbsoluteUri(`auth-2fa/disable`), { token }, super.getDefaultOptions()).toPromise();
    }

    public update(token: string, scopes: string): Promise<any> {
        return this.http.post(super.getAbsoluteUri(`auth-2fa/update`), { token, scopes }, super.getDefaultOptions()).toPromise();
    }
}