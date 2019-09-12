import { TestBed, inject } from '@angular/core/testing';

import { SharedModule } from '../../wallet/shared/shared.module';
import { RpcModule } from '../rpc/rpc.module';
import { CoreModule } from '../core.module';

import { TransactionsStateService } from './transactions-state.service';


describe('TransactionsStateService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        SharedModule,
        RpcModule.forRoot(),
        CoreModule.forRoot()
      ],
      providers: [TransactionsStateService]
    });
  });

  it('should ...', inject([TransactionsStateService], (service: TransactionsStateService) => {
    expect(service).toBeTruthy();
  }));
});
