import { Component, OnDestroy } from '@angular/core';

import { MatDialogRef } from '@angular/material';
import { ModalsComponent } from '../modals.component';
import { PrimerService } from 'app/core/services/primer.service';

@Component({
  selector: 'app-primer',
  templateUrl: './primer.component.html',
  styleUrls: ['./primer.component.scss']
})

export class PrimerComponent implements OnDestroy {
  private subs: Array<any> = [];
  public isRestoreVisible: boolean = true;
  public isErrorOccurred: boolean = false;
  public enableAbandon: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<ModalsComponent>,
    public primerService: PrimerService
  ) {
  }

  async ngOnInit() {
    const isInProgress = await (this.primerService.isInProgressSub.take(1).toPromise());

    if (!isInProgress) {
      this.primerService.clean();
    }

    this.subs.push(this.primerService.isInProgressSub.subscribe((inProgress) => {
      this.dialogRef.componentInstance.enableClose = !inProgress;
      this.isRestoreVisible = !inProgress;
    }));

    this.subs.push(this.primerService.onSuccess.subscribe(() => {
      this.close();
    }));

    this.subs.push(this.primerService.isErrorSub.subscribe((isError) => {
      this.isErrorOccurred = isError;
    }));

    this.subs.push(this.primerService.enableAbandon.subscribe((enableAbandon) => {
      this.enableAbandon = enableAbandon;
    }));
  }

  ngOnDestroy() {
    this.subs.forEach((x) => x.unsubscribe());
  }

  async restore(): Promise<void> {
    await this.primerService.restore(true);
  }

  async retry(): Promise<void> {
    await this.primerService.retry();
  }

  close(): void {
    this.primerService.clean();
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  }

  async abandon(): Promise<void> {
    await this.primerService.abandon();
  }
}
