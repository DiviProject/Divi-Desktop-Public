import { TestBed, inject } from '@angular/core/testing';

import { SharedModule } from '../../shared/shared.module';
import { RpcModule } from '../../../core/rpc/rpc.module';
import { CoreModule } from '../../../core/core.module';

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
