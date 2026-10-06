import { fireEvent, render, screen } from '@testing-library/react-native'
import { CalendarDateField } from './CalendarDateField'

describe('CalendarDateField', () => {
  it('selects a day and closes the calendar', () => {
    const onChange = jest.fn()
    render(<CalendarDateField label="Check-in" value="2026-11-10" onChange={onChange} />)

    fireEvent.press(screen.getByLabelText('Choose Check-in'))
    fireEvent.press(screen.getByLabelText('Select November 12, 2026'))

    expect(onChange).toHaveBeenCalledWith('2026-11-12')
    expect(screen.queryByLabelText('Previous month')).toBeNull()
  })
})
