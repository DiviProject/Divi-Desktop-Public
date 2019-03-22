import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {CreateWalletService} from './createwallet.service';

@NgModule({
  imports: [
    CommonModule
  ],
  providers: [
    CreateWalletService,
  ],
  declarations: []
})
export class CreateWalletModule { }