import { render, screen } from '@testing-library/react-native'
import { LoadingState } from './LoadingState'

describe('LoadingState', () => {
  it('announces a useful loading label', () => {
    render(<LoadingState message="Loading upcoming bookings" />)
    expect(screen.getByText('Loading upcoming bookings')).toBeTruthy()
    expect(screen.getByLabelText('Loading upcoming bookings')).toBeTruthy()
  })
})
