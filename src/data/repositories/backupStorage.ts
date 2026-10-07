import type { BackupStorage } from '../../application/services/BackupService'
import { sqliteClient } from '../database'
import { SqliteBackupStorage } from './SqliteBackupStorage'

export { SqliteBackupStorage }
export const backupStorage: BackupStorage = new SqliteBackupStorage(sqliteClient)
