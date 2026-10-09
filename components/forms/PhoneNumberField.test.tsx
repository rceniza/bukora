import { fireEvent, render, screen } from '@testing-library/react-native'
import { PhoneNumberField } from './PhoneNumberField'

describe('PhoneNumberField', () => {
  it('shows the Philippines calling code in the integrated phone input by default', () => {
    render(<PhoneNumberField value="" countryCode="PH" onChangeText={() => {}} onCountryCodeChange={() => {}} />)

    expect(screen.getByText('(+63)')).toBeTruthy()
    expect(screen.getByLabelText('Cellphone number')).toBeTruthy()
  })

  it('searches the full country list and reports the selected calling code', () => {
    const onCountryCodeChange = jest.fn()
    render(<PhoneNumberField value="" countryCode="PH" onChangeText={() => {}} onCountryCodeChange={onCountryCodeChange} />)

    fireEvent.press(screen.getByLabelText(/Choose country calling code/))
    fireEvent.changeText(screen.getByLabelText('Search country codes'), 'United States')
    fireEvent.press(screen.getByLabelText(/United States.*\(\+1\)/))

    expect(onCountryCodeChange).toHaveBeenCalledWith('US')
    expect(screen.queryByText('Choose country code')).toBeNull()
  })

  it('filters countries by calling code as well as name', () => {
    render(<PhoneNumberField value="" countryCode="PH" onChangeText={() => {}} onCountryCodeChange={() => {}} />)

    fireEvent.press(screen.getByLabelText(/Choose country calling code/))
    fireEvent.changeText(screen.getByLabelText('Search country codes'), '+358')

    expect(screen.getByLabelText(/Finland.*\(\+358\)/)).toBeTruthy()
  })
})
