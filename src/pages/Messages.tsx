import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TabBar } from '../components/TabBar'
import { CareTeamBlock } from '../components/CareTeamBlock'
import { GreetingHeader } from '../components/GreetingHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { AnonymousAvatar } from '../components/ui/AnonymousAvatar'
import { useDemoStore } from '../store/useDemoStore'
import { ME_ID } from '../lib/seed'
import { relativeTime } from '../lib/relativeTime'
import { anonymousPalIdentities, type AnonIdentity } from '../lib/palLabel'
import type { Conversation, ConversationStatus, Person } from '../lib/types'
import bgGlow from '../assets/shared/bg-glow.png'
import iconUserHeart from '../assets/shared/icon-user-heart.svg'

// Most recent message wins over the conversation's own createdAt — a chat
// that's had activity since it was created should sort above one that
// hasn't, regardless of which was created first. Falls back to createdAt
// for a conversation with no messages yet (accepted-but-silent).
function lastActivityAt(convo: Conversation): string {
  const lastMessage = convo.messages[convo.messages.length - 1]
  return lastMessage ? lastMessage.createdAt : convo.createdAt
}

// Read-only lifecycle states get a small, neutral label in the row's
// secondary line (and live under the collapsed "Past" section below) rather
// than being deleted. Deliberately silent for 'active': the ordinary case
// needs no badge at all.
function conversationStatusLabel(status: ConversationStatus): string | undefined {
  if (status === 'graduated') return 'Graduated'
  if (status === 'blocked') return 'Blocked'
  if (status === 'ended') return 'Ended'
  return undefined
}

