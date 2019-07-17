import {
  Component, Inject, forwardRef, ViewChild, ElementRef, ComponentRef, HostListener,
  OnDestroy
} from '@angular/core';
import { Log } from 'ng2-logger';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import * as _ from 'lodash';

import { PasswordComponent } from '../shared/password/password.component';
import { IPassword } from '../shared/password/password.interface';

import { ModalsService } from '../modals.service';
import { PassphraseComponent } from './passphrase/passphrase.component';
import { PassphraseService } from './passphrase/passphrase.service';

import { RpcStateService, DaemonService } from '../../core';
import { SnackbarService } from '../../core/snackbar/snackbar.service';
import { ModalsComponent } from '../modals.component';
import { AuthScopes } from 'app/core/models/auth-scopes.enum';

@Component({
  selector: 'modal-createwallet',
  templateUrl: './createwallet.component.html',
  styleUrls: ['./createwallet.component.scss']
})
export class CreateWalletComponent implements OnDestroy {

  log: any = Log.create('createwallet.component');
  step: number = 0;
  initialStep: number = 0;
  isRestore: boolean = false;
  name: string;
  walletStatus: any = {
    isEncrypted: false,
    isBackedUp: false
  };
  disableBack: boolean = false;
  doNotShowAgain: boolean = false;

  @ViewChild('nameField') nameField: ElementRef;

  password: string = '';
  passwordVerify: string = '';
  words: string[];
  toggleShowPass: boolean = false;
  inProgress: boolean = false;
  daemonState: any = null;

  @ViewChild('passphraseComponent')
    passphraseComponent: ComponentRef<PassphraseComponent>;
  @ViewChild('passwordElement') passwordElement: PasswordComponent;
  @ViewChild('passwordElementVerify') passwordElementVerify: PasswordComponent;
  @ViewChild('passwordRestoreElement') passwordRestoreElement: PasswordComponent;

  // Used for verification
  private wordsVerification: string[];
  private validating: boolean = false;
  private passcount: number = 0;
  
  errorString: string = '';
  private destroyed: boolean = false;

  constructor (
    @Inject(forwardRef(() => ModalsService))
    private _modalsService: ModalsService,
    private _passphraseService: PassphraseService,
    private rpcState: RpcStateService,
    private flashNotification: SnackbarService,
    private dialogRef: MatDialogRef<ModalsComponent>,
    private daemonService: DaemonService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.reset();

    this.daemonService.state
      .takeWhile(_ => !this.destroyed)  
      .subscribe(state => {
        this.daemonState = state;
      });
  }

  ngOnDestroy() {
    this.destroyed = true;
  }

  reset(): void {
    this.words = Array(24).fill('');
    this.isRestore = false;
    this.name = '';
    this.password = '';
    this.passwordVerify = '';
    this.errorString = '';
    this.step = 0;
    this.walletStatus = this.rpcState.get('ui:walletStatus');
    this.doNotShowAgain = localStorage.getItem("wallet:doNotShowEncrypt") === 'true';

    if (this.data && this.data.data) {
      this.step = this.data.data.step || 0;
      this.initialStep = this.data.data.step || 0;
      this.isRestore = this.data.data.isRestore || false;
      this.disableBack = !!this.data.data.disableBack || false;
      this.doStep();
    }
  }

  changeDoNotShow(event: any): void {
    localStorage.setItem("wallet:doNotShowEncrypt", String(this.doNotShowAgain));
  }

  initialize(type: number): void {
    this.reset();

    switch (type) {
      case 0: // Encrypt wallet
        this.close();
        this._modalsService.open('encrypt', {forceOpen: true});
        return;
      case 1: // Create
        break;
      case 2: // Restore
        this.isRestore = false;
        this.step = 2;
        break;
      case 3: // Restore
        this.isRestore = true;
        this.step = 3;
        break;
    }
    this.nextStep();
  }

  nextStep(): void {
    this.validating = true;

    if (this.validate()) {
      this.validating = false;
      this.step++;
      this.doStep();
    }
  }

  prevStep(): void {
    if (this.step === 3 || (this.step === 4 && this.isRestore)) {
      this.step = 0;
    } else {
      this.step--;
    }
    
    this.errorString = '';
    this.doStep();
  }

