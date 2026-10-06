import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PhoneFrame } from './ui/PhoneFrame'
import { DemoControls } from './DemoControls'
import { PushBanner } from './PushBanner'

/** Centers every route in the device mockup and mounts the demo-controls
 * panel — same presentation convention as the other Pixel Pal prototypes. */
export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center gap-4 bg-lavender-20 p-10">
      <Link to="/" className="text-label-bold text-navy-60 hover:text-navy">
        ← Launcher
      </Link>
      <p className="text-label text-navy-60">Concept B — anonymous ask, then private chat</p>
      <PhoneFrame>
        {children}
        <PushBanner />
      </PhoneFrame>
      <DemoControls />
    </div>
  )
}
