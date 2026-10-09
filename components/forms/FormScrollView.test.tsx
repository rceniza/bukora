import { Platform, Text } from 'react-native'
import { render, screen } from '@testing-library/react-native'
import { FormScrollView } from './FormScrollView'

describe('FormScrollView', () => {
  it('keeps form taps responsive and accounts for the iOS keyboard', () => {
    render(<FormScrollView testID="form-scroll"><Text>Form content</Text></FormScrollView>)

    const scrollView = screen.getByTestId('form-scroll')
    expect(scrollView.props.keyboardShouldPersistTaps).toBe('handled')
    expect(scrollView.props.automaticallyAdjustKeyboardInsets).toBe(Platform.OS === 'ios')
    expect(scrollView.props.keyboardDismissMode).toBe(Platform.OS === 'ios' ? 'interactive' : 'on-drag')
  })
})
