import { NotificationType } from "./notification-type.enum";

export class INotificationSetting {
    public name: string;
    public value: NotificationType;
    public group: string;
    public enabled?: boolean;
}

export class NotificationSettingsHelper {
    public static getSettings(enabled?: NotificationType[]): INotificationSetting[] {
        enabled = enabled || [];

        return [{
            name: 'Incoming transaction',
            value: NotificationType.IncomingTransaction,
            group: 'general',
            enabled: enabled.indexOf(NotificationType.IncomingTransaction) >= 0
        }, {
            name: 'Incoming reward',
            value: NotificationType.IncomingReward,
            group: 'general',
            enabled: enabled.indexOf(NotificationType.IncomingReward) >= 0
        }, {
            name: 'Transaction sent successfully',
            value: NotificationType.TransactionSentSuccessfully,
            group: 'general',
            enabled: enabled.indexOf(NotificationType.TransactionSentSuccessfully) >= 0
        }, {
            name: 'Telegram announcements',
            value: NotificationType.TelegramAnnouncements,
            group: 'general',
            enabled: enabled.indexOf(NotificationType.TelegramAnnouncements) >= 0
        }];
    }
}