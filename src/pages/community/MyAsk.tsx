import { useNavigate } from 'react-router-dom'
import { useDemoStore } from '../../store/useDemoStore'
import { ME_ID } from '../../lib/seed'
import { anonymousPalIdentities } from '../../lib/palLabel'
import { relativeTime } from '../../lib/relativeTime'
import { Avatar } from '../../components/ui/Avatar'
import { AnonymousAvatar } from '../../components/ui/AnonymousAvatar'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { TabBar } from '../../components/TabBar'
import bgGlow from '../../assets/shared/bg-glow.png'

function CloseIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

/**
 * `/groups/pixel-pal/my-ask` — her own post, and every message request
 * against it (none, one, or several), matched to the Figma "Your Post" frame
 * (node 16913:93855): standard sub-page header over the Community glow, the
 * full post in a white card with the close-post control beneath it, then the
 * requests. Accept ("Start Chat") opens the resulting private conversation
 * immediately; decline stays private and reasonless, same courtesy the other
 * Pixel Pal prototypes use for the same moment.
 */
export default function MyAsk() {
  const navigate = useNavigate()
  const asks = useDemoStore((s) => s.asks)
  const messageRequests = useDemoStore((s) => s.messageRequests)
  const conversations = useDemoStore((s) => s.conversations)
  const people = useDemoStore((s) => s.people)
  const me = useDemoStore((s) => s.me)
  const closeAsk = useDemoStore((s) => s.closeAsk)
  const acceptIncomingRequest = useDemoStore((s) => s.acceptIncomingRequest)
  const declineIncomingRequest = useDemoStore((s) => s.declineIncomingRequest)

  const myAsk = Object.values(asks)
    .filter((a) => a.authorId === ME_ID)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]

  const requests = myAsk
    ? Object.values(messageRequests)
        .filter((r) => r.askId === myAsk.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : []
  const pending = requests.filter((r) => r.status === 'pending')
  const accepted = requests.filter((r) => r.status === 'accepted')
  // Same nickname + avatar tone as Messages and the chat header, so an
  // ongoing chat here reads as the same person there (see lib/palLabel).
  const anonIdentities = anonymousPalIdentities(Object.values(conversations), me, people)

  return (
    <div className="relative flex min-h-full flex-col">
      {/* Same masked Community glow as CommunityShell, so this reads as a
          drill-down of Peer Support rather than a separate plain page. */}
      <img
        src={bgGlow}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 w-full [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_60%,transparent_100%)] [mask-image:linear-gradient(to_bottom,black_0%,black_60%,transparent_100%)]"
      />

      <div className="relative flex flex-col p-5">
        <ScreenHeader title="Your Post" onBack={() => navigate('/groups/pixel-pal')} />

        {!myAsk ? (
          <div className="mt-6">
            <EmptyState title="No active post" description="Start a conversation from the Peer Support feed to see it here." />
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-col gap-4 rounded-field bg-white p-3 shadow-card">
              <p className="text-body text-navy-80">{myAsk.text}</p>
              <div className="flex flex-col gap-4 border-t border-lavender-40 pt-4">
                {myAsk.status === 'open' ? (
                  <>
                    <p className="text-body-sm text-navy-60">
                      You can close post and stop receiving message requests.
                    </p>
                    <button
                      type="button"
                      onClick={() => closeAsk(myAsk.id)}
                      className="flex items-center gap-3 self-start text-body-bold text-navy"
                    >
                      Close post
                      <span className="flex h-6 w-6 items-center justify-center rounded-tag bg-lavender-40">
                        <CloseIcon />
                      </span>
                    </button>
                  </>
                ) : (
                  <p className="text-body-sm text-navy-60">
                    This post is closed and no longer receives message requests.
                  </p>
                )}
              </div>
            </div>

            <p className="mt-8 text-h5 uppercase text-navy-80">Message requests</p>

            <div className="mt-6 flex flex-col gap-6">
              {requests.length === 0 && (
                <EmptyState
                  title="No one has reached out yet"
                  description="Check back soon — you'll see requests here as they come in."
                />
              )}

              {pending.map((request) => (
                <div key={request.id} className="flex flex-col gap-4 rounded-card bg-lavender-20 p-3 shadow-card">
                  <div className="flex items-center gap-3">
                    <AnonymousAvatar seed={request.id.length} size="xs" />
                    <p className="flex-1 text-body-sm-bold text-navy">Someone reached out</p>
                    <p className="text-body-sm text-navy-40">{relativeTime(request.createdAt)}</p>
                  </div>
                  <p className="text-body-sm text-navy-80">{request.introMessage}</p>
                  <div className="flex gap-3">
                    <Button
                      variant="soft-outline"
                      fullWidth={false}
                      className="flex-1"
                      onClick={() => declineIncomingRequest(request.id)}
                    >
                      Decline
                    </Button>
                    <Button
                      variant="soft"
                      fullWidth={false}
                      className="flex-1"
                      onClick={() => {
                        const convoId = acceptIncomingRequest(request.id)
                        if (convoId) navigate(`/groups/pixel-pal/chat/${convoId}`)
                      }}
                    >
                      Start Chat
                    </Button>
                  </div>
                </div>
              ))}

              {accepted.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-label-bold uppercase text-navy-40">Ongoing</p>
                  {accepted.map((request) => {
                    const convo = Object.values(conversations).find(
                      (c) => c.askId === myAsk.id && c.participantIds.includes(request.responderId),
                    )
                    if (!convo) return null
                    const anon = anonIdentities[convo.id]
                    const otherId = convo.participantIds.find((id) => id !== ME_ID)
                    const bothShared =
                      !!otherId && !!convo.profileShared?.[ME_ID] && !!convo.profileShared?.[otherId]
                    const other = otherId ? people[otherId] : undefined
                    return (
                      <button
                        key={request.id}
                        type="button"
                        onClick={() => navigate(`/groups/pixel-pal/chat/${convo.id}`)}
                        className="flex items-center gap-3 rounded-card bg-white p-3 text-left shadow-card"
                      >
                        <Avatar
                          name={(bothShared ? other?.displayName : anon?.name) ?? 'Anonymous'}
                          src={bothShared ? other?.avatarUrl : undefined}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-body-sm-bold text-navy">
                            {bothShared ? other?.displayName : anon?.name}
                          </p>
                          <p className="truncate text-label text-navy-60">
                            {bothShared ? 'Peer chat' : 'Anonymous · Peer chat'}
                          </p>
                        </div>
                        <span className="text-navy-40">→</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <TabBar />
    </div>
  )
}
