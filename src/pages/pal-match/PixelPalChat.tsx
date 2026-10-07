import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDemoStore } from '../../store/useDemoStore'
import { ME_ID } from '../../lib/seed'
import { Avatar } from '../../components/ui/Avatar'
import { TextField } from '../../components/ui/TextField'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { TextArea } from '../../components/ui/TextArea'
import { Toast } from '../../components/ui/Toast'
import { ReportReasonScreen } from '../../components/ReportReasonScreen'
import { QuietChatNotice } from '../../components/QuietChatNotice'
import { ChatClosure, GraduationNotes } from '../../components/ChatEnding'
import { ProfilePreviewSheet } from '../../components/ProfilePreviewSheet'

const starters = [
  {
    label: 'KEEP IT SIMPLE',
    message: "Hi! Nice to meet you. How's your week going?",
  },
  {
    label: 'TALK ABOUT TREATMENT',
    message: 'How have things been going for you lately?',
  },
  {
    label: 'TALK ABOUT SOMETHING ELSE',
    message: 'What do you like doing when you need a break from all of this?',
  },
]

// Demo/mocked attachment only — same lightweight approach as Ask's own
// Chat.tsx (see that file's MockAttachment): the shared data model has no
// attachment field, so this folds a line into the message text rather than
// introducing a second attachment system alongside Ask's.
type MockAttachment = { type: 'image' | 'file'; name: string }

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-navy">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-navy">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m4 17 5-5 4 4 3-3 4 4" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-navy">
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

// Same trigger glyph as Ask's own Chat.tsx (see that file's OverflowIcon) —
// the two chat headers now share one visual language for "more options".
function OverflowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="text-navy">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  )
}

/**
 * Pal Auto Match chat — ported from V2's `PixelPalChat.tsx`, but backed by
 * the shared, persisted `Conversation`/`sendMessage` store instead of V2's
 * local component state. A symmetric peer thread: no Member/Pal framing, no
 * request/accept state, no Ask-style anonymous label or mutual profile
 * reveal (identity is visible from the moment this conversation exists —
 * see Conversation.origin in lib/types.ts) and no Ask/reply context strip.
 *
 * Deliberately its own screen rather than a reuse of Ask's `Chat.tsx`: that
 * screen's header, context strip, and profile-reveal affordance are all
 * built around Ask-specific concepts that don't apply here (see the V4
 * direction doc — Ask and Pal Auto Match intentionally have different chat
 * experiences on top of the same Conversation entity).
 *
 * Attachments reuse Ask's own lightweight inline-mock pattern (a centered
 * `Modal` picker + a pending-attachment chip folded into the message text)
 * rather than porting V2's separate `AttachSheet`/`MessageAttachmentViews`
 * components — one mocked attachment approach, not two. Unlike Ask's chat,
 * there's no one-time privacy reminder before attaching: that reminder
 * exists there specifically because Ask starts anonymous, which doesn't
 * apply here.
 */
