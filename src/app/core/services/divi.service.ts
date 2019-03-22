import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import {Observable} from 'rxjs/Observable';
import {catchError, map, mergeMap, tap} from 'rxjs/operators';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {fromPromise} from 'rxjs/observable/fromPromise';
import {Log} from 'ng2-logger';
import {IpcService} from '../../core/ipc/ipc.service';

const MAINNET_PORT = 51473;
const TESTNET_PORT = 51475;
const HOSTNAME = 'localhost';

declare global {
  interface Window {
    electron: boolean;
  }
}

@Injectable()
export class DiviService {

  private log: any = Log.create('rpc.service');
  private destroyed: boolean = false;

  /**
   * IP/URL for daemon (default = localhost)
   */
  private hostname: String = HOSTNAME; // TODO: URL Flag / Settings

  /**
   * Port number of of daemon (default = 51935)
   */
  private port: number = TESTNET_PORT; // TODO: Mainnet / testnet flag...

  private username: string = 'test';
  private password: string = 'test';

  private static diviPrices: any = null;

  public isElectron: boolean = false;

  constructor(
    private _http: HttpClient,
    private _ipc: IpcService,
  ) {
    this.isElectron = window.electron;
  }

  callDiviMap(method: string, params?: Array<any> | null): [string | null, any] {
    switch (method) {
      case 'getstakinginfo':
        return ['getstakingstatus', params];
      case 'filteraddresses':
        return this.diviFilterAddresses(params);
      case 'getnewaddress':
        // if (!params || (params && !_.isString(params[0]))) {
        const newParams = [""];
        // }
        return [method, newParams];
      case 'manageaddressbook':
        const addresses = this.diviFilterAddressBook(params);
        return [null, addresses];
      case 'sendtypeto':
        return this.diviSendTypeTo(params);
    }
    return [method, params];
  }

  callGroupDiviMap(method: string, groupParams: Array<any>, params?: Array<any> | null): [string | null, any][] {
    switch (method) {
      default:
        throw "method not supported";
    }
  }

  responseDiviMap(method: string, params?: Array<any> | null, response?: any): any {
    response = response && (response.result !== undefined) ? response.result : response;
    switch (method) {
      case 'getstakingstatus':
        return Promise.resolve(response);
      case 'listtransactions':
        _.remove(response, { category: 'send', blockindex: 1 });
        return Promise.resolve(response);
      case 'getwalletinfo': 
        return Promise.resolve(this.diviWalletInfo(params, response));
      case 'encryptwallet': 
        return Promise.resolve(this.encryptWallet(params, response));
      case 'filteraddresses':
        if (!_.difference(params, [-1]).length) {
          return Promise.resolve({
            total: (response || []).length,
            num_receive: (response || []).length,
            num_send: 1
          });
        } else {
          const addresses = [];
          if (_.isArray(response)) {
            response.forEach(address => {
              addresses.push({
                'address': address,
                'label': '',
                'owned': 'true',
                'root': '',
                'path': ''
              });
            });
            return Promise.resolve(this.mapAddressLabels(addresses));
          }
          return addresses;
        }
    }
    return Promise.resolve(response);
  }

  responseGroupDiviMap(method: string, params?: Array<any> | null, responses?: any[]): any {
    switch (method) {
      default:
        throw Promise.resolve({});
    }
  }

  getPrivateKeys(addresses: string[]): Promise<string[]> {
    const privateKeys = [];
    const promises = [];
    addresses.forEach(address => {
      const p = this.call('dumpprivkey', [address]).toPromise().then((res: any) => {
        privateKeys.push(res);
      }).catch(err => console.error(err));
      promises.push(p);
    });
    return Promise.all(promises).then(r => privateKeys);
  }

  encryptWallet(params: any[], response: any): any {
    return response;
  }

  diviWalletInfo(params: any[], waletInfo: any): any {
    if (waletInfo.encryption_status === "unencrypted") {
      waletInfo.encryptionstatus = "Unencrypted";
    } else if (waletInfo.encryption_status === "locked") {
      waletInfo.encryptionstatus = "Locked";
    } else if (waletInfo.encryption_status === "unlocked") {
      waletInfo.encryptionstatus = "Unlocked";
    } else if (waletInfo.encryption_status === "locked-anonymization") {
      waletInfo.encryptionstatus = "Unlocked, staking only";
    }

    if (waletInfo.encryptionstatus 
      && waletInfo.encryptionstatus.startsWith("Unlocked")) {
      if (new Date(waletInfo.unlocked_until * 1000) <= new Date()) {
        waletInfo.unlocked_until = 0;
      }
    } else {
      delete waletInfo.unlocked_until;
    }

    return waletInfo;
  }

  diviFilterAddressBook(params: any[]) {
    const [action, address, label] = params;
    let addressBook = JSON.parse(localStorage.getItem('addressBook')) || [];
    switch (action) {
      case 'del':
        addressBook = _.filter(addressBook, n => n.address !== address);
        localStorage.setItem('addressBook', JSON.stringify(addressBook));
        return {
          result: 'success'
        };
      case 'newsend':
        if (!!_.find(addressBook, { address: address })) {
          return { result: 'success' };
        }
        addressBook.push({
          address: address,
          label: label,
          owned: 'true',
          root: '',
          path: ''
        });
        localStorage.setItem('addressBook', JSON.stringify(addressBook));
        return {
          result: 'success'
        };
    }
    return params
  }

