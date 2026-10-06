type AnonymousAvatarSize = 'xs' | 'sm' | 'md' | 'lg'

// Same size-stepped soft-square radii as `Avatar`, so an anonymous stand-in
// and the real avatar it later reveals into share one shape.
const sizes: Record<AnonymousAvatarSize, string> = {
  xs: 'h-6 w-6 rounded-tag', // 24px — inline in a card's header row (Figma "Your Post")
  sm: 'h-8 w-8 rounded-icon',
  md: 'h-11 w-11 rounded-field',
  lg: 'h-16 w-16 rounded-field',
}

// Pastel tones drawn from the existing token set only — never a new color,
// and never anything derived from a real identity. Cycled by `seed` so the
// same ask/person reads as a consistent (but still anonymous) avatar across
// screens, the way a real anonymous-post UI would.
const tones = ['bg-lavender-40', 'bg-yellow-40', 'bg-lavender-80', 'bg-yellow-80', 'bg-lavender-20', 'bg-navy-20']

/**
 * A generic, non-identifying stand-in for someone who has no name to show
 * yet — an incoming message request, before a chat (and its nickname)
 * exists. Deliberately a silhouette, not initials: there's no name to take
 * initials from that wouldn't leak identity. Once a chat exists, its
 * nickname's initials take over (see lib/palLabel).
 */
export function AnonymousAvatar({ seed = 0, size = 'md' }: { seed?: number; size?: AnonymousAvatarSize }) {
  const tone = tones[seed % tones.length]
  return (
    <div
      className={`${sizes[size]} ${tone} flex shrink-0 items-center justify-center text-navy-60`}
      aria-hidden="true"
    >
      <svg width="55%" height="55%" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7v1H4v-1Z" />
      </svg>
    </div>
  )
}
