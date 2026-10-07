import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useDemoStore } from '../../store/useDemoStore'
import { ME_ID } from '../../lib/seed'
import { anonymousPalIdentities } from '../../lib/palLabel'
import { QuietChatNotice } from '../../components/QuietChatNotice'
import { ChatClosure, GraduationNotes } from '../../components/ChatEnding'
import { TextArea } from '../../components/ui/TextArea'
import { ProfilePreviewSheet } from '../../components/ProfilePreviewSheet'
import { SocialProfileCard } from '../../components/SocialProfileCard'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/TextField'
import { Modal } from '../../components/ui/Modal'
import { Sheet } from '../../components/ui/Sheet'
import { Toast } from '../../components/ui/Toast'
import { ReportReasonScreen } from '../../components/ReportReasonScreen'
import { ReportSentScreen } from '../../components/ReportSentScreen'

function ChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-navy">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

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

function SendIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
      <path d="M3.105 2.288a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.897 28.897 0 0015.293-7.155.75.75 0 000-1.114A28.897 28.897 0 003.105 2.288z" />
    </svg>
  )
}

function OverflowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="text-navy">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  )
}

type MockAttachment = { type: 'image' | 'file'; name: string }

/**
 * `/groups/pixel-pal/chat/:conversationId` — the private 1:1 conversation.
 * Both sides start anonymous; the context strip keeps the original ask
 * visible so the connection still makes sense once neither person is
 * looking at the feed anymore. "Share my profile" is the only way identity
 * ever moves — one tap from each side, never automatic.
 */
