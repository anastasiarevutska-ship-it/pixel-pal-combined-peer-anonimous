import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useDemoStore } from '../store/useDemoStore'
import { ME_ID } from '../lib/seed'
import { anonymousPalIdentities } from '../lib/palLabel'
import { canSayThanks } from '../lib/graduation'
import { usePhoneOverlayNode } from './ui/PhoneFrame'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { TextArea } from './ui/TextArea'
import { Toast } from './ui/Toast'

const AUTO_DISMISS_MS = 6000

/**
 * iOS-style push banner, pinned under the status bar — the quiet-chat
 * reminder (lib/quietChat), and the other person graduating or moving on
 * (lib/graduation), for peer and Pixel Pal chats alike.
 * Tapping opens the chat, as a real push would. Copy names the chat the
 * same way Messages does (nickname until profiles are shared) and never
 * quotes ordinary messages, since pushes show on a lock screen.
 *
 * A graduation is the exception: the chat is already archived, so the push
 * itself carries their thank-you note and two actions — "Say thanks"
 * (opens a small composer here, no trip into the chat) or "Dismiss". It
 * stays up until she picks one, rather than timing out.
 */
export function PushBanner() {
  const navigate = useNavigate()
  const overlayNode = usePhoneOverlayNode()
  const prefersReducedMotion = useReducedMotion()
  const push = useDemoStore((s) => s.pushNotification)
  const dismissPush = useDemoStore((s) => s.dismissPush)
  const conversations = useDemoStore((s) => s.conversations)
  const people = useDemoStore((s) => s.people)
  const me = useDemoStore((s) => s.me)
  const sendFarewell = useDemoStore((s) => s.sendFarewell)
  // Outlives the push itself — the banner closes when the composer opens.
  const [thanksFor, setThanksFor] = useState<{ conversationId: string; name: string } | null>(null)
  const [draft, setDraft] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!push || push.kind === 'graduated') return
    const timer = setTimeout(dismissPush, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [push, dismissPush])

  const convo = push ? conversations[push.conversationId] : undefined
  let name: string | undefined
  if (convo) {
    const otherId = convo.participantIds.find((id) => id !== ME_ID)
    const bothShared = !!otherId && !!convo.profileShared?.[ME_ID] && !!convo.profileShared?.[otherId]
    const other = otherId ? people[otherId] : undefined
    // Pixel Pal chats are never anonymous; peer chats stay on their
    // nickname until both profiles are shared.
    name =
      convo.origin === 'pal_match'
        ? (other?.alias ?? other?.displayName)
        : bothShared
          ? other?.displayName
          : anonymousPalIdentities(Object.values(conversations), me, people)[convo.id]?.name
  }

  const who = name ?? 'your peer'
  const copy =
    push?.kind === 'graduated'
      ? {
          title: `${who} graduated from your chat 💜`,
          body: convo?.graduation?.thankYou
            ? `“${convo.graduation.thankYou}”`
            : 'The chat is now archived.',
        }
      : push?.kind === 'ended'
        ? {
            // Never why — the same courtesy her own "Find someone else"
            // extends to her Pal.
            title: `Your Pixel Pal chat with ${who} has ended`,
            body: "Whenever you're ready, we can help you find a new Pixel Pal.",
          }
        : {
            title: `Your chat with ${who}`,
            body: "It's been a little while — pick it up whenever you're ready.",
          }

  function handleOpen() {
    if (!convo) return
    dismissPush()
    navigate(
      convo.origin === 'pal_match' ? `/pixel-pal-match/chat/${convo.id}` : `/groups/pixel-pal/chat/${convo.id}`,
    )
  }

  const showThanksActions = push?.kind === 'graduated' && !!convo && canSayThanks(convo)

  function handleSayThanks() {
    if (!convo) return
    setThanksFor({ conversationId: convo.id, name: who })
    dismissPush()
  }

  function handleSendThanks() {
    if (!thanksFor) return
    sendFarewell(thanksFor.conversationId, draft)
    setThanksFor(null)
    setDraft('')
    setToast('Thank-you sent 💜')
    setTimeout(() => setToast(''), 2000)
  }

  function closeThanks() {
    setThanksFor(null)
    setDraft('')
  }

  const banner = (
    <AnimatePresence>
      {convo && (
        <motion.div
          className="pointer-events-auto absolute inset-x-3 top-11 z-[60] flex flex-col gap-3 rounded-field bg-white/95 p-3 shadow-card backdrop-blur"
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -24 }}
          transition={{ duration: 0.25 }}
        >
          <button type="button" onClick={handleOpen} className="flex items-start gap-3 text-left">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-icon bg-navy text-label-bold text-white">
              P
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="text-label-bold uppercase text-navy-60">Pixel Pal</span>
                <span className="text-label text-navy-40">now</span>
              </span>
              <span className="block text-body-sm-bold text-navy">{copy.title}</span>
              <span className="line-clamp-4 block text-body-sm text-navy-80">{copy.body}</span>
            </span>
          </button>
          {showThanksActions && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSayThanks}
                className="flex-1 rounded-pill bg-lavender-40 py-2 text-body-sm-bold text-navy"
              >
                {convo.graduation?.thankYou ? 'Say thanks too' : 'Say thanks'}
              </button>
              <button
                type="button"
                onClick={dismissPush}
                className="flex-1 rounded-pill border border-navy-20 py-2 text-body-sm-bold text-navy"
              >
                Dismiss
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <>
      {overlayNode ? createPortal(banner, overlayNode) : banner}
      {/* One thank-you back — it lands in the (already archived) chat as a
          note card, see GraduationNotes. */}
      <Modal isOpen={!!thanksFor} onClose={closeThanks} title={`Say thanks to ${thanksFor?.name ?? ''}`}>
        <div className="flex flex-col gap-4">
          <TextArea
            rows={4}
            maxLength={280}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write your thank-you…"
            aria-label="Thank-you message"
            autoFocus
          />
          <Button variant="primary" disabled={!draft.trim()} onClick={handleSendThanks}>
            Send
          </Button>
          <Button variant="ghost" onClick={closeThanks}>
            Cancel
          </Button>
        </div>
      </Modal>
      {overlayNode && createPortal(<Toast message={toast} isOpen={!!toast} />, overlayNode)}
    </>
  )
}
