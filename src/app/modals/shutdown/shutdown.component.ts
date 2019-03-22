import { Component } from '@angular/core';

import { MatDialogRef } from '@angular/material';
import { ModalsComponent } from '../modals.component';

@Component({
  templateUrl: './shutdown.component.html',
  styleUrls: ['./shutdown.component.scss']
})

export class ShutdownComponent {
  constructor(
    public dialogRef: MatDialogRef<ModalsComponent>
  ) {
  }
}