export default function Chat() {
  const navigate = useNavigate()
  const location = useLocation()
  const { pathname } = location
  const { conversationId } = useParams<{ conversationId: string }>()
  const conversations = useDemoStore((s) => s.conversations)
  const people = useDemoStore((s) => s.people)
  const me = useDemoStore((s) => s.me)
  const sendMessage = useDemoStore((s) => s.sendMessage)
  const shareMyProfile = useDemoStore((s) => s.shareMyProfile)
  const hideMyProfile = useDemoStore((s) => s.hideMyProfile)
  const graduateConversation = useDemoStore((s) => s.graduateConversation)
  const reportConversation = useDemoStore((s) => s.reportConversation)

  const [draft, setDraft] = useState('')
  // Reopened on return from "Edit Social Profile" (see the share sheet).
  const [profileModalOpen, setProfileModalOpen] = useState(
    () => !!(location.state as { openShareSheet?: boolean } | null)?.openShareSheet,
  )
  // One-shot: drop that flag once read, so a reload doesn't reopen it.
  useEffect(() => {
    if ((location.state as { openShareSheet?: boolean } | null)?.openShareSheet) {
      navigate(pathname, { replace: true, state: null })
    }
  }, [location.state, navigate, pathname])
  const [hideProfileConfirmOpen, setHideProfileConfirmOpen] = useState(false)
  const [profilePreviewOpen, setProfilePreviewOpen] = useState(false)
  // Set once she hides her profile this visit — holds back the "Ready to
  // introduce yourself?" prompt so taking it back isn't met with an
  // immediate ask to share again.
  const [justHidProfile, setJustHidProfile] = useState(false)
  const [contextExpanded, setContextExpanded] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  // Conversation-management — the header's overflow menu and what it opens.
  // A plain boolean per surface (not one "which dialog" enum) matches the
  // rest of this file's style (profileModalOpen, reminderOpen, …).
  const [menuOpen, setMenuOpen] = useState(false)
  const [graduateConfirmOpen, setGraduateConfirmOpen] = useState(false)
  const [graduateNote, setGraduateNote] = useState('')
  const [reportOpen, setReportOpen] = useState(false)
  const [reportSubmittedOpen, setReportSubmittedOpen] = useState(false)
  const [actionToast, setActionToast] = useState('')

  // Attachments — demo/mocked only, see handlePickAttachment. `reminderSeen`
  // is per-mount (not persisted), so the privacy note is a one-time-per-visit
  // nudge rather than a stored preference.
  const [attachSheetOpen, setAttachSheetOpen] = useState(false)
  const [attachment, setAttachment] = useState<MockAttachment | null>(null)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [reminderSeen, setReminderSeen] = useState(false)
  const [pendingAttachmentType, setPendingAttachmentType] = useState<MockAttachment['type'] | null>(null)

  const convo = conversationId ? conversations[conversationId] : undefined
  const messageRequests = useDemoStore((s) => s.messageRequests)
  const acknowledgeAcceptedRequests = useDemoStore((s) => s.acknowledgeAcceptedRequests)

  // Opening the chat clears its "new accepted request" markers (Peer Support
  // card, nav dots) — however she got here, not just via that card.
  useEffect(() => {
    if (!convo?.askId) return
    const ids = Object.values(messageRequests)
      .filter((r) => r.askId === convo.askId && r.responderId === ME_ID && r.status === 'accepted')
      .map((r) => r.id)
    if (ids.length) acknowledgeAcceptedRequests(ids)
  }, [convo?.askId, messageRequests, acknowledgeAcceptedRequests])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [convo?.messages.length])

  // A reported chat is gone, not read-only — same as Pixel Pal. Kept
  // rendering only while the "report sent" screen is still on top of it.
  if (!convo || (convo.status === 'reported' && !reportSubmittedOpen)) {
    return (
      <div className="flex flex-col gap-4 p-5">
        <button type="button" onClick={() => navigate('/groups/pixel-pal')} className="text-label-bold text-navy-60">
          ← Back
        </button>
        <p className="text-body text-navy-60">This conversation isn't available.</p>
      </div>
    )
  }

  const otherId = convo.participantIds.find((id) => id !== ME_ID)!
  const otherPerson = people[otherId]
  const meShared = convo.profileShared?.[ME_ID]
  const otherShared = convo.profileShared?.[otherId]
  const bothShared = meShared && otherShared
  // Same stable nickname as Messages and Your Post (see lib/palLabel) —
  // this connection must read as the same person here as it does there.
  const anon = anonymousPalIdentities(Object.values(conversations), me, people)[convo.id]
  const otherName = (bothShared ? otherPerson?.displayName : anon?.name) ?? 'your peer'
  // The profile-sharing prompt is demo-gated behind an actual back-and-forth
  // — showing it the instant the chat opens (before she's said anything
  // herself) would front-load an identity decision ahead of the
  // conversation it's supposed to be secondary to.
  const hasExchanged = convo.messages.some((m) => !m.system && m.senderId === ME_ID)
  // Rough heuristic for whether the original post needs a "More" toggle —
  // no live layout measurement, just long-enough-to-likely-wrap-past-2-lines.
  const contextIsLong = (convo.askSnippet?.length ?? 0) > 90
  // Graduated or blocked — either way, nothing new gets sent here again;
  // the thread stays as a record rather than disappearing (see spec).
  // Checked positively, not `!== 'active'`: conversations already sitting in
  // a demo's localStorage from before this field existed have no `status`
  // at all, and those must read as active, not silently lock up read-only.
  const isReadOnly = convo.status === 'graduated' || convo.status === 'blocked'

  function handleSend() {
    if ((!draft.trim() && !attachment) || !convo) return
    // The data model has no attachment field (demo-only, see
    // MockAttachment) — folding it into the message text is the lightweight
    // way to make it visible in the thread without touching the store/types
    // for a mocked feature.
    const attachmentLine = attachment ? `📎 ${attachment.name}` : ''
    const text = [draft.trim(), attachmentLine].filter(Boolean).join('\n')
    sendMessage(convo.id, text)
    setDraft('')
    setAttachment(null)
  }

  function applyAttachment(type: MockAttachment['type']) {
    setAttachment(type === 'image' ? { type, name: 'IMG_0192.heic' } : { type, name: 'Visit-summary.pdf' })
  }

  function handlePickAttachment(type: MockAttachment['type']) {
    setAttachSheetOpen(false)
    if (reminderSeen) {
      applyAttachment(type)
    } else {
      // First attachment attempt this visit — the privacy reminder gates
      // applying it; picking a type again afterward skips straight through.
      setPendingAttachmentType(type)
      setReminderOpen(true)
    }
  }

  function handleReminderContinue() {
    setReminderSeen(true)
    setReminderOpen(false)
    if (pendingAttachmentType) applyAttachment(pendingAttachmentType)
    setPendingAttachmentType(null)
  }

  function flashToast(message: string) {
    setActionToast(message)
    setTimeout(() => setActionToast(''), 2000)
  }

  function handleGraduateConfirm() {
    if (!convo) return
    graduateConversation(convo.id, graduateNote)
    setGraduateConfirmOpen(false)
    setGraduateNote('')
    flashToast('Conversation graduated — kept as a read-only record.')
  }

  // Removes the chat for good (see reportConversation) — the confirmation
  // screen says so. No real moderation pipeline behind it (spec's "not
  // built"), just the outcome she'd see.
  function handleSubmitReport(reason: string) {
    if (!convo) return
    reportConversation(convo.id, reason)
    setReportOpen(false)
    setReportSubmittedOpen(true)
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* Header — identity reflects the reveal state, not a fixed name. */}
      <div className="flex items-center gap-3 border-b border-lavender-20 p-4">
        <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="flex h-11 w-11 shrink-0 items-center justify-center">
          <span className="flex h-8 w-8 items-center justify-center rounded-icon bg-lavender-40">
            <ChevronLeft />
          </span>
        </button>
        {/* Avatar + name open the profile preview — the real Social
            Profile once both have shared, an anonymous card until then. */}
        <button
          type="button"
          onClick={() => setProfilePreviewOpen(true)}
          aria-label="View profile"
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <Avatar
            name={(bothShared ? otherPerson?.displayName : anon?.name) ?? 'Anonymous'}
            src={bothShared ? otherPerson?.avatarUrl : undefined}
            size="md"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-body-bold text-navy">{bothShared ? otherPerson?.displayName : anon?.name}</span>
            <span className="block truncate text-label text-navy-40">
              {bothShared ? "You've introduced yourselves" : 'Still anonymous to each other'}
            </span>
          </span>
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

      {/* Fixed, always-visible — never scrolls away with the conversation.
          Same treatment as Pal chat's own top bar (see PixelPalChat.tsx). */}
      <p className="border-b border-lavender-20 px-4 py-2 text-center text-label text-navy-60">
        By chatting you agree to our <span className="underline">community guidelines</span>.
      </p>

      <div className="flex-1 overflow-y-auto flex flex-col gap-4 p-4">
        {/* Context strip — why these two are talking. Supporting context,
            not primary content, so a long original post clamps to ~2 lines
            with a "More" toggle rather than pushing the actual
            conversation down the screen. */}
        <div className="rounded-card bg-lavender-20 p-3">
          <p className="text-label-bold uppercase text-navy-60">You connected over</p>
          <p className={`mt-1 text-body-sm italic text-navy-80 ${contextExpanded ? '' : 'line-clamp-2'}`}>
            “{convo.askSnippet}”
          </p>
          {contextIsLong && (
            <button
              type="button"
              onClick={() => setContextExpanded((v) => !v)}
              className="mt-1 text-label-bold text-navy-60 underline-offset-4 hover:underline"
            >
              {contextExpanded ? 'Less' : 'More'}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
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
              <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] whitespace-pre-line rounded-card px-4 py-2.5 text-body-sm ${
                    mine ? 'bg-navy text-white' : 'bg-white text-navy shadow-card'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            )
          })}
          <GraduationNotes convo={convo} otherName={otherName} />
          {!isReadOnly && (
            <QuietChatNotice convo={convo} otherName={otherName} />
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Profile-reveal affordance — optional, mutual, never automatic, and
          held back until she's actually said something herself: showing an
          identity decision before any exchange has happened would outrank
          the conversation it's meant to stay secondary to. A small
          contextual line, not a feature card — a plain navy text action
          (the product's existing secondary-action style), never a filled
          button that could read as a required next step. */}
      {hasExchanged && !bothShared && !isReadOnly && (
        <div className="mx-4 mb-3">
          {!meShared && !justHidProfile && (
            <div className="flex items-center justify-between gap-3 rounded-card bg-navy-20/30 px-3 py-2">
              <div className="min-w-0">
                <p className="text-body-sm text-navy-80">Ready to introduce yourself?</p>
                <p className="text-label text-navy-40">You can share your profile when you feel comfortable.</p>
              </div>
              <button
                type="button"
                onClick={() => setProfileModalOpen(true)}
                className="shrink-0 text-body-sm-bold text-navy underline-offset-4 hover:underline"
              >
                Share my profile
              </button>
            </div>
          )}
          {meShared && !otherShared && (
            <p className="text-label text-navy-40">You shared your profile — waiting for them to share theirs too.</p>
          )}
        </div>
      )}

      {/* Quiet, persistent clinical-boundary affordance — fixed above the
          composer, same as the top guidelines line and same purpose as Pal
          chat's own footer link (see PixelPalChat.tsx). Available even when
          read-only: Care Team access shouldn't depend on a conversation's
          status. */}
      <button
        type="button"
        onClick={() => navigate('/messages')}
        className="border-t border-lavender-20 px-4 py-2 text-center text-label text-navy-60 hover:text-navy"
      >
        Need a nurse? Talk to your Care Team
      </button>

      {isReadOnly ? (
        // Read-only record — graduated or blocked. The composer itself is
        // gone rather than disabled (a grayed-out input would still invite
        // a tap) — except for the one thank-you she gets after the other
        // person graduates (see ChatClosure).
        <ChatClosure convo={convo} otherName={otherName} />
      ) : (
      <div className="relative mt-auto flex flex-col gap-2 border-t border-lavender-20 px-4 py-2">
        {attachment && (
          <div className="flex items-center gap-2 rounded-card bg-lavender-20 px-3 py-2">
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
        {/* `min-w-0` on the input's own wrapper is load-bearing: TextField's
            `className` prop lands on the inner <input>, not this outer div,
            so without an explicit flex-sized wrapper here the field never
            actually participates in the row's flex-shrink/grow — it was
            sizing to its own content instead of the available space, which
            is what pushed Send past the right edge once a third control
            (attachment) joined the row. */}
        <div className="flex items-center gap-2">
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend()
              }}
              placeholder="Write a message…"
              className="w-full"
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
            <SendIcon />
          </button>
        </div>
      </div>
      )}

      {/* Attachment picker — centered modal, matching the reference design
          (not a bottom sheet). Demo/mocked selection only, see
          MockAttachment. */}
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

      {/* One-time privacy nudge — anonymous conversation, so attachments get
          a beat of friction the first time only (`reminderSeen`), never
          again after that within this visit. */}
      <Modal isOpen={reminderOpen} onClose={() => setReminderOpen(false)} title="Before you share">
        <div className="flex flex-col gap-4">
          <p className="text-body-sm text-navy-60">
            Photos and files may contain personal information. Only share what you're comfortable
            with.
          </p>
          <Button variant="primary" onClick={handleReminderContinue}>
            Continue
          </Button>
        </div>
      </Modal>

      <ProfilePreviewSheet
        isOpen={profilePreviewOpen}
        onClose={() => setProfilePreviewOpen(false)}
        person={bothShared ? otherPerson : undefined}
        anon={anon}
        meShared={!!meShared}
        onShareProfile={
          isReadOnly
            ? undefined
            : () => {
                setProfilePreviewOpen(false)
                setProfileModalOpen(true)
              }
        }
      />

      {/* Share confirmation — shows her whole Social Profile, exactly as
          the other person will see it (same card as Pal Auto Match's
          preview), with a way to fix anything first. "Edit" goes to the
          shared edit screen and comes straight back here with this sheet
          reopened. */}
      <Sheet
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title="Share your profile?"
        footer={
          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              onClick={() => {
                shareMyProfile(convo.id)
                setProfileModalOpen(false)
              }}
            >
              Share my profile
            </Button>
            <Button
              variant="soft-outline"
              onClick={() =>
                navigate('/pixel-pal-match/social-profile-edit', {
                  // Replace, both ways, so the chat's own Back still
                  // leaves the chat rather than stepping into the editor.
                  replace: true,
                  state: { returnTo: pathname, returnState: { openShareSheet: true } },
                })
              }
            >
              Edit Social Profile
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-body-sm text-navy-60">
            This is how they'll see you. They'll be asked to share theirs too — sharing is always
            mutual, never automatic.
          </p>
          <div className="rounded-card bg-lavender-20 p-4">
            <SocialProfileCard person={me} />
          </div>
        </div>
      </Sheet>

      {/* Conversation options — chat management, not identity (that's "Share
          my profile" above, kept separate on purpose: it's about the
          relationship progressing, not about managing the thread) — except
          "Hide my profile", which is an exit from an identity decision and
          so belongs with the other ways out rather than inline. Yellow
          surface + solid pill buttons — the same "Attach a File" pattern
          this chat already uses, not a bottom sheet, and the same treatment
          Pal Auto Match's own menu uses (see pal-match/PixelPalChat.tsx), so
          every chat's More menu now shares one visual language. No "Block":
          Report already covers the safety-exit case, and duplicating it as
          a second, near-identical action added a choice without a real
          difference. */}
      <Modal isOpen={menuOpen} onClose={() => setMenuOpen(false)} title="Conversation" className="bg-yellow-40">
        <div className="flex flex-col gap-3">
          {/* Only for a one-sided share: she revealed herself, they haven't,
              and she's changed her mind. Once both have shared, the reveal
              is complete and there's nothing to take back. */}
          {meShared && !otherShared && !isReadOnly && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                setHideProfileConfirmOpen(true)
              }}
              className="w-full rounded-pill bg-lavender-80 py-3 text-body-bold text-navy"
            >
              Hide my profile
            </button>
          )}
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => {
              setMenuOpen(false)
              setGraduateConfirmOpen(true)
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

      <Modal
        isOpen={hideProfileConfirmOpen}
        onClose={() => setHideProfileConfirmOpen(false)}
        title="Hide your profile?"
      >
        <div className="flex flex-col gap-4">
          <p className="text-body-sm text-navy-60">
            They won't see your name and photo anymore — you'll be anonymous to each other again.
            You can share it later if you change your mind.
          </p>
          <Button
            variant="primary"
            onClick={() => {
              hideMyProfile(convo.id)
              setJustHidProfile(true)
              setHideProfileConfirmOpen(false)
              flashToast('Your profile is hidden.')
            }}
          >
            Hide my profile
          </Button>
          <Button variant="ghost" onClick={() => setHideProfileConfirmOpen(false)}>
            Keep sharing
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={graduateConfirmOpen}
        onClose={() => setGraduateConfirmOpen(false)}
        title="Graduate from chat?"
      >
        <div className="flex flex-col gap-4">
          <p className="text-body-sm text-navy-60">
            You won't be able to send new messages here, but the conversation stays as a read-only
            record — it won't disappear.
          </p>
          {/* Optional thank-you — same as Pixel Pal's graduate step, so
              both chats close the same way (see GraduationNotes). */}
          <TextArea
            rows={3}
            maxLength={280}
            value={graduateNote}
            onChange={(e) => setGraduateNote(e.target.value)}
            placeholder={`Write a thank-you to ${otherName} — optional`}
            aria-label="Thank-you message"
          />
          <Button variant="primary" onClick={handleGraduateConfirm}>
            Graduate from chat
          </Button>
          <Button variant="ghost" onClick={() => setGraduateConfirmOpen(false)}>
            Not yet
          </Button>
        </div>
      </Modal>

      {/* Report — full-screen reason picker (Figma node 16895:36686), then
          a full-screen confirmation; both shared with PixelPalChat.tsx. */}
      <ReportReasonScreen title="Report Peer" isOpen={reportOpen} onBack={() => setReportOpen(false)} onSubmit={handleSubmitReport} />

      <ReportSentScreen
        isOpen={reportSubmittedOpen}
        kind="peer"
        onClose={() => {
          setReportSubmittedOpen(false)
          navigate('/messages')
        }}
      />

      <Toast message={actionToast} isOpen={!!actionToast} />
    </div>
  )
}