  getDiviPrices(): Observable<any> {
    if (!!DiviService.diviPrices) {
      return Observable.of(DiviService.diviPrices);
    }

    return this._http.get("http://142.93.141.60:1397/quote/3441")
      .pipe(map((r: any) => {
        return { usd: r.USD.price };
      }), tap(r => DiviService.diviPrices = r));
  }

  diviFilterAddresses(params: any[]): [string | null, any] {
    const [offset, count, sortCode, matchStr, matchOwned, showPath] = params;
    if (offset === -1 || offset === '-1') {
      return ['getaddressesbyaccount', [""]];
    }
    switch (matchOwned) {
      case '1': // Owned
        return ['getaddressesbyaccount', [""]];
      case '2': // Non-owned
        const addressBook = JSON.parse(localStorage.getItem('addressBook')) || [];
        return [null, addressBook];
      default:  // '0' off (default)
        return [null, ''];
    }
  }

  diviSendTypeTo(params: any[]): [string | null, any] {
    const [
      typeIn,
      typeOut,
      outputs,
      comment,
      commentTo,
      ringSize,
      inputsPerSig,
      testFee,
      coinControl
    ] = params;
    if (!testFee && outputs[0]) {
      return ['sendtoaddress', [outputs[0].address, _.toNumber(outputs[0].amount), comment]];
    }
    return [null, {fee: 0}];

  }

  /**
   * The call method will perform a single call to the divid daemon and perform a callback to
   * the instance through the function as defined in the params.
   *
   * @param {string} method  The JSON-RPC method to call, see ```./divid help```
   * @param {Array<Any>} params  The parameters to pass along with the JSON-RPC request.
   * The content of the array is of type any (ints, strings, booleans etc)
   *
   * @example
   * ```JavaScript
   * this._rpc.call('listtransactions', [0, 20]).subscribe(
   *              success => ...,
   *              error => ...);
   * ```
   */
  call(method: string, params?: Array<any> | null): Observable<any> {
    const [mMethod, mParams] = this.callDiviMap(method, params);
    if (!mMethod) {
      return new Observable((observer) => { observer.next(mParams)});
    }
    if (this.isElectron) {
      return this._ipc.runCommand('rpc-channel', null, mMethod, mParams)
        .pipe(
          mergeMap(response => fromPromise(this.responseDiviMap(method, params, response))),
          catchError(error => Observable.throw(typeof error._body || error === 'object'
            ? error._body || error
            : JSON.parse(error._body || error))
          )
        );
    } else {
      // Running in browser, delete?
      const postData = JSON.stringify({
        method: mMethod,
        params: mParams,
        id: 1
      });

      const headers = new HttpHeaders();
      headers.append('Content-Type', 'application/json');
      headers.append('Authorization', 'Basic ' + btoa(`${this.username}:${this.password}`));
      headers.append('Accept', 'application/json');

      return this._http
        .post(`http://${this.hostname}:${this.port}`, postData, { headers: headers })
        .pipe(
          map((response: any) => response.result),
          catchError(error => Observable.throw(typeof error._body || error === 'object'
            ? error._body || error
            : JSON.parse(error._body || error))
          )
        );
    }
  }

  callGroup(method: string, groupParams: any[], params?: any[] | null): Observable<any> {
    const reqs = this.callGroupDiviMap(method, groupParams, params);
    const requests = reqs.map(x => {
      const [mMethod, mParams] = x;
      return this._ipc.runCommand('rpc-channel', null, mMethod, mParams);
    });

    return Observable.forkJoin(requests).pipe(
      mergeMap(response => fromPromise(this.responseGroupDiviMap(method, params, response))),
      catchError(error => Observable.throw(typeof error._body || error === 'object'
        ? error._body || error
        : JSON.parse(error._body || error))
      )
    );
  }

  getAddressLabel(address: string): string {
    const addressLabels = JSON.parse(localStorage.getItem('addressLabels')) || {};
    return addressLabels[address] || '';
  }

  mapAddressLabels(addresses: any): any[] {
    const mappedAddresses = [];
    const addressLabels = JSON.parse(localStorage.getItem('addressLabels')) || {};
    const creationDates = JSON.parse(localStorage.getItem('addressCreationDates')) || {};
    addresses.forEach(value => {
      mappedAddresses.push({
        ...value,
        label: addressLabels[value.address] || '',
        creationDate: creationDates[value.address] || ''
      });
    });
    return mappedAddresses;
  }

  addAddressLabel(address: string, label: string): void {
    const addressLabels = JSON.parse(localStorage.getItem('addressLabels')) || {};
    addressLabels[address] = label;
    localStorage.setItem('addressLabels', JSON.stringify(addressLabels));
  }

  addAddressCreationDate(address: string): void {
    const addressCreationDates = JSON.parse(localStorage.getItem('addressCreationDates')) || {};
    addressCreationDates[address] = new Date();
    localStorage.setItem('addressCreationDates', JSON.stringify(addressCreationDates));
  }

  setAddressBook(address: string, label: string): void {
    const addressBook = JSON.parse(localStorage.getItem('addressBook')) || {};
    const foundIndex = _.findIndex(addressBook, { address: address });
    addressBook[foundIndex].label = label;
    localStorage.setItem('addressBook', JSON.stringify(addressBook));
  }

}
