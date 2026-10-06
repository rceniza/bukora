export type SqliteValue = string | number | null | Uint8Array

export interface SqliteClient {
  execute(sql: string, values?: SqliteValue[]): Promise<void>
  first<Row>(sql: string, values?: SqliteValue[]): Promise<Row | null>
  all<Row>(sql: string, values?: SqliteValue[]): Promise<Row[]>
  transaction<Result>(work: (transaction: SqliteClient) => Promise<Result>): Promise<Result>
}
