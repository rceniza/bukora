import { Image } from 'react-native'

export function BukoraLogo({ size = 36 }: { size?: number }) {
  return <Image
    source={require('../../assets/bukora-icon.png')}
    style={{ width: size, height: size }}
    resizeMode="contain"
    accessible
    accessibilityRole="image"
    accessibilityLabel="Bukora logo"
  />
}
