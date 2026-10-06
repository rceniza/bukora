import { fireEvent, render, screen } from '@testing-library/react-native'
import { PrimaryButton } from './PrimaryButton'

describe('PrimaryButton', () => {
  it('calls its action when pressed', () => {
    const onPress = jest.fn()
    render(<PrimaryButton label="Save booking" onPress={onPress} />)

    fireEvent.press(screen.getByRole('button', { name: 'Save booking' }))

    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('shows progress and prevents presses while loading', () => {
    const onPress = jest.fn()
    render(<PrimaryButton label="Save booking" onPress={onPress} loading />)

    expect(screen.getByRole('button', { name: 'Save booking' })).toBeDisabled()
    expect(screen.getByTestId('loading-indicator')).toBeTruthy()
    fireEvent.press(screen.getByRole('button', { name: 'Save booking' }))
    expect(onPress).not.toHaveBeenCalled()
  })
})
