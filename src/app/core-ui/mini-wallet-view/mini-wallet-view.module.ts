import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material';

import { MaterialModule } from '../material/material.module';
import { DirectiveModule } from '../directive/directive.module';
import { MiniWalletViewComponent } from './mini-wallet-view.component';
import { TransactionsStateService } from 'app/core/services/transactions-state.service';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    MaterialModule,
    MatIconModule,
    DirectiveModule
  ],
  exports: [
    MiniWalletViewComponent
  ],
  declarations: [
    MiniWalletViewComponent
  ],
  entryComponents: [],
  providers: [
    TransactionsStateService
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class MiniWalletViewModule { }
