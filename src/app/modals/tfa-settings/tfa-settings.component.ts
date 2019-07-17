import { Component, OnInit } from '@angular/core';
import { UserSettingsService } from 'app/core/services/user-settings.service';
import { ModalsComponent } from '../modals.component';
import { MatDialogRef } from '@angular/material';

@Component({
  templateUrl: './tfa-settings.component.html',
  styleUrls: ['./tfa-settings.component.scss']
})

export class TfaSettingsComponent implements OnInit {
  public userSettings: any;

  constructor(
    public dialogRef: MatDialogRef<ModalsComponent>,
    private userSettingsService: UserSettingsService
    ) {
  }

  async ngOnInit(): Promise<void> {
    this.userSettings = await this.userSettingsService.getSettings();
  }

  onClose(): void {
    this.dialogRef.componentInstance.close();
  }

  async onTfaChanged(): Promise<void> {
    await this.ngOnInit();
  }
}
