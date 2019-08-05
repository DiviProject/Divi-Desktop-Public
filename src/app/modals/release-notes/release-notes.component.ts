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
    let lines = this.releaseInfo.releaseNotes.split('\n');
    lines = lines.map(l => this.prepareLine(l)).filter(l => !!l);
    this.releaseInfo.releaseNotes = lines.join('');
  }

  private prepareLine(line: string): string {
    let newLine = this.replace(line, '\r', '').trim();

    if (newLine.indexOf('&nbsp;') === 0) {
      newLine = newLine.replace('&nbsp;', '');
    }

    newLine = newLine.trim();

    if (!newLine) {
      return '';
    }

    if (newLine.indexOf('##') === 0) {
      return `<h2>${newLine.replace('##', '').trim()}</h2>`;
    }

    if (newLine.indexOf('#') === 0) {
      return `<h1>${newLine.replace('#', '').trim()}</h1>`;
    }

    if (newLine.indexOf('*') === 0) {
      return `<li>${newLine.replace('*', '').trim()}</li>`;
    }

    return newLine;
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
