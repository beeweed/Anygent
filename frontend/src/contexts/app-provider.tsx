import type { PropsWithChildren } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'

export function AppProvider({ children }: PropsWithChildren) {
  return <Tooltip.Provider delayDuration={120}>{children}</Tooltip.Provider>
}