export default function PixelPalChat() {
  const navigate = useNavigate()
  const { conversationId } = useParams<{ conversationId: string }>()
  const conversations = useDemoStore((s) => s.conversations)
  const people = useDemoStore((s) => s.people)
  const sendMessage = useDemoStore((s) => s.sendMessage)
  const endPalMatchForRematch = useDemoStore((s) => s.endPalMatchForRematch)
  const graduateConversation = useDemoStore((s) => s.graduateConversation)
  const reportPalMatchConversation = useDemoStore((s) => s.reportPalMatchConversation)

  const [draft, setDraft] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [profilePreviewOpen, setProfilePreviewOpen] = useState(false)
  const [findSomeoneElseOpen, setFindSomeoneElseOpen] = useState(false)
  const [graduateOpen, setGraduateOpen] = useState(false)
  const [finalMessage, setFinalMessage] = useState('')
  const [reportOpen, setReportOpen] = useState(false)
  const [reportSubmittedOpen, setReportSubmittedOpen] = useState(false)
  const [actionToast, setActionToast] = useState('')
  const [attachSheetOpen, setAttachSheetOpen] = useState(false)
  const [attachment, setAttachment] = useState<MockAttachment | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const convo = conversationId ? conversations[conversationId] : undefined

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [convo?.messages.length])

  // 'reported' is deliberately treated the same as "doesn't exist" — a
  // reported conversation must be unreachable, not a read-only record (see
  // reportPalMatchConversation in the store). Hitting this URL directly
  // after reporting must not restore access to it. `!reportSubmittedOpen`
  // keeps this guard from firing mid-transition: reportPalMatchConversation
  // flips the status the instant Send Report is tapped, before she's seen
  // the "submitted" confirmation, and without that check this would swap
  // the confirmation out from under her.
  if (!convo || (convo.status === 'reported' && !reportSubmittedOpen)) {
    return (
      <div className="flex flex-col gap-4 p-5">
        <button type="button" onClick={() => navigate('/messages')} className="text-label-bold text-navy-60">
          ← Back
        </button>
        <p className="text-body text-navy-60">This conversation isn't available.</p>
      </div>
    )
  }

  const otherId = convo.participantIds.find((id) => id !== ME_ID)!
  const otherPerson = people[otherId]
  const palName = otherPerson?.alias ?? otherPerson?.displayName ?? 'your Pal'
  const hasSentFirstMessage = convo.messages.some((m) => m.senderId === ME_ID)
  // Any non-active status means nothing new gets sent here again — rematch-
  // ended (`endPalMatchForRematch`) or graduated (`graduateConversation`,
  // shared with Ask's Chat.tsx). `reported` never reaches this component at
  // all (see the guard above) and `blocked` never applies to a pal_match
  // conversation (that's Ask's own safety exit).
  const isReadOnly = convo.status !== 'active'
  const hasActivePalMatch = Object.values(conversations).some(
    (c) => c.origin === 'pal_match' && c.participantIds.includes(ME_ID) && c.status === 'active',
  )

  function handleSend() {
    if ((!draft.trim() && !attachment) || !convo) return
    const attachmentLine = attachment ? `📎 ${attachment.name}` : ''
    const text = [draft.trim(), attachmentLine].filter(Boolean).join('\n')
    sendMessage(convo.id, text)
    setDraft('')
    setAttachment(null)
  }

  // Fills the composer only — never sends on her behalf, same as V2.
  function handleStarterTap(text: string) {
    setDraft(text)
  }

  function handlePickAttachment(type: MockAttachment['type']) {
    setAttachSheetOpen(false)
    setAttachment(type === 'image' ? { type, name: 'IMG_0192.heic' } : { type, name: 'Visit-summary.pdf' })
  }

  // Ported from V2's `handleFindSomeoneElse` (no reason captured, nothing
  // shown to River), now resolved for a real persisted Conversation: marks
  // it ended-as-rematched (see endPalMatchForRematch) rather than deleting
  // it or reusing Ask's `graduateConversation` — a mismatch is not a
  // positive close-out, and the two must stay distinct lifecycle outcomes.
  function handleFindSomeoneElse() {
    if (!convo) return
    setFindSomeoneElseOpen(false)
    endPalMatchForRematch(convo.id)
    navigate('/pixel-pal-match/finding')
  }

  function flashToast(message: string) {
    setActionToast(message)
    setTimeout(() => setActionToast(''), 2000)
  }

  // Graduate — a positive, natural close-out, distinct from "Find someone
  // else" (a mismatch) and "Report" (a safety exit). The optional final
  // message rides along with the graduation as a thank-you note, shown as a
  // farewell card rather than an ordinary bubble (see GraduationNotes).
  function handleGraduateConfirm() {
    if (!convo) return
    graduateConversation(convo.id, finalMessage)
    setGraduateOpen(false)
    setFinalMessage('')
    flashToast('Graduated — kept as a read-only record.')
  }

  // Report — a safety/moderation exit, not a normal relationship ending.
  // Disconnects right away (reportPalMatchConversation marks the
  // conversation unreachable — see the store action and the `!convo ||
  // status === 'reported'` guard above); the "submitted" confirmation is
  // just an acknowledgment before she's routed back into the matching flow,
  // not a step she can back out of.
  function handleSubmitReport(reason: string) {
    if (!convo) return
    reportPalMatchConversation(convo.id, reason)
    setReportOpen(false)
    setReportSubmittedOpen(true)
  }

  function handleCloseReportSubmitted() {
    setReportSubmittedOpen(false)
    navigate('/pixel-pal-match/finding')
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* Header — alias + non-identifying... no: identity is real and
          visible from the start here, unlike Ask. No location, no exact
          treatment, no compatibility score. */}
      <div className="flex items-center gap-3 border-b border-navy-20 p-4">
        <button
          type="button"
          onClick={() => navigate('/messages')}
          aria-label="Back"
          className="flex h-11 w-11 shrink-0 items-center justify-center text-h4 text-navy"
        >
          ←
        </button>
        {/* Avatar + name open her Pal's Social Profile — never hidden in
            Pal Auto Match, so this is always the real profile. */}
        <button
          type="button"
          onClick={() => setProfilePreviewOpen(true)}
          aria-label="View profile"
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <Avatar name={otherPerson?.displayName ?? 'Pixel Pal'} src={otherPerson?.avatarUrl} size="sm" />
          <span className="truncate text-body-bold">{otherPerson?.alias ?? otherPerson?.displayName}</span>
        </button>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Conversation options"
          className="flex h-11 w-11 shrink-0 items-center justify-center"
        >
          <OverflowIcon />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Scrolls away with the rest of the conversation — shown once at
            the very start, not pinned. Seeing it again means scrolling all
            the way back up, same as the first thing anyone reads at the top
            of any chat. */}
        <p className="mb-3 text-center text-label text-navy-60">
          By chatting you agree to our <span className="underline">community guidelines</span>.
        </p>

        <div className="flex flex-col gap-3">
          {convo.messages.map((message) => {
            if (message.system) {
              return (
                <p key={message.id} className="text-center text-label text-navy-40">
                  {message.text}
                </p>
              )
            }
            const mine = message.senderId === ME_ID
            return (
              <div
                key={message.id}
                className={`max-w-[80%] whitespace-pre-line rounded-card px-4 py-2.5 text-body-sm ${
                  mine ? 'ml-auto bg-navy text-white' : 'mr-auto bg-white text-navy shadow-xs'
                }`}
              >
                {message.text}
              </div>
            )
          })}
          <GraduationNotes convo={convo} otherName={palName} />
          {!isReadOnly && <QuietChatNotice convo={convo} otherName={palName} />}
          <div ref={endRef} />
        </div>

        {/* Conversation starters — only before her first message, and only
            while the conversation is still active (see isReadOnly). */}
        {!isReadOnly && !hasSentFirstMessage && (
          <div className="mt-4 rounded-card border border-lavender-40 bg-lavender-20 p-4">
            <p className="text-body-bold text-navy">Not sure how to start?</p>
            <p className="mt-1 text-body-sm text-navy-60">Pick a direction, or write your own.</p>
            <div className="mt-3 flex flex-col gap-2">
              {starters.map((starter) => (
                <button
                  key={starter.label}
                  type="button"
                  onClick={() => handleStarterTap(starter.message)}
                  className="rounded-field border border-lavender-40 bg-white px-3 py-2.5 text-left transition-colors hover:border-lavender"
                >
                  <p className="text-label-bold uppercase text-navy-60">{starter.label}</p>
                  <p className="mt-0.5 text-body-sm text-navy">{starter.message}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quiet, persistent clinical-boundary affordance — fixed above the
          composer, same as the top guidelines line, so it's reachable
          regardless of how far the conversation has scrolled. Available
          even when read-only: Care Team access shouldn't depend on a
          match's status. */}
      <button
        type="button"
        onClick={() => navigate('/messages')}
        className="border-t border-navy-20 px-4 py-2 text-center text-label text-navy-60 hover:text-navy"
      >
        Need a nurse? Talk to your Care Team
      </button>

      {/* Composer — same +/input/Send shape as V2's PixelPalChat. Gone
          entirely once she's found someone else, same convention as Ask's
          own read-only treatment: a grayed-out input would still invite a
          tap. */}
      {isReadOnly ? (
        <ChatClosure
          convo={convo}
          otherName={palName}
          // Only once nothing else is active — one Pal at a time, same rule
          // as openPalMatchConversation and the Messages entry card.
          onFindNewPal={hasActivePalMatch ? undefined : () => navigate('/pixel-pal-match/finding')}
        />
      ) : (
      <div className="border-t border-navy-20 pt-3">
        {attachment && (
          <div className="mx-3 mb-2 flex items-center gap-2 rounded-card bg-lavender-20 px-3 py-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-icon bg-lavender-40">
              {attachment.type === 'image' ? <ImageIcon /> : <FileIcon />}
            </span>
            <p className="min-w-0 flex-1 truncate text-body-sm text-navy-80">{attachment.name}</p>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              aria-label="Remove attachment"
              className="flex h-6 w-6 shrink-0 items-center justify-center text-navy-40 hover:text-navy"
            >
              <XIcon />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 p-3 pt-0">
          <button
            type="button"
            onClick={() => setAttachSheetOpen(true)}
            aria-label="Add attachment"
            className="flex h-11 w-11 shrink-0 items-center justify-center"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-icon bg-lavender-40">
              <PlusIcon />
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <TextField
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a message…"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend()
              }}
              aria-label="Message"
            />
          </div>
          <button
            type="button"
            onClick={handleSend}
            aria-label="Send message"
            disabled={!draft.trim() && !attachment}
            className="flex h-11 w-11 shrink-0 items-center justify-center text-navy disabled:opacity-40"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
              <path d="M3.105 2.288a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.897 28.897 0 0015.293-7.155.75.75 0 000-1.114A28.897 28.897 0 003.105 2.288z" />
            </svg>
          </button>
        </div>
      </div>
      )}

      {/* Attachment picker — centered modal, matching the reference design
          (not a bottom sheet), same as Ask's own Chat.tsx. Demo/mocked
          selection only, see MockAttachment. */}
      <Modal
        isOpen={attachSheetOpen}
        onClose={() => setAttachSheetOpen(false)}
        title="Attach a File"
        className="bg-yellow-40"
      >
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => handlePickAttachment('image')}
            className="w-full rounded-pill bg-lavender-80 py-3 text-body-bold text-navy"
          >
            Image from Camera
          </button>
          <button
            type="button"
            onClick={() => handlePickAttachment('image')}
            className="w-full rounded-pill bg-lavender-80 py-3 text-body-bold text-navy"
          >
            Image from Gallery
          </button>
          <button
            type="button"
            onClick={() => handlePickAttachment('file')}
            className="w-full rounded-pill bg-lavender-80 py-3 text-body-bold text-navy"
          >
            Document
          </button>
          <Button variant="outline" onClick={() => setAttachSheetOpen(false)}>
            Cancel
          </Button>
        </div>
      </Modal>

      {/* Relationship menu — symmetric, Pal Auto Match-only. Three
          fundamentally different relationship-ending outcomes, matching the
          Ask chat's own Graduate/Report menu in spirit (see
          community/Chat.tsx): a positive close-out, a mismatch/rematch, and
          a safety exit must stay distinct actions, not collapse into one.
          Yellow surface + solid pill buttons — the same "Attach a File"
          pattern both chats already use, not a bottom sheet, so More menus
          across the app share one visual language. "Find someone
          else"/"Graduate" disabled once the conversation is already closed;
          Report stays available either way, also matching Ask. No "Pause" —
          it was a presentational-only placeholder ported from V2 with no
          real lifecycle meaning; removed rather than left as dead UI. */}
      <Modal isOpen={menuOpen} onClose={() => setMenuOpen(false)} title="Conversation" className="bg-yellow-40">
        <div className="flex flex-col gap-3">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => {
              setMenuOpen(false)
              setFindSomeoneElseOpen(true)
            }}
            className="w-full rounded-pill bg-lavender-80 py-3 text-body-bold text-navy disabled:opacity-40"
          >
            Find someone else
          </button>
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => {
              setMenuOpen(false)
              setGraduateOpen(true)
            }}
            className="w-full rounded-pill bg-lavender-80 py-3 text-body-bold text-navy disabled:opacity-40"
          >
            Graduate
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false)
              setReportOpen(true)
            }}
            className="w-full rounded-pill bg-lavender-80 py-3 text-body-bold text-navy"
          >
            Report a concern
          </button>
          <Button variant="outline" onClick={() => setMenuOpen(false)}>
            Cancel
          </Button>
        </div>
      </Modal>

      <Modal isOpen={findSomeoneElseOpen} onClose={() => setFindSomeoneElseOpen(false)} title="Find someone else?">
        <p className="mb-4 text-body-sm text-navy-60">
          Sometimes a connection just isn&rsquo;t the right fit. You don&rsquo;t need to give a
          reason.
        </p>
        <div className="flex flex-col gap-2">
          <Button variant="outline" onClick={handleFindSomeoneElse}>
            Find someone else
          </Button>
          <Button variant="primary" onClick={() => setFindSomeoneElseOpen(false)}>
            Keep this Pixel Pal
          </Button>
        </div>
      </Modal>

      {/* Graduate — the "Thanks screen": a positive close-out, with an
          optional, never-prefilled final message to her Pal. Left empty,
          graduation still works exactly the same as a plain confirm. */}
      <Modal
        isOpen={graduateOpen}
        onClose={() => {
          setGraduateOpen(false)
          setFinalMessage('')
        }}
        title="Graduate from this chat?"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-card bg-lavender-20 p-3">
            <Avatar name={otherPerson?.displayName ?? 'Pixel Pal'} src={otherPerson?.avatarUrl} size="md" />
            <p className="text-body-bold text-navy">{palName}</p>
          </div>
          <p className="text-body-sm text-navy-60">
            Your chat with {palName} has meant something &mdash; closing it here is a good thing. You
            won&rsquo;t be able to send new messages after this, but the conversation stays as a
            read-only record.
          </p>
          <TextArea
            rows={3}
            maxLength={280}
            value={finalMessage}
            onChange={(e) => setFinalMessage(e.target.value)}
            placeholder={`Write a final message to ${palName} — optional`}
            aria-label="Final message"
          />
          <Button variant="primary" onClick={handleGraduateConfirm}>
            Graduate
          </Button>
          <Button variant="ghost" onClick={() => { setGraduateOpen(false); setFinalMessage('') }}>
            Not yet
          </Button>
        </div>
      </Modal>

      {/* Report — a safety/moderation exit. Full-screen reason picker
          (matching the reference, Figma node 16895:36686) instead of the
          old free-text-only modal, then a small confirmation card — this
          ends the connection right away (reportPalMatchConversation), so
          the confirmation is an acknowledgment, not a step to back out of. */}
      <ReportReasonScreen isOpen={reportOpen} onBack={() => setReportOpen(false)} onSubmit={handleSubmitReport} />

      <Modal isOpen={reportSubmittedOpen} onClose={handleCloseReportSubmitted}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div>
            <p className="text-body-bold text-navy">Your report has been submitted.</p>
            <p className="mt-1 text-body-sm text-navy-60">This is the next step.</p>
          </div>
          <Button variant="soft" onClick={handleCloseReportSubmitted}>
            Close
          </Button>
        </div>
      </Modal>

      <ProfilePreviewSheet
        isOpen={profilePreviewOpen}
        onClose={() => setProfilePreviewOpen(false)}
        person={otherPerson}
      />

      <Toast message={actionToast} isOpen={!!actionToast} />
    </div>
  )
}
