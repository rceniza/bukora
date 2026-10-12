import { act, fireEvent, render, screen } from '@testing-library/react-native'
import BookingListScreen from '../app/(tabs)/booking'
import type { BookingAggregate } from '../src/domain/ports/BookingRepository'
import type { BookingId } from '../src/domain/models'
import { bookingRepository } from '../src/data/repositories/bookingRepository'

let mockFocusCallback: (() => void | (() => void)) | undefined

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: (callback: () => void | (() => void)) => { mockFocusCallback = callback },
}))
jest.mock('../src/data/repositories/bookingRepository', () => ({ bookingRepository: { listPage: jest.fn() } }))

function makeRecord(index: number): BookingAggregate {
  const id = `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}` as BookingId
  const checkInDate = `2027-01-${String((index % 28) + 1).padStart(2, '0')}`
  return {
    booking: {
      id, guestName: `Guest ${index + 1}`, address: null, cellphone: `+6391700000${String(index).padStart(2, '0')}`,
      email: null, checkInDate, checkOutDate: `2027-01-${String((index % 28) + 2).padStart(2, '0')}`,
      notes: null, pax: 2, status: 'confirmed', confirmationDepositAmountMinor: 100000,
      createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '', cancelledAt: null,
    }, lineItems: [], payments: [], activity: [],
  }
}

const records = Array.from({ length: 21 }, (_, index) => makeRecord(index))

describe('booking list pagination feature', () => {
  beforeEach(() => {
    mockFocusCallback = undefined
    jest.mocked(bookingRepository.listPage).mockImplementation(async (request) => {
      const start = request.cursor ? 20 : 0
      const pageRecords = records.slice(start, start + 20)
      const last = pageRecords.at(-1)?.booking
      return {
        records: pageRecords,
        hasMore: start + pageRecords.length < records.length,
        nextCursor: start + pageRecords.length < records.length && last
          ? { checkInDate: last.checkInDate, createdAt: last.createdAt, id: last.id }
          : null,
      }
    })
  })

  it('renders one page and appends the next cursor page without duplicates', async () => {
    render(<BookingListScreen />)
    await act(async () => { mockFocusCallback?.() })

    expect(await screen.findByText('Guest 20')).toBeTruthy()
    expect(screen.queryByText('Guest 21')).toBeNull()
    fireEvent.press(screen.getByRole('button', { name: 'Load more bookings' }))

    expect(await screen.findByText('Guest 21')).toBeTruthy()
    expect(screen.getAllByText('Guest 1')).toHaveLength(1)
    expect(bookingRepository.listPage).toHaveBeenNthCalledWith(2, expect.objectContaining({
      filter: 'upcoming', query: '', limit: 20, cursor: expect.objectContaining({ id: records[19].booking.id }),
    }))
    expect(screen.queryByRole('button', { name: 'Load more bookings' })).toBeNull()
  })

  it('starts a fresh first page when the owner changes the search or status filter', async () => {
    render(<BookingListScreen />)
    await act(async () => { mockFocusCallback?.() })

    fireEvent.changeText(screen.getByLabelText('Search guest, phone, or email'), 'Maria')
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 275)) })
    await act(async () => { mockFocusCallback?.() })
    expect(bookingRepository.listPage).toHaveBeenLastCalledWith(expect.objectContaining({ query: 'Maria' }))
    expect(jest.mocked(bookingRepository.listPage).mock.calls.at(-1)?.[0]).not.toHaveProperty('cursor')

    fireEvent.press(screen.getByRole('button', { name: 'All' }))
    await act(async () => { mockFocusCallback?.() })
    expect(bookingRepository.listPage).toHaveBeenLastCalledWith(expect.objectContaining({ filter: 'all', query: 'Maria' }))
    expect(jest.mocked(bookingRepository.listPage).mock.calls.at(-1)?.[0]).not.toHaveProperty('cursor')
  })

  it('recovers from an initial page load error', async () => {
    jest.mocked(bookingRepository.listPage)
      .mockRejectedValueOnce(new Error('Temporary storage issue'))
      .mockResolvedValueOnce({ records: [records[0]], nextCursor: null, hasMore: false })
    render(<BookingListScreen />)
    await act(async () => { mockFocusCallback?.() })

    expect(await screen.findByText('Bookings could not be loaded from this device.')).toBeTruthy()
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Guest 1')).toBeTruthy()
  })

  it('retries a failed next page and removes the load-more control at the end', async () => {
    let nextPageAttempts = 0
    jest.mocked(bookingRepository.listPage).mockImplementation(async (request) => {
      if (!request.cursor) {
        const first = records[0].booking
        return { records: [records[0]], hasMore: true, nextCursor: { checkInDate: first.checkInDate, createdAt: first.createdAt, id: first.id } }
      }
      nextPageAttempts += 1
      if (nextPageAttempts === 1) throw new Error('Temporary storage issue')
      return { records: [records[1]], nextCursor: null, hasMore: false }
    })
    render(<BookingListScreen />)
    await act(async () => { mockFocusCallback?.() })
    expect(await screen.findByText('Guest 1')).toBeTruthy()

    fireEvent.press(screen.getByRole('button', { name: 'Load more bookings' }))
    expect(await screen.findByText('More bookings could not be loaded.')).toBeTruthy()
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Guest 2')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Load more bookings' })).toBeNull()
  })
})
