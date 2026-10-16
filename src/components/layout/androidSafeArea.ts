export const ANDROID_MIN_ROOT_BOTTOM_INSET = 24

export function getRootContentBottomPadding(platform: string, safeAreaBottom: number) {
  return platform === 'android'
    ? Math.max(safeAreaBottom, ANDROID_MIN_ROOT_BOTTOM_INSET)
    : 0
}

const androidScreenEdges = ['top', 'left', 'right'] as const
const standardScreenEdges = ['top', 'right', 'bottom', 'left'] as const

export function getAppSafeAreaEdges(platform: string) {
  return platform === 'android' ? androidScreenEdges : standardScreenEdges
}
