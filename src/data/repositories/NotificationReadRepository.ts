import type { NotificationReadRepository } from '../../application/services/NotificationInboxService'
import type { SettingsRepository } from '../../domain/ports/SettingsRepository'

const READ_IDS_KEY = 'notificationInbox.readIds.v1'
const MAX_SAVED_READ_IDS = 500

export class SettingsNotificationReadRepository implements NotificationReadRepository {
  constructor(private readonly settings: SettingsRepository) {}

  async listReadIds(): Promise<string[]> {
    const record = await this.settings.get(READ_IDS_KEY)
    if (!record) return []
    try {
      const value: unknown = JSON.parse(record.value)
      return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []
    } catch {
      return []
    }
  }

  async markRead(ids: string[]): Promise<void> {
    const saved = await this.listReadIds()
    const readIds = [...new Set([...saved, ...ids])].slice(-MAX_SAVED_READ_IDS)
    await this.settings.set({
      key: READ_IDS_KEY,
      value: JSON.stringify(readIds),
      updatedAt: new Date().toISOString(),
    })
  }
}
