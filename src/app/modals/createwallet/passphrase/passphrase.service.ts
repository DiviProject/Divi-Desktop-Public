import { Injectable } from '@angular/core';

import { RpcService, DaemonService } from '../../../core';

import { Log } from 'ng2-logger';
import { Observable } from 'rxjs/Observable';


@Injectable()
export class PassphraseService {

  private log: any = Log.create('passphrase.service');

  private validWords: string[];

  constructor(private _rpc: RpcService, private daemonService: DaemonService) {
    this.validateWord('initWords');
  }

  /*
   * This is the logic for creating a new recovery phrase
  */
  generateMnemonic(success: Function) {
    this._rpc.call('dumphdinfo').subscribe(response => success(response), err => this.log.er('generateMnemonic:', err));
  }

  validateWord(word: string): boolean {
    if (!this.validWords) {
      return true;
    }

    return this.validWords.indexOf(word) !== -1;
  }

  async importMnemonic(words: string[]): Promise<void> {
    await (this.daemonService.stop().toPromise());
    await (this._rpc.call('cleanup-for-resore').toPromise());
    await (this.daemonService.restart(['-mnemonic=' + words.join(' '), '-reindex']).toPromise());
    localStorage.setItem('wallet:is-backed-up', 'true');
  }

  generateDefaultAddresses() {
    /* generate balance transfer address (stealth)*/
    this._rpc.call('getnewstealthaddress', ['balance transfer']).subscribe(
      (response: any) => {},
      error => this.log.er('generateDefaultAddresses: getnewstealthaddress failed', error));

    /* generate initial public address */
    this._rpc.call('getnewaddress', ['initial address']).subscribe(
      (response: any) => {},
      error => this.log.er('generateDefaultAddresses: getnewaddress failed', error));
  }
}
