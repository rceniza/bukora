import { View, type ViewProps } from 'react-native'

interface SurfaceCardProps extends ViewProps {
  padded?: boolean
}

export function SurfaceCard({ children, className, padded = true, ...props }: SurfaceCardProps) {
  return (
    <View
      {...props}
      className={`rounded-2xl border border-stone-100 bg-white ${padded ? 'p-5' : ''} ${className ?? ''}`}
    >
      {children}
    </View>
  )
}
