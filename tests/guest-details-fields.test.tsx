import { fireEvent, render, screen } from '@testing-library/react-native'
import { GuestDetailsFields, type GuestDetailsValues } from '../components/forms/GuestDetailsFields'

const emptyValues: GuestDetailsValues = {
  guestName: '',
  address: '',
  cellphone: '',
  email: '',
  pax: '',
}

describe('GuestDetailsFields', () => {
  it('connects accessible guest fields to the form value handler', () => {
    const onChange = jest.fn()
    render(<GuestDetailsFields values={emptyValues} onChange={onChange} />)

    fireEvent.changeText(screen.getByLabelText('Guest name'), 'Mia Cruz')
    fireEvent.changeText(screen.getByLabelText('Number of guests (pax)'), '12')

    expect(onChange).toHaveBeenNthCalledWith(1, 'guestName', 'Mia Cruz')
    expect(onChange).toHaveBeenNthCalledWith(2, 'pax', '12')
    expect(screen.getByText('For your records only; pax does not affect the price.')).toBeTruthy()
  })

  it('renders the validation message for an invalid field', () => {
    render(<GuestDetailsFields values={emptyValues} errors={{ cellphone: 'Enter a valid cellphone number.' }} onChange={() => {}} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid cellphone number.')
  })
})
