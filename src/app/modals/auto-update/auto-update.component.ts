import { Component, OnDestroy, OnInit } from '@angular/core';

import { UpdateService } from '../../core/update/update.service';
import { MatDialogRef } from '@angular/material';
import { ModalsComponent } from '../modals.component';

@Component({
  selector: 'app-auto-update',
  templateUrl: './auto-update.component.html',
  styleUrls: ['./auto-update.component.scss']
})

export class AutoUpdateComponent implements OnDestroy {
  private subs: Array<any> = [];

  constructor(
    public dialogRef: MatDialogRef<ModalsComponent>,
    public updateService: UpdateService
  ) {
  }

  ngOnInit() {
    this.subs.push(this.updateService.isInProgressSub.subscribe((inProgress) => {
      this.dialogRef.componentInstance.enableClose = !inProgress;
    }));
  }

  ngOnDestroy() {
    this.subs.forEach((x) => x.unsubscribe());
  }

  close(): void {
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  }
}
