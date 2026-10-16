import { getAppSafeAreaEdges, getRootContentBottomPadding } from './androidSafeArea'

describe('root content safe area', () => {
  it('reserves at least 24 dp at the Android root and respects larger system insets', () => {
    expect(getRootContentBottomPadding('android', 0)).toBe(24)
    expect(getRootContentBottomPadding('android', 48)).toBe(48)
    expect(getRootContentBottomPadding('ios', 34)).toBe(0)
  })

  it('applies the Android bottom inset only at the root', () => {
    expect(getAppSafeAreaEdges('android')).toEqual(['top', 'left', 'right'])
    expect(getAppSafeAreaEdges('ios')).toEqual(['top', 'right', 'bottom', 'left'])
  })
})
