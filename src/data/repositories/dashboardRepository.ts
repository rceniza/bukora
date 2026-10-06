import { sqliteClient } from '../database'
import { SqliteDashboardRepository } from './sqlite/SqliteDashboardRepository'

export const dashboardRepository = new SqliteDashboardRepository(sqliteClient)
