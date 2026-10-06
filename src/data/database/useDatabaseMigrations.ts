import { drizzle } from 'drizzle-orm/expo-sqlite'
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'
import migrations from '../../../drizzle/migrations'
import * as schema from '../../../db/schema'
import { expoDatabase } from './index'

const drizzleDatabase = drizzle(expoDatabase, { schema })

export function useDatabaseMigrations() {
  return useMigrations(drizzleDatabase, migrations)
}
