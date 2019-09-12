import { Component, Input, OnChanges, OnInit } from '@angular/core';

import { Amount } from '../../../../core/util/utils';
import { Log } from 'ng2-logger';
import { PriceService } from 'app/core/services/price.service';
import { SettingsService } from 'app/core';
import { IExchangeSetting, ExchangeSettingsHelper } from 'app/core/models/exchange-settings.model';

@Component({
  selector: 'app-amount',
  templateUrl: './amount.component.html',
  styleUrls: ['./amount.component.scss']
})
export class AmountComponent implements OnChanges, OnInit {
  @Input() public value: number = 0;
  @Input() public type: string = "";
  @Input() public mode: string = "full"; 
  @Input() public tooltip: string = ""; 

  public amount: Amount = new Amount(0);
  public diviPrices: any = null;
  public exchangeSettings: IExchangeSetting[] = [];

  private log: any = Log.create('amount.component');

  constructor(
    private priceService: PriceService,
    private settingsService: SettingsService
  ) { }

  ngOnChanges(): void {
    this.amount = new Amount(this.value || 0);
  }

  async ngOnInit(): Promise<void> {
    this.diviPrices = await this.priceService.getPrices();
    const settings = this.settingsService.loadSettings();
    this.exchangeSettings = ExchangeSettingsHelper.getSettings(settings.display.exchanges).filter(s => s.enabled);
  }
}
