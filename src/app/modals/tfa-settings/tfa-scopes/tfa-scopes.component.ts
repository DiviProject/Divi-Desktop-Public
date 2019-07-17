import { Component, EventEmitter, OnChanges, Output, Input } from '@angular/core';
import { TfaScopesModel, Scope, TfaScopesHelper } from 'app/core/models/tfa-scopes.model';

@Component({
  selector: 'app-tfa-scopes',
  templateUrl: './tfa-scopes.component.html',
  styleUrls: ['./tfa-scopes.component.scss']
})

export class TfaScopesComponent implements OnChanges {
  private list: Scope[] = TfaScopesHelper.getList();

  public model: {
    [key: string]: boolean
  } = {};

  @Input() public scopes: string = null;
  @Output() onChange: EventEmitter<string> = new EventEmitter<string>();

  public getGroup(group: string): Scope[] {
    return this.list.filter(i => i.group === group);
  }

  ngOnChanges() {
    this.model = new TfaScopesModel(this.scopes).toDictionary(); 
  }

  public onScopeChange(): void {
    this.onChange.emit(new TfaScopesModel(this.model).toString());
  }
}
