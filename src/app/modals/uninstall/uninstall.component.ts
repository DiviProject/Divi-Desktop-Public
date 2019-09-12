import { Component, Inject, forwardRef } from '@angular/core';
import { ModalsComponent } from '../modals.component';
import { RpcService } from '../../core';
import { ModalsService } from '../modals.service';

import { MatDialogRef } from '@angular/material';

@Component({
  selector: 'app-uninstall',
  templateUrl: './uninstall.component.html',
  styleUrls: ['./uninstall.component.scss']
})

export class UninstallComponent {
  private inProgress: boolean = false;

  constructor(
    @Inject(forwardRef(() => ModalsService))
    private modals: ModalsService,
    public dialogRef: MatDialogRef<ModalsComponent>,
    public rpc: RpcService
  ) {
  }

  async ngOnInit() {
  }

  async uninstall(): Promise<void> {
    this.inProgress = true;
    this.rpc.call('uninstall');
  }

  async backup(): Promise<void> {
    this.openBackupModal();
  }

  private openBackupModal(): void {
    this.modals.open('createWallet', { data: { step: 3, disableBack: true, isRestore: false }, forceOpen: true });
  }

  close(): void {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  }
}
