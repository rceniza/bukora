import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import type { BookingAggregate } from '../src/domain/ports/BookingRepository'
import type { BookingId, UUID } from '../src/domain/models'
import { calculateBookingQuote } from '../src/domain/services/bookingQuote'
import { bookingRepository } from '../src/data/repositories/bookingRepository'
import BookingDetailScreen from '../app/booking/[id]'

const mockBookingId = '10000000-0000-4000-8000-000000000001' as BookingId
let mockRecord: BookingAggregate
let mockFocusCallback: (() => void | (() => void)) | undefined

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: mockBookingId }),
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: (callback: () => void | (() => void)) => { mockFocusCallback = callback },
}))

jest.mock('../src/application/settings/AppSettingsContext', () => ({
  useAppSettings: () => ({ settings: { nightUseAmountMinor: 590000, additionalRoomAmountMinor: 180000, videokeRentalAmountMinor: 80000 } }),
}))

jest.mock('../src/data/repositories/bookingRepository', () => ({
  bookingRepository: {
    findById: jest.fn(async () => mockRecord),
    findOverlaps: jest.fn().mockResolvedValue([]),
    update: jest.fn(async (booking, activity, lineItems) => {
      mockRecord = {
        ...mockRecord,
        booking,
        lineItems: lineItems ?? mockRecord.lineItems,
        activity: activity ? [...mockRecord.activity, activity] : mockRecord.activity,
      }
    }),
  },
}))

const createdAt = '2026-10-01T10:00:00.000Z'

describe('booking edit pricing feature', () => {
  beforeEach(() => {
    mockFocusCallback = undefined
    mockRecord = {
      booking: {
        id: mockBookingId, status: 'confirmed', confirmationDepositAmountMinor: 100000,
        guestName: 'Mia Cruz', address: 'San Juan', cellphone: '+639171234567', email: null, pax: 8,
        checkInDate: '2026-11-01', checkOutDate: '2026-11-02', notes: null,
        createdAt, updatedAt: createdAt, cancelledAt: null,
      },
      lineItems: calculateBookingQuote({}).lineItems.map((item, index) => ({
        ...item, id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}` as UUID,
        bookingId: mockBookingId, createdAt,
      })),
      payments: [{
        id: '30000000-0000-4000-8000-000000000001' as UUID, bookingId: mockBookingId, kind: 'payment',
        amountMinor: 100000, paidAt: '2026-10-01', method: 'GCash', transactionReference: 'DP-001', notes: null, createdAt,
      }],
      activity: [],
    }
    jest.mocked(bookingRepository.findById).mockImplementation(async () => mockRecord)
    jest.mocked(bookingRepository.update).mockImplementation(async (booking, activity, lineItems) => {
      mockRecord = {
        ...mockRecord, booking, lineItems: lineItems ?? mockRecord.lineItems,
        activity: activity ? [...mockRecord.activity, activity] : mockRecord.activity,
      }
    })
  })

  it('loads the saved options, edits the room and custom prices, and persists the revised breakdown and history', async () => {
    render(<BookingDetailScreen />)
    act(() => { mockFocusCallback?.() })
    await screen.findByText('Mia Cruz')
    fireEvent.press(screen.getByRole('button', { name: 'Edit booking' }))

    expect(screen.getByLabelText('Add a second room (+ ₱1,800.00)')).toBeTruthy()
    fireEvent.press(screen.getByLabelText('Add a second room (+ ₱1,800.00)'))
    fireEvent.press(screen.getByLabelText('Add custom line item'))
    fireEvent.changeText(screen.getByLabelText('Description'), 'Catering')
    fireEvent.changeText(screen.getByLabelText('Amount (PHP)'), '500.00')
    fireEvent.press(screen.getByLabelText('Add custom line item'))
    fireEvent.changeText(screen.getAllByLabelText('Description')[1], 'Courtesy discount')
    fireEvent.changeText(screen.getAllByLabelText('Amount (PHP)')[1], '200.00')
    fireEvent.press(screen.getByLabelText('Discount item 2'))
    expect(screen.getByText('₱8,000.00')).toBeTruthy()

    fireEvent.press(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(mockRecord.lineItems).toHaveLength(6))

    expect(mockRecord.lineItems.map(({ kind, description, totalAmountMinor }) => [kind, description, totalAmountMinor])).toEqual([
      ['base_package', 'Night use', 590000], ['included_room', 'One room included', 0],
      ['additional_room', 'Second room', 180000], ['videoke', 'Videoke included with second room', 0],
      ['custom_charge', 'Catering', 50000], ['discount', 'Courtesy discount', -20000],
    ])
    expect(mockRecord.payments).toHaveLength(1)
    expect(mockRecord.payments[0].transactionReference).toBe('DP-001')
    expect(mockRecord.activity[0].details).toMatchObject({ previous: { totalAmountMinor: 590000 }, next: { totalAmountMinor: 800000 } })
    expect(await screen.findByText(/Booking details and price updated for Mia Cruz/)).toBeTruthy()
    expect(screen.getByText(/Price breakdown: .*₱5,900.00.*→.*₱8,000.00/)).toBeTruthy()
  })

  it('adds the videoke rental when editing a one-room booking', async () => {
    render(<BookingDetailScreen />)
    act(() => { mockFocusCallback?.() })
    await screen.findByText('Mia Cruz')
    fireEvent.press(screen.getByRole('button', { name: 'Edit booking' }))
    fireEvent.press(screen.getByLabelText('Rent videoke (+ ₱800.00)'))

    expect(screen.getByText('₱6,700.00')).toBeTruthy()
    fireEvent.press(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(mockRecord.lineItems.some((item) => item.kind === 'videoke' && item.totalAmountMinor === 80000)).toBe(true))
  })
})
