import { openDatabaseSync } from 'expo-sqlite'
import { ExpoSqliteClient } from './ExpoSqliteClient'

export const expoDatabase = openDatabaseSync('bukora.db')
expoDatabase.execSync('PRAGMA foreign_keys = ON')

export const sqliteClient = new ExpoSqliteClient(expoDatabase)
