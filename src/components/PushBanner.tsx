import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useDemoStore } from '../store/useDemoStore'
import { ME_ID } from '../lib/seed'
import { anonymousPalIdentities } from '../lib/palLabel'
import { usePhoneOverlayNode } from './ui/PhoneFrame'

const AUTO_DISMISS_MS = 6000

/**
 * iOS-style push banner, pinned under the status bar — the quiet-chat
 * reminder (see lib/quietChat), for peer and Pixel Pal chats alike.
 * Tapping opens the chat, as a real push would. Copy names the chat the
 * same way Messages does (nickname until profiles are shared) and never
 * quotes message content, since pushes show on a lock screen.
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

  useEffect(() => {
    if (!push) return
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

  function handleOpen() {
    if (!convo) return
    dismissPush()
    navigate(
      convo.origin === 'pal_match' ? `/pixel-pal-match/chat/${convo.id}` : `/groups/pixel-pal/chat/${convo.id}`,
    )
  }

  const banner = (
    <AnimatePresence>
      {convo && (
        <motion.button
          type="button"
          onClick={handleOpen}
          className="pointer-events-auto absolute inset-x-3 top-11 z-[60] flex items-start gap-3 rounded-field bg-white/95 p-3 text-left shadow-card backdrop-blur"
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -24 }}
          transition={{ duration: 0.25 }}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-icon bg-navy text-label-bold text-white">
            P
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2">
              <span className="text-label-bold uppercase text-navy-60">Pixel Pal</span>
              <span className="text-label text-navy-40">now</span>
            </span>
            <span className="block text-body-sm-bold text-navy">Your chat with {name ?? 'a peer'}</span>
            <span className="block text-body-sm text-navy-80">
              It&rsquo;s been a little while — pick it up whenever you&rsquo;re ready.
            </span>
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  )

  return overlayNode ? createPortal(banner, overlayNode) : banner
}
