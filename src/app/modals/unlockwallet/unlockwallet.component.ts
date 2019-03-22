import { Component, EventEmitter, Input, Output, Inject } from '@angular/core';
import { Log } from 'ng2-logger';

import { MatDialogRef } from '@angular/material';
import { ModalsComponent } from '../modals.component';
import { MAT_DIALOG_DATA } from '@angular/material';


@Component({
  selector: 'app-unlockwallet',
  templateUrl: './unlockwallet.component.html',
  styleUrls: ['./unlockwallet.component.scss']
})
export class UnlockwalletComponent {

  // constants
  log: any = Log.create('unlockwallet.component');

  @Output() unlockEmitter: EventEmitter<string> = new EventEmitter<string>();
  @Input() autoClose: boolean = true;

  private callback: Function;
  showStakeOnly: boolean = true;
  stakeOnly: boolean = false;
  alwaysUnlocked: boolean = false;
  constructor(
    public dialogRef: MatDialogRef<ModalsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any  ) {
    if (data && data.data && data.data.alwaysUnlocked) {
      this.alwaysUnlocked = data.data.alwaysUnlocked;
    }
  }

  unlock(encryptionStatus: string): void {
    if (encryptionStatus.indexOf('Unlocked') !== -1) {
      if (!!this.callback) {
        this.callback();
      }
      // unlock wallet emitter
      this.unlockEmitter.emit(encryptionStatus);
      // close the modal!
      this.closeModal();
    } else {
      this.log.er('Error unlocking');
    }
  }

  /**
  * setData sets the callback information for when the wallet unlocks.
  */
  setData(data: any): void {
    this.callback = data.callback;
    this.showStakeOnly = Boolean(data.showStakeOnly);
    this.stakeOnly = Boolean(data.stakeOnly);
    this.autoClose = (data.autoClose !== false);
  }

  closeModal(): void {
    // clear callback data
    this.showStakeOnly = true;

    if (this.autoClose ) {
      this.dialogRef.componentInstance.close();
    }
  }
}
