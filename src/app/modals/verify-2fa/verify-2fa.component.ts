import { Component, EventEmitter, Output, Inject } from '@angular/core';
import { Auth2faService } from 'app/core/services/auth-2fa.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { ModalsComponent } from '../modals.component';

const GOOGLE_AUTHENTICATOR_TOKEN_LENGTH = 6;
const GOOGLE_AUTHENTICATOR_PRIVATE_KEY_LENGTH = 16;

@Component({
  selector: 'app-verify-2fa',
  templateUrl: './verify-2fa.component.html',
  styleUrls: ['./verify-2fa.component.scss']
})

export class Verify2faComponent {
  public error: string = null;
  public token: string = null;
  private callback: Function = null;
  private tokenVerificationTimeout = null;
  private tokenVerificationTimeoutDuration = 600;

  @Output() onSuccess: EventEmitter<string> = new EventEmitter<string>();

  constructor(
    public dialogRef: MatDialogRef<ModalsComponent>,
    private auth2faService: Auth2faService,
    @Inject(MAT_DIALOG_DATA) data: any,
  ) {
    this.callback = data.data.callback;
  }

  private async Verify(token: string): Promise<void> {
    try {
      await this.auth2faService.verify(token);
      this.onSuccess.emit(token);
      if (!!this.callback) {
        this.callback(token);
      }
      this.close();
    } catch(e) {
      this.onError(e.error);
    }
  }

  public async onVerifyClick(): Promise<void> {
    await this.Verify(this.token);
  }

  public async onTokenChange(token: string): Promise<void> {
	if( ( this.token.length == GOOGLE_AUTHENTICATOR_TOKEN_LENGTH ) || ( this.token.length == GOOGLE_AUTHENTICATOR_PRIVATE_KEY_LENGTH ) )	{
      this.error = null;
      clearTimeout(this.tokenVerificationTimeout);
      this.tokenVerificationTimeout = setTimeout(async () => await this.Verify(token), this.tokenVerificationTimeoutDuration);
    }
  }

  private onError(e: any): void {
    if (e.message === 'Invalid Token') {
      this.error = 'Incorrect code, please try again.';
    } else {
      this.error = e.message;
    }
  }

  close(): void {
    this.dialogRef.componentInstance.close();
  }
}
