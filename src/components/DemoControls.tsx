import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useDemoStore } from '../store/useDemoStore'
import { ME_ID } from '../lib/seed'

/**
 * Demo controls — collapsible, hidden by default, obviously not product UI
 * (dashed coral border). This prototype is single-device, so anything that
 * needs "the other person" to act (a request arriving, a reply, a profile
 * share) is simulated here rather than requiring a second browser.
 */
export function DemoControls() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  const asks = useDemoStore((s) => s.asks)
  const messageRequests = useDemoStore((s) => s.messageRequests)
  const conversations = useDemoStore((s) => s.conversations)
  const myOutgoingRequestIds = useDemoStore((s) => s.myOutgoingRequestIds)
  const simulateIncomingRequest = useDemoStore((s) => s.simulateIncomingRequest)
  const simulateAskAuthorResponds = useDemoStore((s) => s.simulateAskAuthorResponds)
  const simulateReply = useDemoStore((s) => s.simulateReply)
  const simulateOtherSharesProfile = useDemoStore((s) => s.simulateOtherSharesProfile)
  const simulateQuietChat = useDemoStore((s) => s.simulateQuietChat)
  const matchOutcomeDemo = useDemoStore((s) => s.matchOutcomeDemo)
  const setMatchOutcomeDemo = useDemoStore((s) => s.setMatchOutcomeDemo)
  const homePromoDemo = useDemoStore((s) => s.homePromoDemo)
  const setHomePromoDemo = useDemoStore((s) => s.setHomePromoDemo)
  const resetDemo = useDemoStore((s) => s.resetDemo)

  const myAsk = Object.values(asks).find((a) => a.authorId === ME_ID)

  const myLastOutgoingPending = [...myOutgoingRequestIds]
    .reverse()
    .map((id) => messageRequests[id])
    .find((r) => r?.status === 'pending')

  const chatMatch = pathname.match(/\/chat\/([^/]+)/)
  const conversationList = Object.values(conversations)
  const activeConversation = chatMatch
    ? conversations[chatMatch[1]]
    : conversationList[conversationList.length - 1]

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col items-end gap-2">
      {open && (
        <div className="w-72 rounded-card border-2 border-dashed border-coral bg-white p-4 shadow-card">
          <p className="mb-3 text-label-bold text-coral">DEMO CONTROLS — NOT PRODUCT UI</p>

          <p className="mb-1 text-label-bold text-navy-60">ON YOUR ASK</p>
          <div className="mb-3 flex flex-col gap-1.5">
            <button
              type="button"
              disabled={!myAsk}
              onClick={() => myAsk && simulateIncomingRequest(myAsk.id)}
              className="rounded-field border border-navy-20 px-3 py-2 text-left text-body-sm disabled:opacity-40"
            >
              Someone reaches out to your ask
            </button>
          </div>

          <p className="mb-1 text-label-bold text-navy-60">ON A REQUEST YOU SENT</p>
          <div className="mb-3 flex flex-col gap-1.5">
            <button
              type="button"
              disabled={!myLastOutgoingPending}
              onClick={() => {
                if (!myLastOutgoingPending) return
                simulateAskAuthorResponds(myLastOutgoingPending.id, 'accepted')
              }}
              className="rounded-field border border-navy-20 px-3 py-2 text-left text-body-sm disabled:opacity-40"
            >
              They accept your request
            </button>
            <button
              type="button"
              disabled={!myLastOutgoingPending}
              onClick={() => {
                if (!myLastOutgoingPending) return
                simulateAskAuthorResponds(myLastOutgoingPending.id, 'declined')
              }}
              className="rounded-field border border-navy-20 px-3 py-2 text-left text-body-sm disabled:opacity-40"
            >
              They decline your request
            </button>
          </div>

          <p className="mb-1 text-label-bold text-navy-60">IN CHAT</p>
          <div className="mb-3 flex flex-col gap-1.5">
            <button
              type="button"
              disabled={!activeConversation}
              onClick={() => activeConversation && simulateReply(activeConversation.id)}
              className="rounded-field border border-navy-20 px-3 py-2 text-left text-body-sm disabled:opacity-40"
            >
              They reply
            </button>
            <button
              type="button"
              disabled={!activeConversation || activeConversation.origin !== 'ask'}
              onClick={() => activeConversation && simulateOtherSharesProfile(activeConversation.id)}
              className="rounded-field border border-navy-20 px-3 py-2 text-left text-body-sm disabled:opacity-40"
            >
              They share their profile too
            </button>
            <button
              type="button"
              disabled={
                !activeConversation ||
                (!!activeConversation.status && activeConversation.status !== 'active')
              }
              onClick={() => {
                if (!activeConversation) return
                simulateQuietChat(activeConversation.id)
                // Leave the chat so the push arrives the way a real one
                // would — from elsewhere in the app; tapping it comes back.
                navigate('/messages')
              }}
              className="rounded-field border border-navy-20 px-3 py-2 text-left text-body-sm disabled:opacity-40"
            >
              2 weeks of silence → reminder
            </button>
          </div>

          <p className="mb-1 text-label-bold text-navy-60">GO TO</p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => navigate('/groups/pixel-pal')}
              className="rounded-field border border-navy-20 px-3 py-1.5 text-label-bold text-navy"
            >
              Feed
            </button>
            <button
              type="button"
              disabled={!myAsk}
              onClick={() => navigate('/groups/pixel-pal/my-ask')}
              className="rounded-field border border-navy-20 px-3 py-1.5 text-label-bold text-navy disabled:opacity-40"
            >
              My ask
            </button>
            <button
              type="button"
              disabled={!activeConversation}
              onClick={() =>
                activeConversation &&
                navigate(
                  activeConversation.origin === 'pal_match'
                    ? `/pixel-pal-match/chat/${activeConversation.id}`
                    : `/groups/pixel-pal/chat/${activeConversation.id}`,
                )
              }
              className="rounded-field border border-navy-20 px-3 py-1.5 text-label-bold text-navy disabled:opacity-40"
            >
              Latest chat
            </button>
          </div>

          <p className="mb-1 text-label-bold text-navy-60">PAL AUTO MATCH — outcome</p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setMatchOutcomeDemo('match_found')}
              className={`rounded-field border px-3 py-1.5 text-label-bold ${
                matchOutcomeDemo === 'match_found'
                  ? 'border-navy bg-navy text-white'
                  : 'border-navy-20 text-navy'
              }`}
            >
              Match found
            </button>
            <button
              type="button"
              onClick={() => setMatchOutcomeDemo('no_match_yet')}
              className={`rounded-field border px-3 py-1.5 text-label-bold ${
                matchOutcomeDemo === 'no_match_yet'
                  ? 'border-navy bg-navy text-white'
                  : 'border-navy-20 text-navy'
              }`}
            >
              No match yet
            </button>
            <button
              type="button"
              onClick={() => navigate('/pixel-pal-match/how-it-works')}
              className="rounded-field border border-navy-20 px-3 py-1.5 text-label-bold text-navy"
            >
              Pal entry
            </button>
          </div>

          <p className="mb-1 text-label-bold text-navy-60">HOME — promo card</p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {(
              [
                ['pixel_pal', 'Pixel Pal'],
                ['peer_support', 'Peer Support'],
                ['none', 'None'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setHomePromoDemo(value)}
                className={`rounded-field border px-3 py-1.5 text-label-bold ${
                  homePromoDemo === value ? 'border-navy bg-navy text-white' : 'border-navy-20 text-navy'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              resetDemo()
              navigate('/')
            }}
            className="w-full rounded-field bg-coral px-3 py-2 text-body-sm-bold text-white"
          >
            ↺ Reset demo
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle demo controls"
        className="flex h-11 w-11 items-center justify-center rounded-pill border-2 border-dashed border-coral bg-white text-coral shadow-card"
      >
        {open ? '✕' : '⚙'}
      </button>
    </div>
  )
}
