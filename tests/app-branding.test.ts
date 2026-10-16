import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import appJson from '../app.json'

describe('Bukora app branding', () => {
  it('uses the Bukora logo for app, splash, and Android adaptive icons', () => {
    const app = appJson.expo
    expect(app.version).toBe('1.0.6')
    expect(app.android.versionCode).toBe(7)
    expect(app.ios.buildNumber).toBe('6')
    expect(app.icon).toBe('./assets/bukora-icon.png')
    expect(app.splash.image).toBe('./assets/bukora-icon.png')
    expect(app.android.adaptiveIcon.foregroundImage).toBe('./assets/bukora-adaptive-icon.png')
    expect(app.android.adaptiveIcon.backgroundColor).toBe('#F9FAF7')
  })

  it('includes valid square 1024px PNG icon assets', () => {
    for (const asset of ['assets/bukora-icon.png', 'assets/bukora-adaptive-icon.png']) {
      const path = resolve(__dirname, '..', asset)
      expect(existsSync(path)).toBe(true)
      const pngHeader = readFileSync(path).subarray(0, 24)
      expect(pngHeader.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      expect(pngHeader.readUInt32BE(16)).toBe(1024)
      expect(pngHeader.readUInt32BE(20)).toBe(1024)
    }
  })
})
