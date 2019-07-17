import { Component, EventEmitter, Output, Input } from '@angular/core';
import { UserSettingsService } from 'app/core/services/user-settings.service';
import { Auth2faService } from 'app/core/services/auth-2fa.service';
import { ModalsService } from 'app/modals/modals.service';

@Component({
  selector: 'app-update-2fa',
  templateUrl: './update-2fa.component.html',
  styleUrls: ['./update-2fa.component.scss']
})

export class Update2faComponent {
  private settings: {
    twoFactorAuthEnabled: boolean,
    twoFactorAuthScopes: string,
    twoFactorAuthScopesTemp: string
  } = null; 

  public error: string = null;
  public scopes: string = "";

  @Input() public isModal: boolean = false;
  @Output() public onChange: EventEmitter<void> = new EventEmitter<void>();
  @Output() public onClose: EventEmitter<void> = new EventEmitter<void>();

  constructor(
    private userSettingsService: UserSettingsService,
    private auth2faService: Auth2faService,
    private modalService: ModalsService
  ) {
  }

  async ngOnInit() {
    try {
      await this.init();
    } catch(e) {
      this.onError(e.error);
    }
  }

  async init(): Promise<void> {
    this.settings = await this.userSettingsService.getSettings();
    this.settings.twoFactorAuthScopesTemp = this.settings.twoFactorAuthScopes;
  }

  public onScopesChange(scopes: string): void {
    this.settings.twoFactorAuthScopesTemp = scopes;
  }

  async onDisableClick(): Promise<void> {
    const result = await this.modalService.verify2faToken();

    if (result.success) {
      await this.auth2faService.disable(result.token);
      this.onClose.emit();
    }
  }

  async onSaveClick(): Promise<void> {
    const result = await this.modalService.verify2faToken();

    if (result.success) {
      await this.auth2faService.update(result.token, this.settings.twoFactorAuthScopesTemp);
      this.init();
      this.onChange.emit();
      this.onClose.emit();
    }
  }

  onCloseClick(): void {
    this.onClose.emit();
  }

  private onError(e: any): void {
    // show error
    this.error = e.message;
    console.log(e);
  }
}
