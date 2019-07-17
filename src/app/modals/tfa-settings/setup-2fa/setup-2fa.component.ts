import { Component, EventEmitter, Output, Input } from '@angular/core';
import { Auth2faService } from 'app/core/services/auth-2fa.service';

enum TfaSetupStepsEnum {
  Scan = 0,
  Confirm = 1,
  Scopes = 2,
  Verify = 3
}

@Component({
  selector: 'app-setup-2fa',
  templateUrl: './setup-2fa.component.html',
  styleUrls: ['./setup-2fa.component.scss']
})

export class Setup2faComponent {
  public info: any = null;
  public token: string = "";
  public error: string = null;
  public scopes: string = "";

  public steps: any = TfaSetupStepsEnum;
  public currentStep: TfaSetupStepsEnum = TfaSetupStepsEnum.Scan;

  @Input() public isModal: boolean = false;
  @Output() public onSuccess: EventEmitter<void> = new EventEmitter<void>();
  @Output() public onClose: EventEmitter<void> = new EventEmitter<void>();

  constructor(private auth2faService: Auth2faService) {
  }

  async ngOnInit() {
    try {
      this.info = await this.auth2faService.info();
    } catch(e) {
      this.onError(e.error);
    }
  }

  public async onNextClick(): Promise<void> {
    switch(this.currentStep) {
      case TfaSetupStepsEnum.Verify: 
        return await this.enable();
      default: 
        this.currentStep++;
        break;
    }

    this.token = null;
    this.error = null;
  }

  public async onBackClick(): Promise<void> {
    switch(this.currentStep) {
      case TfaSetupStepsEnum.Scan: 
        this.close();
        break;
      default: 
        this.currentStep--;
        break;
    }

    this.token = null;
    this.error = null;
  }

  public onScopesChange(scopes: string): void {
    this.scopes = scopes;
  }

  private async enable(): Promise<void> {
    try {
      await this.auth2faService.verify(this.token);
      await this.auth2faService.enable(this.token, this.scopes);
      this.onSuccess.emit();
      this.onClose.emit();
    } catch(e) {
      this.onError(e.error);
    }
  }

  private close(): void {
    this.onClose.emit();
  }

  private onError(e: any): void {
    if (e.message === 'Invalid Token') {
      this.error = 'Incorrect code, please try again.';
    } else {
      this.error = e.message;
    }
    console.log(e);
  }
}