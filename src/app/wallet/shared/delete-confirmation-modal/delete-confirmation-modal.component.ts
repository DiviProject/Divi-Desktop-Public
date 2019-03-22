import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MatDialogRef } from '@angular/material';

@Component({
  selector: 'app-delete-confirmation-modal',
  templateUrl: './delete-confirmation-modal.component.html',
  styleUrls: ['./delete-confirmation-modal.component.scss']
})
export class DeleteConfirmationModalComponent implements OnInit {

  public dialogContent: string;
  public title: string;
  public message: string;
  public deleteButtonContent: string;

  @Output() onDelete: EventEmitter<string> = new EventEmitter<string>();
  @Output() onCancel: EventEmitter<string> = new EventEmitter<string>();

  constructor(private dialogRef: MatDialogRef<DeleteConfirmationModalComponent>) { }

  ngOnInit(): void {
    this.dialogContent = (this.dialogContent) ? this.dialogContent : 'This item';
    this.title = (this.title) ? this.title : 'Delete address?';
    this.message = (this.message) ? this.message : 'Are you sure you want to delete this address from your Address book?';
    this.deleteButtonContent = (this.deleteButtonContent) ? this.deleteButtonContent : 'Yes, delete';
  }

  onConfirmDelete(): void {
    this.onDelete.emit();
    this.dialogClose();
  }

  onConfirmCancel(): void {
    this.onCancel.emit();
    this.dialogClose();
  }

  dialogClose(): void {
    this.dialogRef.close();
  }
}
