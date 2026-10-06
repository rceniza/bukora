import type { SettingsRepository, SettingRecord } from '../../../domain/ports/SettingsRepository'

export class LocalStorageSettingsRepository implements SettingsRepository {
  async get(key: string): Promise<SettingRecord | null> {
    const value = globalThis.localStorage.getItem(`bukora.settings.${key}`)
    if (value === null) return null
    return JSON.parse(value) as SettingRecord
  }

  async set(record: SettingRecord): Promise<void> {
    await this.setMany([record])
  }

  async setMany(records: SettingRecord[]): Promise<void> {
    for (const record of records) {
      globalThis.localStorage.setItem(`bukora.settings.${record.key}`, JSON.stringify(record))
    }
  }
}
