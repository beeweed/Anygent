import type { PropsWithChildren } from 'react';
import { TooltipProvider } from '@radix-ui/react-tooltip';

export function AppProviders({ children }: PropsWithChildren) {
  return <TooltipProvider delayDuration={120}>{children}</TooltipProvider>;
}