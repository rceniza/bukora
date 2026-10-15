import { fireEvent, render, screen } from '@testing-library/react-native'
import { NotificationBell } from './NotificationBell'

jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: () => null }))

describe('NotificationBell', () => {
  it('shows a red unread count and opens the notification list', () => {
    const onPress = jest.fn()
    render(<NotificationBell unreadCount={3} onPress={onPress} />)

    fireEvent.press(screen.getByRole('button', { name: 'Notifications, 3 unread' }))
    expect(screen.getByText('3')).toBeTruthy()
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('hides the badge when there are no unread notifications', () => {
    render(<NotificationBell unreadCount={0} onPress={jest.fn()} />)

    expect(screen.getByRole('button', { name: 'Notifications' })).toBeTruthy()
    expect(screen.queryByText('0')).toBeNull()
  })
})