  goToStep(step: number): void {
    this.step = step;
    this.errorString = '';
    this.doStep();
  }

  doStep(): void {
    switch (this.step) {
      case 1:
        setTimeout(() => this.nameField.nativeElement.focus(this), 1);
        break;
      case 2:
        if (this.isRestore) {
          this.step = 4;
        }
        this.password = '';
        this.passwordVerify = '';
        break;
      case 3:
        this._passphraseService.generateMnemonic(this.mnemonicCallback.bind(this));
        this.flashNotification.open(
          'Please remember to write down your recovery passphrase',
          'warning');
        break;
      case 4:
        while (this.words.reduce((prev, curr) => prev + +(curr === ''), 0) < 5) {
          const k = Math.floor(Math.random() * 23);
          this.words[k] = '';
        }
        break;
      case 5:
        this.step = 4;
        this.errorString = '';

        if (this.isRestore) {
          this.importMnemonicSeed();
        } else {
          this.step = 7;
        }

        break;
    }
  }


  private mnemonicCallback(response: Object): void {
    const words = response['mnemonic'].split(' ');

    if (words.length > 1) {
      this.words = words;
    }

    this.wordsVerification = Object.assign({}, this.words);
  }

  public startProgress(): void {
    this.inProgress = true;
    this.dialogRef.componentInstance.enableClose = false;
  }

  public endProgress(): void {
    this.inProgress = true;
    this.dialogRef.componentInstance.enableClose = true;
  }

  public async importMnemonicSeed(): Promise<void> {
    this.startProgress();
    this.flashNotification.open('Restarting daemon... Please be patient while your configuration is being reloaded.');

    try {
      await this._passphraseService.importMnemonic(this.words);
      this.step = 7;
    } catch(e) {
      this.step = 4;
      this.log.er(e);
      this.errorString = e.message;
      this.log.er('Mnemonic import failed');
    }

    this.inProgress = false;
    this.endProgress();
  }

  validate(): boolean {
    if (this.validating && this.step === 1) {
      return !!this.name;
    }
    if (this.validating && this.step === 4 && !this.isRestore) {
      const valid = !this.words.filter((value, index) => this.wordsVerification[index] !== value).length;
      
      if (valid) {
        localStorage.setItem('wallet:is-backed-up', 'true');
        this.errorString = '';
      } else {
        this.errorString = 'You have entered an invalid recovery phrase';
      }

      return valid;
    }

    return true;
  }

  /**
  *  Returns how many words were entered in passphrase component.
  */
  getCountOfWordsEntered(): number {
    const count = this.words.filter((value: string) => value).length;
    return count;
  }

  /** Triggered when the password is emitted from PasswordComponent */
  passwordFromEmitter(pass: IPassword, verify?: boolean) {
    this.passcount++;
    this[verify ? 'passwordVerify' : 'password'] = (pass.password || '');

    // Make sure we got both passwords back...
    if (this.passcount % 2 === 0) {
      this.verifyPasswords();
    }
  }

  /** Triggered when showPassword is emitted from PasswordComponent */
  showPasswordToggle(show: boolean) {
    this.toggleShowPass = show;
  }

  /** verify if passwords match */
  verifyPasswords() {
    if (!this.validating) {
      return;
    }

    if (this.password !== this.passwordVerify) {
      this.flashNotification.open('Passwords Do Not Match!', 'warning');
    } else {
      // We should probably make this a function because it isn't reusing code??
      this.validating = false;
      this.step++;
      this.doStep();
    }
    this.passwordVerify = ''
    this.password = '';
  }

  /** Triggered when the password is emitted from PassphraseComponent */
  wordsFromEmitter(words: string): void {
    this.words = words.split(',');
  }

  async unlockWallet(): Promise<void> {
    await this._modalsService.unlock(AuthScopes.UNLOCK_WALLET, null, true);
  }

  close(): void {
    this.dialogRef.close();
  }

  public countWords (count: number): boolean {
    return count !== this.words.length;
  }

  // capture the enter button
  @HostListener('window:keydown', ['$event'])
  keyDownEvent(event: any) {
    if (event.keyCode === 13) {
      this.nextStep();
    }
  }
}
