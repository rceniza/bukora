import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { DashboardSummary } from '../../domain/services/dashboardSummary'
import type { DashboardService } from '../services/DashboardService'

interface DashboardContextValue {
  summary: DashboardSummary
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

const EMPTY_SUMMARY: DashboardSummary = {
  bookingCount: 0,
  upcomingCount: 0,
  upcomingBookings: [],
  totalBalanceDueMinor: 0,
  recentPayments: [],
}

const DashboardContext = createContext<DashboardContextValue>({
  summary: EMPTY_SUMMARY,
  loading: false,
  error: null,
  refresh: async () => undefined,
})

export function DashboardProvider({ service, children }: { service: DashboardService; children: ReactNode }) {
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const now = new Date()
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      setSummary(await service.load(today))
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error('Unable to load dashboard data.'))
    } finally {
      setLoading(false)
    }
  }, [service])

  useEffect(() => { void refresh() }, [refresh])

  return (
    <DashboardContext.Provider value={{ summary, loading, error, refresh }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard(): DashboardContextValue {
  return useContext(DashboardContext)
}
