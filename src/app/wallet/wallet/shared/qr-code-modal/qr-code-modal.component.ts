import { Component, ElementRef, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material';

import { SnackbarService } from '../../../../core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-qr-code-modal',
  templateUrl: './qr-code-modal.component.html',
  styleUrls: ['./qr-code-modal.component.scss']
})
export class QrCodeModalComponent {

  @ViewChild('qrCode') qrElementView: ElementRef;

  public singleAddress: any = {
    label: 'Empty label',
    address: 'Empty address',
    owned: false
  };

  constructor(
    private snackbar: SnackbarService,
    public dialogRef: MatDialogRef<QrCodeModalComponent>,
    private router: Router
  ) { }

  getQrSize(): number {
    return this.qrElementView.nativeElement.offsetWidth;
  }

  showAddress(address: string) {
    return address.match(/.{1,4}/g);
  }

  copyToClipBoard(): void {
    this.snackbar.open('Address copied to clipboard.', '');
  }

  dialogClose(): void {
    this.dialogRef.close();
  }

  onSendClick(): void {
    this.dialogClose();
    this.router.navigate(['/wallet/send', this.singleAddress.address]);
  }

}
