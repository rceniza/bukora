const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)
config.resolver.sourceExts.push('sql')

// Native projects are generated locally by Expo prebuild and are not JS inputs.
// Excluding them keeps Metro stable while Xcode or Gradle updates generated files.
config.resolver.blockList = [/[\\/]ios[\\/].*/, /[\\/]android[\\/].*/]

module.exports = withNativeWind(config, { input: './global.css' })
