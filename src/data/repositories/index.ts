import { sqliteClient } from '../database'
import { SqliteBookingRepository } from './sqlite/SqliteBookingRepository'
import { SqliteSettingsRepository } from './sqlite/SqliteSettingsRepository'

export const bookingRepository = new SqliteBookingRepository(sqliteClient)
export const settingsRepository = new SqliteSettingsRepository(sqliteClient)
