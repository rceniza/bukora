import { fireEvent, render, screen } from '@testing-library/react-native'
import { useRouter } from 'expo-router'
import { BackButton } from '../components/navigation/BackButton'

jest.mock('expo-router', () => ({ useRouter: jest.fn() }))
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: () => null }))

const mockedUseRouter = jest.mocked(useRouter)

describe('BackButton', () => {
  it('returns to the previous screen when navigation history exists', () => {
    const router = { canGoBack: jest.fn(() => true), back: jest.fn(), replace: jest.fn() }
    mockedUseRouter.mockReturnValue(router as never)
    render(<BackButton label="Bookings" fallback="/booking" />)

    fireEvent.press(screen.getByRole('button', { name: 'Bookings' }))

    expect(router.back).toHaveBeenCalledTimes(1)
    expect(router.replace).not.toHaveBeenCalled()
  })

  it('opens its fallback screen when launched without navigation history', () => {
    const router = { canGoBack: jest.fn(() => false), back: jest.fn(), replace: jest.fn() }
    mockedUseRouter.mockReturnValue(router as never)
    render(<BackButton label="Bookings" fallback="/booking" />)

    fireEvent.press(screen.getByRole('button', { name: 'Bookings' }))

    expect(router.replace).toHaveBeenCalledWith('/booking')
    expect(router.back).not.toHaveBeenCalled()
  })
})
