import { appConfig } from './appConfig'

describe('appConfig', () => {
  it('provides Bukora as the default app display name', () => {
    expect(appConfig.defaultDisplayName).toBe('Bukora')
  })
})
