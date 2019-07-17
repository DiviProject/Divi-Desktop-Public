import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

import { RpcModule } from './rpc/rpc.module';

import { IpcService } from './ipc/ipc.service';
import { ZmqService } from './zmq/zmq.service';

import { NotificationService } from './notification/notification.service';
import { SnackbarService } from './snackbar/snackbar.service';
import { UpdateService } from './update/update.service';
import { CacheService } from './cache/cache.service';
import { DaemonService } from './daemon/daemon.service';
import { DiviService } from './services/divi.service';
import { BalanceService } from './services/balance.service';
import { NewTxNotifierService } from './services/new-tx-notifier.service';
import { TransactionsService } from './services/transactions.service';
import { InvocationService } from './services/invocation.service';
import { ExportService } from './services/export.service';
import { SecutiyService } from './services/security.service';
import { AppSettingsService } from './services/app-settings.service';
import { Auth2faService } from './services/auth-2fa.service';
import { UserInfoService } from './services/user-info.service';
import { UserSettingsService } from './services/user-settings.service';
import { PrimerService } from './services/primer.service';
import { SettingsService } from './services/settings.service';

  /*
    Loading the core library will intialize IPC & RPC
  */
@NgModule({
  imports: [
    CommonModule,
    RpcModule.forRoot() // TODO: should be here?
  ],
  exports: [
    HttpClientModule
  ],
  declarations: []
})
export class CoreModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: CoreModule,
      providers: [
        IpcService,
        ZmqService,
        SnackbarService,
        NotificationService,
        UpdateService,
        CacheService,
        DaemonService,
        PrimerService,
        SettingsService,

        DiviService,
        BalanceService,
        NewTxNotifierService,
        TransactionsService,
        InvocationService,
        ExportService,
        SecutiyService,
        AppSettingsService,

        Auth2faService,
        UserInfoService,
        UserSettingsService
      ]
    };
  }
}
