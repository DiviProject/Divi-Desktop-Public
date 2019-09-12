import { async, ComponentFixture, TestBed, fakeAsync } from '@angular/core/testing';

import { ModalsModule } from '../../modals/modals.module';
import { SharedModule } from '../shared/shared.module';
import { WalletModule } from '../wallet/wallet.module';
import { CoreModule } from '../../core/core.module';
import { CoreUiModule } from '../../core-ui/core-ui.module';

import { OverviewComponent } from './overview.component';
import { TransactionsStateService } from '../../core/services/transactions-state.service';

import { TransactionsTableComponent } from 'app/wallet/wallet/shared/transaction-table/transaction-table.component';
import { MockTransactionService } from 'app/wallet/wallet/shared/transaction.mockservice';


describe('OverviewComponent', () => {
  let component: OverviewComponent;
  let fixture: ComponentFixture<OverviewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        SharedModule,
        WalletModule.forRoot(),
        CoreModule.forRoot(),
        CoreUiModule.forRoot(),
        ModalsModule.forRoot(),
      ],
      declarations: [
        OverviewComponent
      ]
    })

  // Override TransactionsTableComponent's TransactionService
  .overrideComponent(TransactionsTableComponent, {
    set: {
      providers: [
        { provide: TransactionsStateService, useClass: MockTransactionService }
      ]
    }
  })

      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
