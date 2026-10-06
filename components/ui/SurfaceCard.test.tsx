import { render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { SurfaceCard } from './SurfaceCard'

describe('SurfaceCard', () => {
  it('renders its content and test identifier', () => {
    render(<SurfaceCard testID="summary-card"><Text>Next stay</Text></SurfaceCard>)

    expect(screen.getByTestId('summary-card')).toBeTruthy()
    expect(screen.getByText('Next stay')).toBeTruthy()
  })
})
