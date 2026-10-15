import type { SettingsRepository, SettingRecord } from '../../domain/ports/SettingsRepository'
import { SettingsNotificationReadRepository } from './NotificationReadRepository'

describe('settings-backed notification read state', () => {
  it('stores unique read IDs and tolerates a malformed local value', async () => {
    let record: SettingRecord | null = { key: 'notificationInbox.readIds.v1', value: 'not-json', updatedAt: '' }
    const settings = {
      get: jest.fn(async () => record),
      set: jest.fn(async (value: SettingRecord) => { record = value }),
    } as unknown as SettingsRepository
    const repository = new SettingsNotificationReadRepository(settings)

    await expect(repository.listReadIds()).resolves.toEqual([])
    await repository.markRead(['one', 'two', 'one'])
    await expect(repository.listReadIds()).resolves.toEqual(['one', 'two'])
  })
})
