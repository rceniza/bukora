import { fireEvent, render, screen } from '@testing-library/react-native'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('shows a clear message and invokes its optional action', () => {
    const onActionPress = jest.fn()
    render(<EmptyState title="No bookings yet" message="Add a stay to start your ledger." actionLabel="Add booking" onActionPress={onActionPress} />)

    fireEvent.press(screen.getByRole('button', { name: 'Add booking' }))

    expect(screen.getByText('No bookings yet')).toBeTruthy()
    expect(onActionPress).toHaveBeenCalledTimes(1)
  })
})
