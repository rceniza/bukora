import { addDays, format } from 'date-fns'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import type { BookingId } from '../src/domain/models'
import type { DashboardSummary } from '../src/domain/services/dashboardSummary'
import DashboardScreen from '../app/(tabs)/index'

const mockPush = jest.fn()
const mockRefresh = jest.fn()
let mockFocusCallback: (() => void | (() => void)) | undefined
const checkInDate = format(addDays(new Date(), 2), 'yyyy-MM-dd')
const checkOutDate = format(addDays(new Date(), 4), 'yyyy-MM-dd')
const availableDate = format(new Date(), 'yyyy-MM-dd')
let mockSummary: DashboardSummary = {
  bookingCount: 1,
  upcomingCount: 1,
  upcomingBookings: [],
  availabilityBookings: [{
    id: '10000000-0000-4000-8000-000000000001' as BookingId,
    guestName: 'Lea Santos',
    checkInDate,
    checkOutDate,
    status: 'tentative',
  }],
  totalBalanceDueMinor: 0,
  recentPayments: [],
}

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: (callback: () => void | (() => void)) => { mockFocusCallback = callback },
}))

jest.mock('../src/application/dashboard/DashboardContext', () => ({
  useDashboard: () => ({ summary: mockSummary, loading: false, error: null, refresh: mockRefresh }),
}))

describe('dashboard availability calendar feature', () => {
  beforeEach(() => { mockPush.mockClear(); mockRefresh.mockClear(); mockFocusCallback = undefined })

  it('places the availability calendar directly above upcoming bookings', () => {
    const { toJSON } = render(<DashboardScreen />)
    const renderedText = flattenText(toJSON())

    expect(renderedText.indexOf('Availability')).toBeGreaterThanOrEqual(0)
    expect(renderedText.indexOf('Availability')).toBeLessThan(renderedText.indexOf('Upcoming bookings'))
    expect(renderedText.indexOf('Availability')).toBeGreaterThan(renderedText.indexOf('Balance due'))
  })

  it('routes an available date to a prefilled booking and an occupied date to its booking detail', () => {
    render(<DashboardScreen />)

    fireEvent.press(screen.getByLabelText(`${format(new Date(), 'MMMM d, yyyy')}, available`))
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/booking/new', params: { checkInDate: availableDate } })

    mockPush.mockClear()
    fireEvent.press(screen.getByLabelText(`${format(parseLocalDate(checkInDate), 'MMMM d, yyyy')}, booked: Lea Santos`))
    expect(mockPush).toHaveBeenCalledWith('/booking/10000000-0000-4000-8000-000000000001')
  })

  it('opens the full bookings calendar from the dashboard calendar card', () => {
    render(<DashboardScreen />)
    fireEvent.press(screen.getByLabelText('Open full calendar'))
    expect(mockPush).toHaveBeenCalledWith('/calendar')
  })

  it('refreshes availability whenever the dashboard regains focus', () => {
    render(<DashboardScreen />)
    act(() => { mockFocusCallback?.() })
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })
})

function flattenText(node: unknown): string[] {
  if (node === null || node === undefined) return []
  if (typeof node === 'string' || typeof node === 'number') return [String(node)]
  if (Array.isArray(node)) return node.flatMap(flattenText)
  if (typeof node === 'object' && 'children' in node) {
    return flattenText((node as { children?: unknown }).children)
  }
  return []
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}
