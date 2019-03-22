import { Component, OnInit, Inject } from '@angular/core';

import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { ModalsComponent } from '../modals.component';

@Component({
  templateUrl: './release-notes.component.html',
  styleUrls: ['./release-notes.component.scss']
})
export class ReleaseNotesComponent implements OnInit {
  public releaseInfo: any;

  constructor(
    public dialogRef: MatDialogRef<ModalsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
  }

  ngOnInit(): void {
    this.releaseInfo = this.data.info;
    this.prepareReleaseNotes();
  }

  private prepareReleaseNotes(): void {
    this.releaseInfo.releaseNotes = this.replace(this.releaseInfo.releaseNotes, '\r\n', '<br />');
    const boldText = ['Bug Fixes', 'Features', 'Changelog'];
    boldText.forEach(t => this.releaseInfo.releaseNotes = this.replace(this.releaseInfo.releaseNotes, t, `<b>${t}</b>`));
  }

  private replace(str: string, oldValue: string, newValue: string): string {
    let temp = str;
    let index = 0;
    while (temp.indexOf(oldValue, index) > -1) {
      index = temp.indexOf(oldValue, index) + newValue.length; 
      temp = temp.replace(oldValue, newValue);
    }
    return temp;
  }

  close(): void {
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  }
}
