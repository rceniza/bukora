import { addDays, format } from 'date-fns'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { useRouter } from 'expo-router'
import NewBookingRoute from '../app/booking/new'
import { formatDisplayDate } from '../src/shared/utils/date'

jest.mock('expo-router', () => ({ useRouter: jest.fn() }))
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: () => null }))
jest.mock('../src/data/repositories/bookingRepository', () => ({
  bookingRepository: { findOverlaps: jest.fn().mockResolvedValue([]) },
}))

const mockedUseRouter = jest.mocked(useRouter)

describe('booking date selection', () => {
  beforeEach(() => {
    mockedUseRouter.mockReturnValue({ canGoBack: () => false, back: jest.fn(), replace: jest.fn() } as never)
  })

  it('moves checkout to the next night when check-in changes from a one-night default', () => {
    render(<NewBookingRoute />)
    const nextCheckIn = addDays(new Date(), 5)
    const checkInIso = format(nextCheckIn, 'yyyy-MM-dd')
    const nextCheckOut = format(addDays(nextCheckIn, 1), 'yyyy-MM-dd')

    fireEvent.press(screen.getByLabelText('Choose Check-in'))
    fireEvent.press(screen.getByLabelText(`Select ${format(nextCheckIn, 'MMMM d, yyyy')}`))

    expect(screen.getByText(formatDisplayDate(checkInIso))).toBeTruthy()
    expect(screen.getByText(formatDisplayDate(nextCheckOut))).toBeTruthy()
    expect(screen.getByText('1 night')).toBeTruthy()
  })

  it('keeps the chosen multi-night duration when check-in changes', () => {
    render(<NewBookingRoute />)
    const longerCheckOut = addDays(new Date(), 3)
    const newCheckIn = addDays(new Date(), 7)
    const shiftedCheckOut = addDays(newCheckIn, 3)

    fireEvent.press(screen.getByLabelText('Choose Check-out'))
    fireEvent.press(screen.getByLabelText(`Select ${format(longerCheckOut, 'MMMM d, yyyy')}`))
    fireEvent.press(screen.getByLabelText('Choose Check-in'))
    fireEvent.press(screen.getByLabelText(`Select ${format(newCheckIn, 'MMMM d, yyyy')}`))

    expect(screen.getByText(formatDisplayDate(format(shiftedCheckOut, 'yyyy-MM-dd')))).toBeTruthy()
    expect(screen.getByText('3 nights')).toBeTruthy()
  })

  it('disables checkout dates before check-in and does not change checkout when pressed', () => {
    render(<NewBookingRoute />)
    const checkIn = addDays(new Date(), 5)
    const previousDay = addDays(checkIn, -1)
    const checkOut = addDays(checkIn, 1)

    fireEvent.press(screen.getByLabelText('Choose Check-in'))
    fireEvent.press(screen.getByLabelText(`Select ${format(checkIn, 'MMMM d, yyyy')}`))
    fireEvent.press(screen.getByLabelText('Choose Check-out'))

    const unavailableDate = screen.getByLabelText(`Select ${format(previousDay, 'MMMM d, yyyy')}`)
    const checkInDay = screen.getByLabelText(`Select ${format(checkIn, 'MMMM d, yyyy')}`)
    expect(unavailableDate.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }))
    expect(checkInDay.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }))
    fireEvent.press(unavailableDate)
    fireEvent.press(checkInDay)

    expect(screen.getByText(formatDisplayDate(format(checkOut, 'yyyy-MM-dd')))).toBeTruthy()
  })
})
