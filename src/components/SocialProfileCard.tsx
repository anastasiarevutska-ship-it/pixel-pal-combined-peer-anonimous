import type { Person } from '../lib/types'
import { Avatar } from './ui/Avatar'

// Standard Instagram glyph (rounded square + lens + flash dot), inline SVG —
// ported as-is from V2, same reasoning: no icon library dependency here.
function InstagramIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M14 22v-8h2.7l.4-3.1H14V9c0-.9.2-1.5 1.5-1.5H17V4.7c-.3 0-1.1-.1-2.1-.1-2.1 0-3.6 1.3-3.6 3.7v2.6H9v3.1h2.3V22h2.7Z" />
    </svg>
  )
}

// Recognized platforms — matched against `socialLinks` (one per line, see
// pages/pal-match/SocialProfileEdit) so the icon row only shows what's actually filled in.
const socialPlatforms = [
  { match: (link: string) => link.includes('instagram'), Icon: InstagramIcon },
  { match: (link: string) => link.includes('x.com') || link.includes('twitter'), Icon: XIcon },
  { match: (link: string) => link.includes('facebook'), Icon: FacebookIcon },
]

/**
 * The body of a Social Profile — avatar, name, signature, about, social
 * icons — with no surface of its own, so the onboarding preview (in a Card)
 * and the in-chat profile sheet show one and the same profile.
 */
export function SocialProfileCard({ person }: { person: Person }) {
  const links = person.socialLinks?.map((l) => l.toLowerCase()) ?? []
  const shownPlatforms = socialPlatforms.filter(({ match }) => links.some(match))

  return (
    <div className="flex flex-col gap-3">
      <Avatar name={person.displayName} src={person.avatarUrl} size="lg" />

      <div>
        <p className="text-h4 text-navy">{person.displayName}</p>
        {person.signature && <p className="text-body-sm text-navy-60">{person.signature}</p>}
      </div>

      {person.aboutMe && <p className="text-body-sm text-navy">{person.aboutMe}</p>}

      {shownPlatforms.length > 0 && (
        <div>
          <p className="text-label-bold text-navy-60">SOCIAL</p>
          <div className="mt-2 flex gap-2">
            {shownPlatforms.map(({ Icon }, i) => (
              <span key={i} className="flex h-8 w-8 items-center justify-center rounded-icon bg-navy text-white">
                <Icon />
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
