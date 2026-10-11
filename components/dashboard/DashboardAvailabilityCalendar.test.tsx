import { fireEvent, render, screen } from '@testing-library/react-native'
import type { BookingId } from '../../src/domain/models'
import type { AvailabilityBooking } from '../../src/domain/services/dashboardSummary'
import { DashboardAvailabilityCalendar } from './DashboardAvailabilityCalendar'

const booked: AvailabilityBooking = {
  id: '10000000-0000-4000-8000-000000000001' as BookingId,
  guestName: 'Mia Cruz',
  status: 'tentative',
  checkInDate: '2026-10-10',
  checkOutDate: '2026-10-12',
}

describe('DashboardAvailabilityCalendar', () => {
  it('labels available days green and marks all occupied nights with an X', () => {
    render(<DashboardAvailabilityCalendar
      bookings={[booked]}
      initialMonth={new Date(2026, 9, 1)}
      onSelectAvailableDate={jest.fn()}
      onSelectBooking={jest.fn()}
      onOpenFullCalendar={jest.fn()}
    />)

    expect(screen.getByText('October 2026')).toBeTruthy()
    expect(screen.getByLabelText('October 9, 2026, available').props.className).toContain('bg-emerald-50')
    expect(screen.getByLabelText('October 10, 2026, booked: Mia Cruz').props.className).toContain('bg-stone-100')
    expect(screen.getByLabelText('October 11, 2026, booked: Mia Cruz')).toBeTruthy()
    expect(screen.getByLabelText('October 12, 2026, available')).toBeTruthy()
    expect(screen.getAllByText('×')).toHaveLength(3)
    expect(screen.getByText('Available')).toBeTruthy()
    expect(screen.getByText('Booked')).toBeTruthy()
  })

  it('opens a new booking for an available date and the booking detail for an occupied date', () => {
    const onSelectAvailableDate = jest.fn()
    const onSelectBooking = jest.fn()
    render(<DashboardAvailabilityCalendar
      bookings={[booked]}
      initialMonth={new Date(2026, 9, 1)}
      onSelectAvailableDate={onSelectAvailableDate}
      onSelectBooking={onSelectBooking}
      onOpenFullCalendar={jest.fn()}
    />)

    fireEvent.press(screen.getByLabelText('October 9, 2026, available'))
    fireEvent.press(screen.getByLabelText('October 10, 2026, booked: Mia Cruz'))

    expect(onSelectAvailableDate).toHaveBeenCalledWith('2026-10-09')
    expect(onSelectBooking).toHaveBeenCalledWith(booked.id)
  })

  it('navigates between months and opens the full calendar', () => {
    const onOpenFullCalendar = jest.fn()
    render(<DashboardAvailabilityCalendar
      bookings={[]}
      initialMonth={new Date(2026, 11, 1)}
      onSelectAvailableDate={jest.fn()}
      onSelectBooking={jest.fn()}
      onOpenFullCalendar={onOpenFullCalendar}
    />)

    expect(screen.getByText('December 2026')).toBeTruthy()
    fireEvent.press(screen.getByLabelText('Next month'))
    expect(screen.getByText('January 2027')).toBeTruthy()
    fireEvent.press(screen.getByLabelText('Previous month'))
    expect(screen.getByText('December 2026')).toBeTruthy()
    fireEvent.press(screen.getByLabelText('Open full calendar'))
    expect(onOpenFullCalendar).toHaveBeenCalledTimes(1)
  })
})
