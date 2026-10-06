import type { SQLiteDatabase } from 'expo-sqlite'
import type { SqliteClient, SqliteValue } from './SqliteClient'

export class ExpoSqliteClient implements SqliteClient {
  constructor(private readonly database: SQLiteDatabase) {}

  async execute(sql: string, values: SqliteValue[] = []): Promise<void> {
    await this.database.runAsync(sql, ...values)
  }

  first<Row>(sql: string, values: SqliteValue[] = []): Promise<Row | null> {
    return this.database.getFirstAsync<Row>(sql, ...values)
  }

  all<Row>(sql: string, values: SqliteValue[] = []): Promise<Row[]> {
    return this.database.getAllAsync<Row>(sql, ...values)
  }

  transaction<Result>(work: (transaction: SqliteClient) => Promise<Result>): Promise<Result> {
    let result: Result
    return this.database.withExclusiveTransactionAsync(async (transaction) => {
      result = await work(new ExpoSqliteClient(transaction))
    }).then(() => result!)
  }
}
