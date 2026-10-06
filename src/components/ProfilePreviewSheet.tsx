import type { Person } from '../lib/types'
import type { AnonIdentity } from '../lib/palLabel'
import { Sheet } from './ui/Sheet'
import { Button } from './ui/Button'
import { Avatar } from './ui/Avatar'
import { SocialProfileCard } from './SocialProfileCard'

type ProfilePreviewSheetProps = {
  isOpen: boolean
  onClose: () => void
  /** Pass only when the other person's profile is actually visible to her
   * (Pixel Pal chats, or an anonymous chat both sides have shared). */
  person?: Person
  /** The anonymous stand-in shown instead while identities are hidden. */
  anon?: AnonIdentity
  /** Whether she has already shared her own profile in this chat. */
  meShared?: boolean
  /** Offered only while she hasn't shared yet. */
  onShareProfile?: () => void
}

/**
 * What tapping the avatar in a chat header opens. With a visible profile,
 * it's the same Social Profile card the onboarding preview shows. While a
 * chat is still anonymous it never leaks anything: just the nickname and
 * initials, plus where the reveal stands and (if she hasn't yet) the way
 * to share her own.
 */
export function ProfilePreviewSheet({ isOpen, onClose, person, anon, meShared, onShareProfile }: ProfilePreviewSheetProps) {
  if (person) {
    return (
      <Sheet isOpen={isOpen} onClose={onClose} title="Social Profile">
        <SocialProfileCard person={person} />
      </Sheet>
    )
  }

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="Social Profile"
      footer={
        !meShared && onShareProfile ? (
          <Button variant="soft" onClick={onShareProfile}>
            Share my profile
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-3">
        <Avatar name={anon?.name ?? 'Anonymous'} size="lg" />
        <div>
          <p className="text-h4 text-navy">{anon?.name ?? 'Anonymous'}</p>
          <p className="text-body-sm text-navy-60">Anonymous</p>
        </div>
        <p className="text-body-sm text-navy">
          {meShared
            ? "You've shared your profile. Theirs will appear here if they choose to share it too."
            : "Profiles stay hidden until you both choose to share. They'll only see yours if you share it."}
        </p>
      </div>
    </Sheet>
  )
}
