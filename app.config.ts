import type { ExpoConfig, ConfigContext } from 'expo/config'

export default ({ config }: ConfigContext): ExpoConfig => {
  const iosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME
  const plugins = (config.plugins ?? []).filter((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin
    return name !== '@react-native-google-signin/google-signin'
  })

  plugins.push('./plugins/with-react-native-prebuilt-debug-fix')

  if (iosUrlScheme) {
    plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme }])
  }

  return {
    ...config,
    name: config.name ?? 'Bukora',
    slug: config.slug ?? 'bukora',
    plugins,
    extra: {
      ...config.extra,
      googleDrive: {
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
      },
    },
  }
}
