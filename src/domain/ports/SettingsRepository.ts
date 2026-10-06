export interface SettingRecord {
  key: string
  value: string
  updatedAt: string
}

export interface SettingsRepository {
  get(key: string): Promise<SettingRecord | null>
  set(setting: SettingRecord): Promise<void>
  setMany(settings: SettingRecord[]): Promise<void>
}
