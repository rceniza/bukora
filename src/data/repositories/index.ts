import { sqliteClient } from '../database'
import { bookingRepository } from './bookingRepository'
import { SqliteSettingsRepository } from './sqlite/SqliteSettingsRepository'

export const settingsRepository = new SqliteSettingsRepository(sqliteClient)
export { bookingRepository }
