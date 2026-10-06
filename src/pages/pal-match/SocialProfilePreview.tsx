import { useNavigate } from 'react-router-dom'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { Card } from '../../components/ui/Card'
import { SocialProfileCard } from '../../components/SocialProfileCard'
import { Button } from '../../components/ui/Button'
import { useDemoStore } from '../../store/useDemoStore'
import bgGlow from '../../assets/shared/bg-glow-warm.png'

/**
 * Pal Auto Match Social Profile preview — ported from V2's
 * `SocialProfilePreview.tsx`. The last onboarding step before matching,
 * showing her what her Pixel Pal will see before we start looking.
 *
 * Reuses the same `Person` record (`me`) Ask already reads, per the "one
 * Social Profile, not a separate Pixel Pal profile" rule — no new fields
 * beyond the `signature`/`aboutMe`/`socialLinks` added to `Person` for this
 * screen (see lib/types.ts).
 *
 * "Edit social profile" opens `SocialProfileEdit`
 * (`/pixel-pal-match/social-profile-edit`), which edits this same `me`
 * record — not a second profile system. It returns here on both Save and
 * Cancel, so this screen always re-reads current store values (immediately
 * reflecting a save, unchanged after a cancel) rather than caching anything
 * itself.
 */
export default function SocialProfilePreview() {
  const navigate = useNavigate()
  const me = useDemoStore((s) => s.me)

  return (
    <div className="relative flex min-h-full flex-col">
      <img src={bgGlow} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />

      <div className="relative flex min-h-full flex-col gap-6 p-5">
        <ScreenHeader title="Your Social Profile" onBack={() => navigate('/pixel-pal-match/request/note')} />

        <div>
          <h2 className="text-h3">This is how your Pixel Pal will see you.</h2>
          <p className="mt-2 text-body-sm text-navy-60">
            You can update your Social Profile before we start looking.
          </p>
        </div>

        <Card>
          <SocialProfileCard person={me} />
        </Card>

        <div className="mt-auto flex flex-col gap-3 pt-6">
          <Button variant="soft" onClick={() => navigate('/pixel-pal-match/social-profile-edit')}>
            Edit Social Profile
          </Button>
          <Button variant="soft-outline" onClick={() => navigate('/pixel-pal-match/finding')}>
            Looks Good
          </Button>
        </div>
      </div>
    </div>
  )
}
