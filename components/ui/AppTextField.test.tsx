import { fireEvent, render, screen } from '@testing-library/react-native'
import { AppTextField } from './AppTextField'

describe('AppTextField', () => {
  it('shows helper text and reports typed values', () => {
    const onChangeText = jest.fn()
    render(
      <AppTextField
        label="Guest name"
        value=""
        onChangeText={onChangeText}
        helper="Enter the name on the booking."
      />,
    )

    fireEvent.changeText(screen.getByLabelText('Guest name'), 'Mia Cruz')

    expect(onChangeText).toHaveBeenCalledWith('Mia Cruz')
    expect(screen.getByText('Enter the name on the booking.')).toBeTruthy()
  })

  it('announces validation errors accessibly', () => {
    render(<AppTextField label="Cellphone number" value="" onChangeText={() => {}} error="Enter a valid cellphone number." />)

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid cellphone number.')
  })

  it('top-aligns multiline text and gives it room to show multiple lines', () => {
    const { getByLabelText } = render(
      <AppTextField label="Booking notes" value="A note" onChangeText={() => {}} multiline numberOfLines={3} />,
    )

    expect(getByLabelText('Booking notes').props.textAlignVertical).toBe('top')
    expect(getByLabelText('Booking notes').props.numberOfLines).toBe(3)
  })
})
