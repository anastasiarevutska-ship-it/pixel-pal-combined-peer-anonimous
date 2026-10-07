import type { Conversation } from '../lib/types'
import { ME_ID } from '../lib/seed'
import { endedByThem } from '../lib/graduation'
import { Button } from './ui/Button'

/**
 * The thank-you notes a graduation leaves behind — whoever graduated, plus
 * the thank-you she sent back from the push. Warm cards rather than
 * ordinary bubbles: they close the conversation, they don't continue it.
 * Shared by the peer chat and the Pixel Pal chat.
 */
export function GraduationNotes({ convo, otherName }: { convo: Conversation; otherName: string }) {
  const g = convo.graduation
  if (convo.status !== 'graduated' || !g) return null
  const byMe = g.by === ME_ID
  const notes = [
    g.thankYou && { label: byMe ? `Your note to ${otherName}` : `A note from ${otherName}`, text: g.thankYou },
    g.reply?.text && { label: byMe ? `A note from ${otherName}` : `Your thank-you to ${otherName}`, text: g.reply.text },
  ].filter((n): n is { label: string; text: string } => !!n)

  return (
    <>
      {notes.map((note) => (
        <div key={note.label} className="mt-2 rounded-card bg-yellow-40 p-3">
          <p className="text-label-bold uppercase text-navy-60">💜 {note.label}</p>
          <p className="mt-1 whitespace-pre-line text-body-sm text-navy-80">{note.text}</p>
        </div>
      ))}
    </>
  )
}

type ChatClosureProps = {
  convo: Conversation
  otherName: string
  /** Pixel Pal only: offered once her Pal has moved on. */
  onFindNewPal?: () => void
}

/**
 * Replaces the composer once a chat is no longer active: a quiet read-only
 * line — plus, when her Pal moved on, a gentle way to find a new one,
 * never a reason why. (Thanking someone who graduated happens from the
 * graduation push, not here — see PushBanner.)
 */
export function ChatClosure({ convo, otherName, onFindNewPal }: ChatClosureProps) {
  let line: string
  if (convo.status === 'graduated') {
    line =
      convo.graduation && convo.graduation.by !== ME_ID
        ? `${otherName} graduated from this chat. It's kept here as a read-only record.`
        : "You graduated from this chat. It's kept here as a read-only record."
  } else if (convo.status === 'ended') {
    line = endedByThem(convo)
      ? `${otherName} isn't able to continue this chat. It's kept here as a record.`
      : 'You found someone else. This conversation is kept here as a read-only record.'
  } else {
    line = 'You blocked this person. This conversation is now read-only.'
  }

  return (
    <div className="mt-auto flex flex-col gap-3 border-t border-lavender-20 px-4 py-3">
      <p className="text-center text-label text-navy-40">{line}</p>
      {endedByThem(convo) && onFindNewPal && (
        <Button variant="soft" onClick={onFindNewPal}>
          Find a new Pixel Pal
        </Button>
      )}
    </div>
  )
}
