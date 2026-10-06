import type { SettingsRepository, SettingRecord } from '../contracts/SettingsRepository'
import type { SqliteClient } from '../../database/SqliteClient'

export class SqliteSettingsRepository implements SettingsRepository {
  constructor(private readonly client: SqliteClient) {}

  get(key: string): Promise<SettingRecord | null> {
    return this.client.first<SettingRecord>(
      'SELECT key, value, updated_at AS updatedAt FROM app_settings WHERE key = ?',
      [key],
    )
  }

  async set(setting: SettingRecord): Promise<void> {
    await this.client.execute(
      `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [setting.key, setting.value, setting.updatedAt],
    )
  }
}
