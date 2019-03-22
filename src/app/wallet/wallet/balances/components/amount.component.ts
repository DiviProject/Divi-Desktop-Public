import { Component, Input, OnChanges, OnInit } from '@angular/core';

import { Amount } from '../../../../core/util/utils';
import { DiviService } from '../../../../core/services/divi.service';

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

  constructor(private diviService: DiviService) { }

  ngOnChanges(): void {
    this.amount = new Amount(this.value || 0);
  }

  ngOnInit(): void {
    this.diviService.getDiviPrices()
      .subscribe(prices => this.diviPrices = prices);
  }
}
