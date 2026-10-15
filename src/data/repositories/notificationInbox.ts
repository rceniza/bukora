import { NotificationInboxService } from '../../application/services/NotificationInboxService'
import { settingsRepository } from './index'
import { bookingRepository } from './bookingRepository'
import { SettingsNotificationReadRepository } from './NotificationReadRepository'

export const notificationInboxService = new NotificationInboxService(
  bookingRepository,
  new SettingsNotificationReadRepository(settingsRepository),
)
