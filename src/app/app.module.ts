import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

import { CoreModule } from './core/core.module';
import { CoreUiModule } from './core-ui/core-ui.module';
import { ModalsModule } from './modals/modals.module';
import { DirectiveModule } from './core-ui/directive/directive.module';

import { MultiwalletModule } from './multiwallet/multiwallet.module';
// import { WalletViewsModule } from './wallet/wallet.module';

import { AppComponent } from './app.component';
import { routing } from './app.routing';
import { NewTxNotifierService } from './core';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    // HttpClientModule,
    BrowserAnimationsModule,
    routing,
    /* own */
    DirectiveModule,
    CoreModule.forRoot(),
    CoreUiModule.forRoot(),
    ModalsModule.forRoot(),
    // WalletViewsModule, // shouldn't be needed?
    MultiwalletModule
  ],
  bootstrap: [ AppComponent ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})

export class AppModule {
  constructor(private newTxNotifierService: NewTxNotifierService) {
  }
}
