import { render, screen } from '@testing-library/react-native'
import { AmountDisplay } from './AmountDisplay'

describe('AmountDisplay', () => {
  it('renders a shared peso amount with its optional label', () => {
    render(<AmountDisplay label="Package price" amountMinor={590000} emphasis="strong" />)

    expect(screen.getByText('Package price')).toBeTruthy()
    expect(screen.getByText('₱5,900.00')).toBeTruthy()
  })
})
