import { Component, OnInit } from '@angular/core';
import { MatIconRegistry } from '@angular/material'; // TODO: move to material module?
import { Log } from 'ng2-logger';
import { SettingsService, RpcService } from './core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {

  log: any = Log.create('app.component');

  // multiwallet: any = [];

  constructor(
    private _iconRegistry: MatIconRegistry,
    public settingsService: SettingsService,
    private router: Router,
    private rpc: RpcService
  ) {
    _iconRegistry
      .registerFontClassAlias('partIcon', 'part-icon')
      .registerFontClassAlias('faIcon', 'fa');

    this.settingsService.minimode$.subscribe((minimode: boolean) => {
      this.rpc.call('change-mode', [minimode]);
    });
  }

  ngOnInit() {

  }
}
