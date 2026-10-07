import type { AppSettings } from '../../domain/models'
import type { BackupSnapshot, BackupStorage } from '../../application/services/BackupService'
import { SettingsService } from '../../application/services/SettingsService'
import { bookingRepository } from './bookingRepository'
import { LocalStorageSettingsRepository } from './web/LocalStorageSettingsRepository'

export class LocalStorageBackupStorage implements BackupStorage {
  private readonly settings = new SettingsService(new LocalStorageSettingsRepository())

  async load(): Promise<BackupSnapshot> {
    const [settings, bookings] = await Promise.all([this.settings.load(), bookingRepository.listAll()])
    return { settings, bookings }
  }

  async replace(snapshot: BackupSnapshot): Promise<void> {
    await bookingRepository.replaceAll(snapshot.bookings)
    await this.settings.save(snapshot.settings satisfies AppSettings)
  }
}

export const backupStorage: BackupStorage = new LocalStorageBackupStorage()
