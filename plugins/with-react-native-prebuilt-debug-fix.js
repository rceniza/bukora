const { withPodfile } = require('expo/config-plugins')

/**
 * The precompiled React Native iOS core is built in production mode, while
 * ExpoModulesCore's Debug target otherwise selects React Native's debug-only
 * Sealable ABI. Keep those two targets on the same ABI for Debug builds.
 */
function withReactNativePrebuiltDebugFix(config) {
  return withPodfile(config, (podfileConfig) => {
    const contents = podfileConfig.modResults.contents
    const insertionPoint = contents.lastIndexOf('\n  end\nend')
    if (insertionPoint === -1) {
      throw new Error('Could not find the iOS post_install block for the React Native prebuilt debug fix.')
    }

    const buildSetting = `
    installer.pods_project.targets.each do |target|
      next unless target.name == 'ExpoModulesCore'

      target.build_configurations.each do |build_configuration|
        next unless build_configuration.name == 'Debug'

        definitions = build_configuration.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)']
        definitions = [definitions] unless definitions.is_a?(Array)
        definitions << 'REACT_NATIVE_PRODUCTION=1' unless definitions.include?('REACT_NATIVE_PRODUCTION=1')
        build_configuration.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = definitions
      end
    end
`

    podfileConfig.modResults.contents = `${contents.slice(0, insertionPoint)}\n${buildSetting}${contents.slice(insertionPoint)}`
    return podfileConfig
  })
}

module.exports = withReactNativePrebuiltDebugFix
