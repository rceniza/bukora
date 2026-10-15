import { NotificationInboxService } from '../../application/services/NotificationInboxService'
import { LocalStorageBookingRepository } from './bookingRepository.web'
import { LocalStorageSettingsRepository } from './web/LocalStorageSettingsRepository'
import { SettingsNotificationReadRepository } from './NotificationReadRepository'

const settingsRepository = new LocalStorageSettingsRepository()

export const notificationInboxService = new NotificationInboxService(
  new LocalStorageBookingRepository(),
  new SettingsNotificationReadRepository(settingsRepository),
)
