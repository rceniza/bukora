import { sqliteClient } from '../database'
import { SqliteBookingRepository } from './sqlite/SqliteBookingRepository'

export const bookingRepository = new SqliteBookingRepository(sqliteClient)
