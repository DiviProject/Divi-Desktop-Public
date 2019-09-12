import { Component, OnDestroy, OnInit } from '@angular/core';
import { interval } from 'rxjs/observable/interval';

import { environment } from '../../../../environments/environment';
import { ReleaseNotification } from './release-notification.model';

import { ClientVersionService } from '../../../core/http/client-version.service';
import { Log } from 'ng2-logger';

@Component({
  selector: 'app-release-notification',
  templateUrl: './release-notification.component.html',
  styleUrls: ['./release-notification.component.scss']
})
export class ReleaseNotificationComponent implements OnInit, OnDestroy {

  public currentClientVersion: string = environment.version;
  public latestClientVersion: string;
  public releaseUrl: string;
  private destroyed: boolean = false;
  private log: any = Log.create('release-notifications.component');

  constructor(private clientVersionService: ClientVersionService) { }

  ngOnInit() {
    // check new update in every 30 minute
    const versionInterval = interval(1800000);
    versionInterval.takeWhile(() => !this.destroyed).subscribe(val => this.getCurrentClientVersion());
  }

  // no need to destroy.
  ngOnDestroy() {
    this.destroyed = true;
  }

  getCurrentClientVersion() {
    this.clientVersionService.getCurrentVersion()
      .subscribe((response: ReleaseNotification) => {
        if (response.tag_name) {
          this.latestClientVersion = response.tag_name.substring(1);
        }

        this.releaseUrl = response.html_url;
      }, err => this.log.er('getCurrentClientVersion: ', err));
  }

  isNewUpdateAvailable(): boolean {
    return (parseFloat(this.currentClientVersion) < parseFloat(this.latestClientVersion));
  }

}
