import { Injectable } from '@angular/core';
import { IpcService } from '../ipc/ipc.service';
import { NotificationType } from '../models/notification-type.enum';
import { SettingsService } from '../services/settings.service';
import { Observable } from 'rxjs';

@Injectable()
export class NotificationService {
  constructor(
    private _ipc: IpcService,
    private settingsService: SettingsService
  ) {
  }

  /** Send Notification to the backend */
  public sendNotification(type: NotificationType, payload: {
    title: string, 
    desc: string,
    customSound?: any
  }): Observable<any> {
    const settings = this.settingsService.loadSettings();
    const enabledNotifications = settings.display.notify || [];
    if (!window.electron || enabledNotifications.indexOf(type) === -1) {
      return;
    }

    return this._ipc.runCommand('notification', null, payload.title, payload.desc, payload.customSound);
  }
}