type ConversationRowProps = {
  conversation: Conversation
  people: Record<string, Person>
  anon?: AnonIdentity
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-navy-40">
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

/**
 * One compact row in the unified inbox: avatar, name, a single quiet
 * secondary line, time and chevron — no message snippets or ask quotes, so
 * ten-plus conversations stay scannable. Origin still decides identity: an
 * ask-origin row respects its anonymity/reveal state (anonymous label +
 * silhouette until profiles are mutually shared), a pal_match row always
 * shows the real person. The secondary line says which kind of chat it is
 * ("Pixel Pal" / "Peer chat"), plus the lifecycle status once it's past.
 */
function ConversationRow({ conversation, people, anon }: ConversationRowProps) {
  const navigate = useNavigate()
  const otherId = conversation.participantIds.find((id) => id !== ME_ID)
  const otherPerson = otherId ? people[otherId] : undefined
  const statusLabel = conversationStatusLabel(conversation.status)
  const isPal = conversation.origin === 'pal_match'

  let avatar
  let name: string | undefined
  let isNew = false
  let isAnon = false
  if (isPal) {
    avatar = <Avatar name={otherPerson?.displayName ?? 'Pixel Pal'} src={otherPerson?.avatarUrl} size="sm" />
    name = otherPerson?.displayName ?? 'Pixel Pal'
  } else {
    const bothShared = !!otherId && !!conversation.profileShared?.[ME_ID] && !!conversation.profileShared?.[otherId]
    avatar = bothShared ? (
      <Avatar name={otherPerson?.displayName ?? 'Pixel Pal'} src={otherPerson?.avatarUrl} size="sm" />
    ) : (
      <AnonymousAvatar seed={anon?.seed} size="sm" />
    )
    name = bothShared ? otherPerson?.displayName : anon?.name
    isAnon = !bothShared
    isNew = conversation.messages.length <= 1
  }

  // Still-anonymous chats say so in the secondary line — the nickname alone
  // could be someone's real Social Profile alias (see lib/palLabel).
  const kind = isPal ? 'Pixel Pal' : isAnon ? 'Anonymous · Peer chat' : 'Peer chat'
  const path = isPal
    ? `/pixel-pal-match/chat/${conversation.id}`
    : `/groups/pixel-pal/chat/${conversation.id}`

  return (
    <button
      type="button"
      onClick={() => navigate(path)}
      className="flex items-center gap-3 rounded-card border border-lavender-40 bg-white px-3 py-2.5 text-left"
    >
      {avatar}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-body-sm-bold text-navy">{name}</p>
          {isNew && (
            <span className="shrink-0 rounded-pill bg-lavender-40 px-1.5 py-0.5 text-label-bold uppercase text-navy">
              New
            </span>
          )}
        </div>
        <p className="truncate text-label text-navy-60">{statusLabel ? `${kind} · ${statusLabel}` : kind}</p>
      </div>
      <span className="shrink-0 text-label text-navy-40">{relativeTime(lastActivityAt(conversation))}</span>
      <ChevronRight />
    </button>
  )
}

/**
 * `/messages` — the unified inbox (V4 direction doc): every persisted
 * peer-to-peer conversation lives here regardless of whether it came from
 * Ask or Pal Auto Match, alongside the existing Care Team content.
 *
 * Only the Pal Auto Match entry point lives here — Ask's own entry point is
 * the Groups tab (Groups ⇄ Peer Support), not Messages, per direct
 * instruction. Ask conversations still surface in this inbox once they
 * exist; this only changes where the *ask* discovery action is offered, not
 * where its resulting conversations live.
 *
 * Contextual links elsewhere (My Ask's "Ongoing" section, Match Found's
 * "Say hello") open the same persisted conversation, not a copy of it — see
 * those screens.
 *
 * Sorted by most recent activity (last message, or creation time if no
 * messages yet) rather than creation order, so an old but active thread
 * with a new reply outranks a newer, quieter one.
 */
export default function Messages() {
  const navigate = useNavigate()
  const conversations = useDemoStore((s) => s.conversations)
  const people = useDemoStore((s) => s.people)
  const me = useDemoStore((s) => s.me)
  const [pastOpen, setPastOpen] = useState(false)

  const myConversations = Object.values(conversations)
    .filter((c) => c.participantIds.includes(ME_ID))
    // Reported conversations must disappear from Messages entirely — not a
    // read-only row, not a badge, gone — and never come back (see
    // reportPalMatchConversation in the store).
    .filter((c) => c.status !== 'reported')
    .sort((a, b) => lastActivityAt(b).localeCompare(lastActivityAt(a)))
  // Active chats first (her one active Pixel Pal pinned above peer chats),
  // finished ones (graduated / ended / blocked) tucked into "Past" — nothing
  // is deleted, just out of the way. Legacy chats with no `status` count as
  // active, same as everywhere else.
  const isPast = (c: Conversation) => c.status === 'graduated' || c.status === 'ended' || c.status === 'blocked'
  const activeConversations = myConversations
    .filter((c) => !isPast(c))
    .sort((a, b) => Number(b.origin === 'pal_match') - Number(a.origin === 'pal_match'))
  const pastConversations = myConversations.filter(isPast)
  // Ask-only nicknames (see anonymousPalIdentities) — a pal_match
  // conversation never consumes a slot, same rule everywhere this is read.
  const anonIdentities = anonymousPalIdentities(Object.values(conversations), me, people)

  // Only one active Pal Auto Match relationship is ever allowed at a time
  // (see openPalMatchConversation in the store, which enforces the same
  // rule on the write side). 'active' is the only status that counts — a
  // graduated, rematch-ended, or reported pal_match conversation already
  // reads as a past/read-only row in the Conversations list below, so it
  // must not also keep blocking the entry card. Ask-origin conversations
  // never factor in here at all, regardless of how many she has.
  const hasActivePalMatch = Object.values(conversations).some(
    (c) => c.origin === 'pal_match' && c.participantIds.includes(ME_ID) && c.status === 'active',
  )

  return (
    <div className="relative flex min-h-full flex-col">
      <img
        src={bgGlow}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-full w-full object-cover"
      />

      <div className="relative flex flex-col gap-6 p-5">
        <GreetingHeader line1="How can we help," line2="Samantha?" />

        <CareTeamBlock />

        {/* Only offered while she has no active Pal Auto Match — once one
            exists it's already represented as a row in Conversations below,
            so re-offering "Find a Pixel Pal" here would suggest starting a
            second one, which the product (and the store) never allows. */}
        {!hasActivePalMatch && (
          <Card variant="glass" className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="flex shrink-0 items-center justify-center rounded-field bg-navy p-3">
                <img src={iconUserHeart} alt="" aria-hidden="true" className="h-6 w-6" />
              </span>
              <p className="text-body-sm-bold text-navy-80">Pixel Pal</p>
            </div>
            <p className="text-body text-navy-80">
              Connect one-to-one with someone who understands. Share experiences, talk things
              through, and navigate fertility treatment together.
            </p>
            <Button variant="primary" onClick={() => navigate('/pixel-pal-match/how-it-works')}>
              Find a Pixel Pal
            </Button>
          </Card>
        )}

        {activeConversations.length > 0 && (
          <div className="flex flex-col gap-2">
            {/* Same eyebrow as CareTeamBlock's "How can we help you?" above. */}
            <p className="text-center text-h5 uppercase text-navy-80">Conversations</p>
            {activeConversations.map((convo) => (
              <ConversationRow
                key={convo.id}
                conversation={convo}
                people={people}
                anon={anonIdentities[convo.id]}
              />
            ))}
          </div>
        )}

        {pastConversations.length > 0 && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setPastOpen((o) => !o)}
              aria-expanded={pastOpen}
              className="flex items-center gap-1 self-start text-label-bold uppercase text-navy-60"
            >
              Past ({pastConversations.length})
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`transition-transform ${pastOpen ? 'rotate-180' : ''}`}>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {pastOpen &&
              pastConversations.map((convo) => (
                <ConversationRow
                  key={convo.id}
                  conversation={convo}
                  people={people}
                  anon={anonIdentities[convo.id]}
                />
              ))}
          </div>
        )}
      </div>

      <TabBar />
    </div>
  )
}
