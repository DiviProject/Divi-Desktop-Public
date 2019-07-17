import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material';
import { Log } from 'ng2-logger';

import { RpcService, RpcStateService, SnackbarService, DiviService } from '../../../../../core';

import { ModalsService } from '../../../../../modals/modals.service';

import { AddressService } from '../../../shared/address.service';
import { Address } from '../../../shared/address.model';
import { AuthScopes } from 'app/core/models/auth-scopes.enum';

@Component({
  selector: 'app-new-address-modal',
  templateUrl: './new-address-modal.component.html',
  styleUrls: ['./new-address-modal.component.scss']
})
export class NewAddressModalComponent implements OnInit {
  public addAddressBookForm: FormGroup;
  public address: string;
  public label: string;
  public isEdit: boolean;
  public modalTitle: string;

  log: any = Log.create('app-new-address-modal');

  /*
   Validation state
   */
  public validAddress: boolean = undefined;
  public isMine: boolean = undefined;
  private addresses: Address[] = [];
  
  @ViewChild('addressInput') addressInput: ElementRef;

  constructor(
    public dialogRef: MatDialogRef<NewAddressModalComponent>,
    private formBuilder: FormBuilder,
    private _rpc: RpcService,
    private _rpcState: RpcStateService,
    private flashNotificationService: SnackbarService,
    private _modals: ModalsService,
    private _addressService: AddressService,
    private _divi: DiviService,
  ) {
    this._addressService._addresses.subscribe((addresses) => {
      this.addresses = addresses
    });
  }

  ngOnInit(): void {
    if (this.isEdit) {
      this.verifyAddress();
      this.modalTitle = 'Edit address';
    } else {
      this.modalTitle = 'Add new address to Address book';
    }
    this.buildForm();
  }

  buildForm(): void {
    this.addAddressBookForm = this.formBuilder.group({
      address: this.formBuilder.control(null, [Validators.required]),
      label: this.formBuilder.control(null, [Validators.required]),
    });

    if (this.isEdit) {
      this.addAddressBookForm.controls.address.disable();
    } else {
      this.addAddressBookForm.controls.address.enable();
    }
  }

  closeModal(): void {
    this.addAddressBookForm.reset();
    this.dialogRef.close();
  }

  /**
   * Returns if the entered address is valid or not AND if it is not ours (isMine).
   */
  checkAddress(): boolean {
    return this.validAddress && !this.isMine;
  }

  /*
   RPC Logic
   */

  /**
   * Adds the address to the addressbook if address is valid & has label (in UI textbox) AND is not one of our own addresses.
   */
  async onSubmitForm(): Promise<void> {
    if (!this.validAddress) {
      this.flashNotificationService.open('Please enter a valid address!');
      return;
    }

    if (this.isMine) {
      this.flashNotificationService.open('This is your own address - can not be added to Address book!');
      return;
    }

    if (this.isExists(this.address) && !this.isEdit) {
      this.flashNotificationService.open('This address already added to Address book!', 'err');
      return;
    }

    if (this.label !== undefined && this.label.trim() && !this.isMine) {
      const isUnlocked = await this._modals.unlock(AuthScopes.ADDRESS_BOOK_CREATE);

      if (isUnlocked) {
        this.addressCallBack();
      }

      this.dialogRef.close();
    }
  }

  private isExists(address: string): boolean {
    return !!this.addresses.filter(a => a.address === address)[0];
  }

  private addressCallBack(): void {
    this._rpc.call('manageaddressbook', ['newsend', this.address, this.label])
      .subscribe(
        response => this.rpc_addAddressToBook_success(response),
        error => this.rpc_addAddressToBook_failed(error));
  }

  /**
   * Address was added succesfully to the address book.
   */
  rpc_addAddressToBook_success(json: any): void {
    if (json.result === 'success') {
      if (this.isEdit) {
        this._divi.setAddressBook(this.address, this.label);
      }
      this.closeModal();
      const message: string = (this.isEdit) ? 'Address successfully updated to the Address book'
        : 'Address successfully added to the Address book';

      this.flashNotificationService.open(message);
      // TODO: remove specialPoll! (updates the address table)
      // this._rpc.specialPoll();
      this._addressService.updateAddressList();
    }
  }

  /**
   * Address was not added to the addressbook
   * e.g: wallet still locked
   */
  rpc_addAddressToBook_failed(json: Object): void {
    this.closeModal();
    this.log.er('rpc_addAddressToBook_failed', json);
    this._addressService.updateAddressList();
  }

  /*
   Verify address
   */

  /**
   * Verify if address is valid through RPC call and set state to validAddress..
   */
  verifyAddress() {
    if (this.address === undefined || this.address === '') {
      this.validAddress = undefined;
      this.isMine = undefined;
      return;
    }

    if (this.isExists(this.address) && !this.isEdit) {
      this.flashNotificationService.open('This address already added to Address book!', 'err');
      return;
    }

    this._rpc.call('validateaddress', [this.address])
      .subscribe(
        response => {
          this.validAddress = response.isvalid;
          this.isMine = response.ismine;
          if (response.account !== undefined) {
            this.label = response.account;
          }

          if (this.isMine) {
            this.flashNotificationService
            .open('This is your own address - can not be added to Address book!', 'err');
          }
        },
        error => this.log.er('rpc_validateaddress_failed', error));
    return;
  }

  pasteAddress(): void {
    this.addressInput.nativeElement.focus();
    document.execCommand('paste');
  }
}
