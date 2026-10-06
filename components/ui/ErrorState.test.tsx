import { fireEvent, render, screen } from '@testing-library/react-native'
import { ErrorState } from './ErrorState'

describe('ErrorState', () => {
  it('offers an accessible retry action when supplied', () => {
    const onRetry = jest.fn()
    render(<ErrorState message="Local records are unavailable." onRetry={onRetry} />)
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
