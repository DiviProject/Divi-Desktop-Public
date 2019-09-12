import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClipboardModule } from 'ngx-clipboard';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MaterialModule } from '../core-ui/material/material.module';
import { DirectiveModule } from '../core-ui/directive/directive.module';

import { ModalsService } from './modals.service';

import { ModalsComponent } from './modals.component';
import { DeleteConfirmationModalComponent } from '../wallet/shared/delete-confirmation-modal/delete-confirmation-modal.component';

/* modals */
import { CreateWalletComponent } from './createwallet/createwallet.component';
import { SyncingComponent } from './syncing/syncing.component';
import { UnlockwalletComponent } from './unlockwallet/unlockwallet.component';
import { EncryptwalletComponent } from './encryptwallet/encryptwallet.component';
import { AlertComponent } from './shared/alert/alert.component';
/* shared in modals */
import { PassphraseComponent } from './createwallet/passphrase/passphrase.component';
import { PassphraseService } from './createwallet/passphrase/passphrase.service';
import { PasswordComponent } from './shared/password/password.component';
import { MultiwalletComponent } from './multiwallet/multiwallet.component';

import { SnackbarService } from '../core/snackbar/snackbar.service';
import { AutoUpdateComponent } from './auto-update/auto-update.component';
import { ReleaseNotesComponent } from './release-notes/release-notes.component';
import { WalletVerifyResultComponent } from './wallet-verify-result/wallet-verify-result.component';
import { ShutdownComponent } from './shutdown/shutdown.component';
import { ChangePasswordComponent } from './change-password/change-password.component';
import { Verify2faComponent } from './verify-2fa/verify-2fa.component';
import { PrimerComponent } from './primer/primer.component';
import { CombineUtxoComponent } from './combine-utxo/combine-utxo.component';
import { UninstallComponent } from './uninstall/uninstall.component';
import { TfaSettingsComponent } from './tfa-settings/tfa-settings.component';
import { Setup2faComponent } from './tfa-settings/setup-2fa/setup-2fa.component';
import { Update2faComponent } from './tfa-settings/update-2fa/update-2fa.component';
import { TfaScopesComponent } from './tfa-settings/tfa-scopes/tfa-scopes.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    BrowserAnimationsModule,
    ClipboardModule,
    /* own */
    MaterialModule,
    DirectiveModule
  ],
  declarations: [
    ModalsComponent,
    DeleteConfirmationModalComponent,
    PassphraseComponent,
    PasswordComponent,
    CreateWalletComponent,
    SyncingComponent,
    UnlockwalletComponent,
    EncryptwalletComponent,
    AlertComponent,
    MultiwalletComponent,
    AutoUpdateComponent,
    ReleaseNotesComponent,
    WalletVerifyResultComponent,
    ShutdownComponent,
    ChangePasswordComponent,
    PrimerComponent,
    CombineUtxoComponent,
    UninstallComponent,

    Verify2faComponent,
    TfaScopesComponent,
    Setup2faComponent,
    Update2faComponent,
    TfaSettingsComponent
  ],
  exports: [
    ModalsComponent,
    DeleteConfirmationModalComponent,
    ClipboardModule
  ],
  providers: [
    ModalsService,
    PassphraseService,
    SnackbarService
  ],
  entryComponents: [
    ModalsComponent,
    DeleteConfirmationModalComponent,
    SyncingComponent,
    UnlockwalletComponent,
    EncryptwalletComponent,
    AlertComponent,
    AutoUpdateComponent,
    ReleaseNotesComponent,
    WalletVerifyResultComponent,
    ShutdownComponent,
    ChangePasswordComponent,
    PrimerComponent,
    CombineUtxoComponent,
    UninstallComponent,

    Verify2faComponent,
    TfaScopesComponent,
    Setup2faComponent,
    Update2faComponent,
    TfaSettingsComponent
  ],
})
export class ModalsModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: ModalsModule,
      providers: [
        ModalsService
      ]
    };
  }
}

export { ModalsService } from './modals.service';
export { PassphraseService } from './createwallet/passphrase/passphrase.service';
