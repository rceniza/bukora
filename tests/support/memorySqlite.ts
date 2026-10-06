import initSqlJs from 'sql.js'
import type { Database as SqlJsDatabase, SqlJsStatic } from 'sql.js'
import type { SqliteClient, SqliteValue } from '../../src/data/database/SqliteClient'

export class MemorySqliteClient implements SqliteClient {
  constructor(private readonly database: SqlJsDatabase) {}

  async execute(sql: string, values: SqliteValue[] = []): Promise<void> {
    this.database.run(sql, values)
  }

  async first<Row>(sql: string, values: SqliteValue[] = []): Promise<Row | null> {
    const statement = this.database.prepare(sql)
    try {
      statement.bind(values)
      return statement.step() ? statement.getAsObject() as Row : null
    } finally {
      statement.free()
    }
  }

  async all<Row>(sql: string, values: SqliteValue[] = []): Promise<Row[]> {
    const statement = this.database.prepare(sql)
    try {
      statement.bind(values)
      const rows: Row[] = []
      while (statement.step()) rows.push(statement.getAsObject() as Row)
      return rows
    } finally {
      statement.free()
    }
  }

  async transaction<Result>(work: (transaction: SqliteClient) => Promise<Result>): Promise<Result> {
    this.database.run('BEGIN')
    try {
      const result = await work(this)
      this.database.run('COMMIT')
      return result
    } catch (error) {
      this.database.run('ROLLBACK')
      throw error
    }
  }
}

let sqliteModulePromise: Promise<SqlJsStatic> | undefined

export async function createMemorySqlite(migration: string) {
  sqliteModulePromise ??= initSqlJs({ locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm') })
  const sqliteModule = await sqliteModulePromise
  const database = new sqliteModule.Database()
  database.run('PRAGMA foreign_keys = ON')
  database.run(migration.replaceAll('--> statement-breakpoint', ''))
  return { database, client: new MemorySqliteClient(database) }
}
