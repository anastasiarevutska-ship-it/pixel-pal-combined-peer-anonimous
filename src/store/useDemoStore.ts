import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { lastActivityAt, QUIET_AFTER_DAYS } from '../lib/quietChat'
import { canSayThanks } from '../lib/graduation'
import { me, ME_ID, palMatchPeople, people, reserveResponders, seedAsks } from '../lib/seed'
import type { Ask, ChatMessage, Conversation, ConversationStatus, MessageRequest, Person } from '../lib/types'

let uid = 0
function nextId(prefix: string) {
  uid += 1
  return `${prefix}_${Date.now()}_${uid}`
}

/** Any status that means "nothing new gets sent here again" — graduated,
 * blocked, rematch-ended, or reported. Checked positively wherever a
 * conversation might have no `status` at all (see graduateConversation's own
 * comment) — legacy/undefined status must keep reading as active. */
function isConversationClosed(status: ConversationStatus): boolean {
  return status === 'graduated' || status === 'blocked' || status === 'ended' || status === 'reported'
}

// Demo thank-you notes for "They graduate + thank-you" — warm, specific
// enough to read as a real person, never medical.
const farewellLines = [
  "Thank you for every message these past weeks — you made the waiting so much lighter. Wishing you all the luck. 💜",
  "I'm so glad we found each other here. Talking to you helped more than I can say. Take care of yourself.",
]

const incomingIntroLines = [
  "I've been through something similar — happy to talk if it would help.",
  "This really resonated with me. I'd love to connect if you're open to it.",
  "Sending you support. I've been where you are and I'm glad to listen.",
  "I don't have it all figured out either, but I'd like to talk if that's okay.",
]

const replyLines = [
  'Thank you for reaching out — it means a lot.',
  "I really needed to hear that today.",
  "That's exactly how I felt too. It helps to know I'm not alone in this.",
  'Thanks for sharing that. How are you holding up today?',
]

/** Presentation-only demo toggle for the Pal Auto Match "Finding" screen —
 * ported from V2. There's no real matching algorithm behind it; this just
 * picks which of the two outcome screens `Finding` sends her to. */
export type MatchOutcomeDemo = 'match_found' | 'no_match_yet'

/** Presentation-only demo toggle for the Home promo card. A single value, not
 * two booleans, so Pixel Pal and Peer Support promos can never both show. */
export type HomePromoDemo = 'pixel_pal' | 'peer_support' | 'none'

type State = {
  me: Person
  people: Record<string, Person>
  asks: Record<string, Ask>
  messageRequests: Record<string, MessageRequest>
  conversations: Record<string, Conversation>
  /** Requests *I* sent to someone else's ask, most recent last — drives the demo's "simulate their response" controls. */
  myOutgoingRequestIds: string[]
  /** People whose asks/requests she's blocked — conversation-scoped action, but the person stays blocked feed-wide (see PixelPalFeedTab). */
  blockedPersonIds: string[]
  /** Pal Auto Match's demo outcome toggle — see `MatchOutcomeDemo`. */
  matchOutcomeDemo: MatchOutcomeDemo
  /** Which (at most one) promo card Home shows — see `HomePromoDemo`. */
  homePromoDemo: HomePromoDemo
  /** Accepted outgoing requests whose chat she has already opened — until
   * then they count as "new" (Peer Support's accepted card, nav dots). */
  acknowledgedRequestIds: string[]

  // Author side — my own ask
  postAsk: (text: string) => string
  closeAsk: (askId: string) => void
  simulateIncomingRequest: (askId: string) => void
  acceptIncomingRequest: (requestId: string) => string
  declineIncomingRequest: (requestId: string) => void

  // Responder side — reaching out to someone else's ask
  sendMessageRequest: (askId: string, introMessage: string) => string
  simulateAskAuthorResponds: (requestId: string, outcome: 'accepted' | 'declined') => string | undefined

  // Pal Auto Match — automatic matching, no ask/reply step.
  setMatchOutcomeDemo: (outcome: MatchOutcomeDemo) => void
  setHomePromoDemo: (promo: HomePromoDemo) => void
  acknowledgeAcceptedRequests: (requestIds: string[]) => void
  /** There is never more than one *active* pal_match conversation at a
   * time: this returns the existing one if she has one, and only creates a
   * new one if she doesn't (e.g. after "Find someone else" has ended the
   * last one). Makes Match Found's "Say hello" idempotent for the current
   * match — revisiting it and clicking again reopens the same conversation
   * rather than creating a duplicate. */
  openPalMatchConversation: () => string
  /** "Find someone else" on a pal_match conversation — a mismatch/rematch
   * outcome, distinct from `graduateConversation`'s "ran its course
   * positively" (see ConversationStatus/ConversationEndedReason in
   * lib/types.ts). Marks it `status: 'ended'`, `endedReason: 'rematched'`;
   * never deletes it or touches its messages beyond appending the same kind
   * of system line graduate/block already use. */
  endPalMatchForRematch: (conversationId: string) => void
  /** "Report a concern" — in a Pixel Pal or a peer chat. A safety/moderation
   * exit, fundamentally different from `endPalMatchForRematch` (a mismatch,
   * still a normal outcome) and from `graduateConversation` (a positive
   * close-out). Marks it `status: 'reported'` and records `reason`; also
   * adds the other participant to `blockedPersonIds` so they're excluded
   * from any future pal_match candidate the demo could offer (see
   * `openPalMatchConversation`). Either origin disappears from Messages. Never deletes the conversation — Messages
   * and the chat route are what actually make it disappear/unreachable, by
   * filtering on this status; the record itself stays as the minimum
   * internal trace needed to represent the report. */
  reportConversation: (conversationId: string, reason: string) => void
  /** Edits the one shared Social Profile (`me`) — same record Ask's own
   * profile-reveal modal reads, per the "one Social Profile, never a second
   * identity" rule both prototypes use. This only writes to it; it does not
   * call or interact with Ask's `shareMyProfile`/reveal mechanic at all. */
  updateSocialProfile: (patch: {
    displayName: string
    signature: string
    aboutMe: string
    socialLinks: string[]
    avatarUrl: string
  }) => void

  // Chat, shared by both directions
  sendMessage: (conversationId: string, text: string) => void
  simulateReply: (conversationId: string) => void
  shareMyProfile: (conversationId: string) => void
  /** Takes back a one-sided share — only while the other person hasn't
   * shared theirs yet. Once both have shared, the reveal is complete and
   * this is a no-op. */
  hideMyProfile: (conversationId: string) => void
  simulateOtherSharesProfile: (conversationId: string) => void

  // Conversation-level actions — see the chat header's overflow menu
  /** `thankYou` — her optional note to the other person, shown to them as
   * a farewell card (see lib/graduation). */
  graduateConversation: (conversationId: string, thankYou?: string) => void
  /** Her one thank-you back after the *other* person graduated — sent from
   * the graduation push; shows in the archived chat. */
  sendFarewell: (conversationId: string, text: string) => void
  blockPerson: (conversationId: string) => void

  // Demo-only: rewinds a chat's clock past QUIET_AFTER_DAYS (lib/quietChat)
  // and fires the reminder push, so the quiet-chat state can be shown
  // without waiting two real weeks.
  simulateQuietChat: (conversationId: string) => void
  // Demo-only: the other person ends things from their side.
  simulateOtherGraduates: (conversationId: string, withThankYou: boolean) => void
  simulatePalFindsSomeoneElse: (conversationId: string) => void
  /** Demo-only: replaces her conversations with a full Messages hub — one of
   * every active chat kind plus four past ones — so the inbox can be shown
   * without walking every flow first. */
  simulateFullInbox: () => void
  /** The one push banner currently on screen — transient, never persisted. */
  pushNotification: PushNotification | null
  dismissPush: () => void

  resetDemo: () => void
}

export type PushNotification = {
  conversationId: string
  kind: 'quiet' | 'graduated' | 'ended'
}

/** Requests *I* sent that the other person accepted and I haven't opened the
 * resulting chat for yet. Read-only derivation — no new request lifecycle. */
export function unseenAcceptedRequests(s: {
  messageRequests: Record<string, MessageRequest>
  acknowledgedRequestIds?: string[]
}): MessageRequest[] {
  const seen = new Set(s.acknowledgedRequestIds ?? [])
  return Object.values(s.messageRequests)
    .filter((r) => r.responderId === ME_ID && r.status === 'accepted' && !seen.has(r.id))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/** Who Pal Auto Match would offer right now: the partner of her active Pal if
 * she has one, otherwise the first roster person she hasn't been matched with
 * before (any earlier pal_match conversation — graduated, ended or reported)
 * and hasn't reported/blocked. `undefined` once the roster runs out. */
export function palMatchCandidate(s: {
  conversations: Record<string, Conversation>
  blockedPersonIds: string[]
}): Person | undefined {
  const palConvos = Object.values(s.conversations).filter(
    (c) => c.origin === 'pal_match' && c.participantIds.includes(ME_ID),
  )
  const active = palConvos.find((c) => c.status === 'active')
  if (active) {
    const partnerId = active.participantIds.find((id) => id !== ME_ID)
    return palMatchPeople.find((p) => p.id === partnerId)
  }
  const used = new Set(palConvos.flatMap((c) => c.participantIds))
  return palMatchPeople.find((p) => !used.has(p.id) && !s.blockedPersonIds.includes(p.id))
}

function buildInitialState() {
  const asks: Record<string, Ask> = {}
  seedAsks.forEach((a) => (asks[a.id] = a))
  return {
    me,
    people: { ...people, ...Object.fromEntries(palMatchPeople.map((p) => [p.id, p])) },
    asks,
    messageRequests: {} as Record<string, MessageRequest>,
    conversations: {} as Record<string, Conversation>,
    myOutgoingRequestIds: [] as string[],
    blockedPersonIds: [] as string[],
    matchOutcomeDemo: 'match_found' as MatchOutcomeDemo,
    homePromoDemo: 'pixel_pal' as HomePromoDemo,
    acknowledgedRequestIds: [] as string[],
  }
}

export const useDemoStore = create<State>()(
  persist(
    (set, get) => ({
      ...buildInitialState(),

      postAsk: (text: string) => {
        const id = nextId('ask')
        const ask: Ask = {
          id,
          authorId: ME_ID,
          text: text.trim(),
          createdAt: new Date().toISOString(),
          status: 'open',
          anonSeed: Object.keys(get().asks).length,
        }
        set((s) => ({ asks: { ...s.asks, [id]: ask } }))
        return id
      },

      closeAsk: (askId: string) => {
        set((s) => ({
          asks: { ...s.asks, [askId]: { ...s.asks[askId], status: 'closed' } },
        }))
      },

      simulateIncomingRequest: (askId: string) => {
        const s = get()
        const ask = s.asks[askId]
        if (!ask) return
        const taken = new Set(
          Object.values(s.messageRequests)
            .filter((r) => r.askId === askId)
            .map((r) => r.responderId),
        )
        const pool = [...Object.keys(people), ...reserveResponders].filter(
          (id) => id !== ask.authorId && !taken.has(id),
        )
        if (pool.length === 0) return
        const responderId = pool[Math.floor(Math.random() * pool.length)]
        const id = nextId('req')
        const request: MessageRequest = {
          id,
          askId,
          responderId,
          introMessage: incomingIntroLines[Object.values(s.messageRequests).length % incomingIntroLines.length],
          status: 'pending',
          createdAt: new Date().toISOString(),
        }
        set((st) => ({ messageRequests: { ...st.messageRequests, [id]: request } }))
      },

      acceptIncomingRequest: (requestId: string) => {
        const s = get()
        const request = s.messageRequests[requestId]
        const ask = request ? s.asks[request.askId] : undefined
        if (!request || !ask) return ''
        const convoId = nextId('convo')
        const conversation: Conversation = {
          id: convoId,
          origin: 'ask',
          askId: ask.id,
          askSnippet: ask.text,
          participantIds: [ask.authorId, request.responderId],
          messages: [
            {
              id: nextId('msg'),
              senderId: request.responderId,
              text: request.introMessage,
              createdAt: request.createdAt,
            },
          ],
          profileShared: { [ask.authorId]: false, [request.responderId]: false },
          status: 'active',
          createdAt: new Date().toISOString(),
        }
        set((st) => ({
          messageRequests: { ...st.messageRequests, [requestId]: { ...request, status: 'accepted' } },
          conversations: { ...st.conversations, [convoId]: conversation },
        }))
        return convoId
      },

      declineIncomingRequest: (requestId: string) => {
        set((s) => ({
          messageRequests: {
            ...s.messageRequests,
            [requestId]: { ...s.messageRequests[requestId], status: 'declined' },
          },
        }))
      },

      sendMessageRequest: (askId: string, introMessage: string) => {
        const id = nextId('req')
        const request: MessageRequest = {
          id,
          askId,
          responderId: ME_ID,
          introMessage: introMessage.trim(),
          status: 'pending',
          createdAt: new Date().toISOString(),
        }
        set((s) => ({
          messageRequests: { ...s.messageRequests, [id]: request },
          myOutgoingRequestIds: [...s.myOutgoingRequestIds, id],
        }))
        return id
      },

      simulateAskAuthorResponds: (requestId: string, outcome: 'accepted' | 'declined') => {
        const s = get()
        const request = s.messageRequests[requestId]
        const ask = request ? s.asks[request.askId] : undefined
        if (!request || !ask) return undefined
        if (outcome === 'declined') {
          set((st) => ({
            messageRequests: { ...st.messageRequests, [requestId]: { ...request, status: 'declined' } },
          }))
          return undefined
        }
        const convoId = nextId('convo')
        const conversation: Conversation = {
          id: convoId,
          origin: 'ask',
          askId: ask.id,
          askSnippet: ask.text,
          participantIds: [ask.authorId, request.responderId],
          messages: [
            {
              id: nextId('msg'),
              senderId: request.responderId,
              text: request.introMessage,
              createdAt: request.createdAt,
            },
          ],
          profileShared: { [ask.authorId]: false, [request.responderId]: false },
          status: 'active',
          createdAt: new Date().toISOString(),
        }
        set((st) => ({
          messageRequests: { ...st.messageRequests, [requestId]: { ...request, status: 'accepted' } },
          conversations: { ...st.conversations, [convoId]: conversation },
        }))
        return convoId
      },

      setMatchOutcomeDemo: (outcome: MatchOutcomeDemo) => set({ matchOutcomeDemo: outcome }),
      setHomePromoDemo: (promo: HomePromoDemo) => set({ homePromoDemo: promo }),
      acknowledgeAcceptedRequests: (requestIds: string[]) =>
        set((s) => ({
          acknowledgedRequestIds: [
            ...new Set([...(s.acknowledgedRequestIds ?? []), ...requestIds]),
          ],
        })),

      updateSocialProfile: (patch) => {
        set((s) => ({
          me: {
            ...s.me,
            displayName: patch.displayName,
            signature: patch.signature,
            aboutMe: patch.aboutMe,
            socialLinks: patch.socialLinks,
            avatarUrl: patch.avatarUrl || undefined,
          },
        }))
      },

      openPalMatchConversation: () => {
        const s = get()
        const existing = Object.values(s.conversations).find(
          (c) => c.origin === 'pal_match' && c.status === 'active' && c.participantIds.includes(ME_ID),
        )
        if (existing) return existing.id
        // Never the same person twice, and never anyone she reported (see
        // palMatchCandidate). No candidate left → no conversation, which
        // callers route to the existing "No match yet" screen.
        const candidate = palMatchCandidate(s)
        if (!candidate) return ''
        const id = nextId('convo')
        const conversation: Conversation = {
          id,
          origin: 'pal_match',
          participantIds: [ME_ID, candidate.id],
          messages: [],
          status: 'active',
          createdAt: new Date().toISOString(),
        }
        set((st) => ({
          // Also (re)register the person: `people` may come from an older
          // persisted demo that predates this roster entry.
          people: { ...st.people, [candidate.id]: candidate },
          conversations: { ...st.conversations, [id]: conversation },
        }))
        return id
      },

      endPalMatchForRematch: (conversationId: string) => {
        const s = get()
        const convo = s.conversations[conversationId]
        if (!convo || convo.status !== 'active') return
        const system: ChatMessage = {
          id: nextId('msg'),
          senderId: ME_ID,
          text: 'You found someone else. This conversation is kept here as a record.',
          createdAt: new Date().toISOString(),
          system: true,
        }
        set((st) => ({
          conversations: {
            ...st.conversations,
            [conversationId]: {
              ...convo,
              status: 'ended',
              endedReason: 'rematched',
              endedBy: ME_ID,
              messages: [...convo.messages, system],
            },
          },
        }))
      },

      reportConversation: (conversationId: string, reason: string) => {
        const s = get()
        const convo = s.conversations[conversationId]
        if (!convo || convo.status === 'reported') return
        const otherId = convo.participantIds.find((id) => id !== ME_ID)
        if (!otherId) return
        set((st) => ({
          blockedPersonIds: st.blockedPersonIds.includes(otherId)
            ? st.blockedPersonIds
            : [...st.blockedPersonIds, otherId],
          conversations: {
            ...st.conversations,
            [conversationId]: { ...convo, status: 'reported', reportReason: reason.trim() },
          },
        }))
      },

      sendMessage: (conversationId: string, text: string) => {
        const trimmed = text.trim()
        if (!trimmed) return
        const message: ChatMessage = { id: nextId('msg'), senderId: ME_ID, text: trimmed, createdAt: new Date().toISOString() }
        set((s) => {
          const convo = s.conversations[conversationId]
          if (!convo || isConversationClosed(convo.status)) return s
          return {
            conversations: {
              ...s.conversations,
              [conversationId]: { ...convo, messages: [...convo.messages, message] },
            },
          }
        })
      },

      simulateReply: (conversationId: string) => {
        const s = get()
        const convo = s.conversations[conversationId]
        if (!convo || isConversationClosed(convo.status)) return
        const otherId = convo.participantIds.find((id) => id !== ME_ID)
        if (!otherId) return
        const message: ChatMessage = {
          id: nextId('msg'),
          senderId: otherId,
          text: replyLines[convo.messages.length % replyLines.length],
          createdAt: new Date().toISOString(),
        }
        set((st) => ({
          conversations: {
            ...st.conversations,
            [conversationId]: { ...convo, messages: [...convo.messages, message] },
          },
        }))
      },

      shareMyProfile: (conversationId: string) => {
        const s = get()
        const convo = s.conversations[conversationId]
        if (!convo || convo.profileShared?.[ME_ID]) return
        const system: ChatMessage = {
          id: nextId('msg'),
          senderId: ME_ID,
          text: 'You shared your profile.',
          createdAt: new Date().toISOString(),
          system: true,
        }
        set((st) => ({
          conversations: {
            ...st.conversations,
            [conversationId]: {
              ...convo,
              profileShared: { ...convo.profileShared, [ME_ID]: true },
              messages: [...convo.messages, system],
            },
          },
        }))
      },

      hideMyProfile: (conversationId: string) => {
        const convo = get().conversations[conversationId]
        const otherId = convo?.participantIds.find((id) => id !== ME_ID)
        if (!convo || !otherId || !convo.profileShared?.[ME_ID] || convo.profileShared?.[otherId]) return
        const system: ChatMessage = {
          id: nextId('msg'),
          senderId: ME_ID,
          text: 'You hid your profile.',
          createdAt: new Date().toISOString(),
          system: true,
        }
        set((st) => ({
          conversations: {
            ...st.conversations,
            [conversationId]: {
              ...convo,
              profileShared: { ...convo.profileShared, [ME_ID]: false },
              messages: [...convo.messages, system],
            },
          },
        }))
      },

      simulateOtherSharesProfile: (conversationId: string) => {
        const s = get()
        const convo = s.conversations[conversationId]
        const otherId = convo?.participantIds.find((id) => id !== ME_ID)
        if (!convo || !otherId || convo.profileShared?.[otherId]) return
        const bothNowShared = convo.profileShared?.[ME_ID]
        const system: ChatMessage = {
          id: nextId('msg'),
          senderId: otherId,
          text: bothNowShared ? "You're both sharing profiles now." : 'They shared their profile too.',
          createdAt: new Date().toISOString(),
          system: true,
        }
        set((st) => ({
          conversations: {
            ...st.conversations,
            [conversationId]: {
              ...convo,
              profileShared: { ...convo.profileShared, [otherId]: true },
              messages: [...convo.messages, system],
            },
          },
        }))
      },

      graduateConversation: (conversationId: string, thankYou?: string) => {
        const s = get()
        const convo = s.conversations[conversationId]
        // Checked positively, not `!== 'active'` — a conversation created
        // before `status` existed (already in a demo's localStorage) has no
        // status at all, and that must still count as active, not silently
        // block graduating it. Shared by both Ask's Chat.tsx and Pal Auto
        // Match's PixelPalChat.tsx — `ended`/`reported` only ever apply to
        // the latter, `blocked` only to the former, but this guard covers
        // all of them so neither origin can graduate an already-closed
        // conversation.
        if (!convo || isConversationClosed(convo.status)) return
        const system: ChatMessage = {
          id: nextId('msg'),
          senderId: ME_ID,
          text: 'You graduated from this chat. It stays here as a read-only record.',
          createdAt: new Date().toISOString(),
          system: true,
        }
        set((st) => ({
          conversations: {
            ...st.conversations,
            [conversationId]: {
              ...convo,
              status: 'graduated',
              graduation: { by: ME_ID, at: system.createdAt, thankYou: thankYou?.trim() || undefined },
              messages: [...convo.messages, system],
            },
          },
        }))
      },

      blockPerson: (conversationId: string) => {
        const s = get()
        const convo = s.conversations[conversationId]
        if (!convo || convo.status === 'blocked') return
        const otherId = convo.participantIds.find((id) => id !== ME_ID)
        if (!otherId) return
        const system: ChatMessage = {
          id: nextId('msg'),
          senderId: ME_ID,
          text: "You blocked this person. You won't hear from them again here.",
          createdAt: new Date().toISOString(),
          system: true,
        }
        set((st) => ({
          blockedPersonIds: st.blockedPersonIds.includes(otherId)
            ? st.blockedPersonIds
            : [...st.blockedPersonIds, otherId],
          conversations: {
            ...st.conversations,
            [conversationId]: { ...convo, status: 'blocked', messages: [...convo.messages, system] },
          },
        }))
      },

      simulateQuietChat: (conversationId: string) => {
        const convo = get().conversations[conversationId]
        if (!convo || isConversationClosed(convo.status)) return
        // Shift the whole thread back, not just the last message, so
        // relative times and ordering stay believable. Lands the last
        // activity at exactly QUIET_AFTER_DAYS + 1 days ago, however many
        // times this is pressed.
        const latest = new Date(lastActivityAt(convo)).getTime()
        const shift = latest - (Date.now() - (QUIET_AFTER_DAYS + 1) * 86_400_000)
        const back = (iso: string) => new Date(new Date(iso).getTime() - shift).toISOString()
        set((st) => ({
          conversations: {
            ...st.conversations,
            [conversationId]: {
              ...convo,
              createdAt: back(convo.createdAt),
              messages: convo.messages.map((m) => ({ ...m, createdAt: back(m.createdAt) })),
            },
          },
          pushNotification: { conversationId, kind: 'quiet' },
        }))
      },

      sendFarewell: (conversationId: string, text: string) => {
        const convo = get().conversations[conversationId]
        if (!convo?.graduation || !canSayThanks(convo) || !text.trim()) return
        set((st) => ({
          conversations: {
            ...st.conversations,
            [conversationId]: {
              ...convo,
              graduation: {
                ...convo.graduation!,
                reply: { text: text.trim(), at: new Date().toISOString() },
              },
            },
          },
        }))
      },

      simulateOtherGraduates: (conversationId: string, withThankYou: boolean) => {
        const convo = get().conversations[conversationId]
        const otherId = convo?.participantIds.find((id) => id !== ME_ID)
        if (!convo || !otherId || isConversationClosed(convo.status)) return
        const system: ChatMessage = {
          id: nextId('msg'),
          senderId: otherId,
          text: 'They graduated from this chat.',
          createdAt: new Date().toISOString(),
          system: true,
        }
        set((st) => ({
          conversations: {
            ...st.conversations,
            [conversationId]: {
              ...convo,
              status: 'graduated',
              graduation: {
                by: otherId,
                at: system.createdAt,
                thankYou: withThankYou ? farewellLines[convo.messages.length % farewellLines.length] : undefined,
              },
              messages: [...convo.messages, system],
            },
          },
          pushNotification: { conversationId, kind: 'graduated' },
        }))
      },

      simulatePalFindsSomeoneElse: (conversationId: string) => {
        const convo = get().conversations[conversationId]
        const otherId = convo?.participantIds.find((id) => id !== ME_ID)
        if (!convo || !otherId || convo.origin !== 'pal_match' || convo.status !== 'active') return
        // Deliberately reasonless — the same courtesy her own "Find someone
        // else" extends to her Pal (see endPalMatchForRematch).
        const system: ChatMessage = {
          id: nextId('msg'),
          senderId: otherId,
          text: 'This chat has ended.',
          createdAt: new Date().toISOString(),
          system: true,
        }
        set((st) => ({
          conversations: {
            ...st.conversations,
            [conversationId]: {
              ...convo,
              status: 'ended',
              endedReason: 'rematched',
              endedBy: otherId,
              messages: [...convo.messages, system],
            },
          },
          pushNotification: { conversationId, kind: 'ended' },
        }))
      },

      simulateFullInbox: () => {
        const s = get()
        const ago = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()
        const msg = (senderId: string, text: string, h: number, system = false): ChatMessage => ({
          id: nextId('msg'),
          senderId,
          text,
          createdAt: ago(h),
          ...(system && { system: true }),
        })
        const pal = (
          otherId: string,
          createdH: number,
          messages: ChatMessage[],
          extra: Partial<Conversation> = {},
        ): Conversation => ({
          id: nextId('convo'),
          origin: 'pal_match',
          participantIds: [ME_ID, otherId],
          messages,
          status: 'active',
          createdAt: ago(createdH),
          ...extra,
        })
        const ask = (
          askId: string,
          createdH: number,
          messages: ChatMessage[],
          extra: Partial<Conversation> = {},
        ): Conversation => {
          const a = s.asks[askId]
          return {
            id: nextId('convo'),
            origin: 'ask',
            askId,
            askSnippet: a?.text ?? '',
            participantIds: [a?.authorId ?? askId, ME_ID],
            messages,
            profileShared: { [a?.authorId ?? askId]: false, [ME_ID]: false },
            status: 'active',
            createdAt: ago(createdH),
            ...extra,
          }
        }

        const list: Conversation[] = [
          // --- Active ---
          // Her one active Pixel Pal.
          pal('p_river', 72, [
            msg(ME_ID, 'Hi River! So glad we matched.', 70),
            msg('p_river', 'Hi Samantha! Me too — how are you feeling this week?', 69),
            msg(ME_ID, 'Honestly a bit anxious, appointment on Thursday.', 3),
            msg('p_river', "Thursday is soon! I'll be thinking of you. 💜", 1),
          ]),
          // Anonymous peer chat, just accepted → "New" badge.
          ask('ask_1', 0.5, [msg(ME_ID, incomingIntroLines[0], 0.5)]),
          // Anonymous, ongoing.
          ask('ask_2', 30, [
            msg(ME_ID, incomingIntroLines[1], 30),
            msg('p_nova', replyLines[2], 28),
            msg(ME_ID, 'The waiting is the worst part for me too.', 6),
          ]),
          // Both shared profiles → real name, "Peer chat".
          ask(
            'ask_3',
            120,
            [
              msg(ME_ID, incomingIntroLines[2], 120),
              msg('p_juniper', replyLines[0], 118),
              msg(ME_ID, 'You shared your profile.', 100, true),
              msg('p_juniper', "You're both sharing profiles now.", 99, true),
              msg('p_juniper', 'So nice to put a name to the messages!', 20),
            ],
            { profileShared: { p_juniper: true, [ME_ID]: true } },
          ),
          // Quiet for over two weeks.
          ask('ask_4', 24 * 20, [
            msg(ME_ID, incomingIntroLines[3], 24 * 20),
            msg('p_sage', replyLines[3], 24 * 15 + 2),
          ]),

          // --- Past ---
          pal(
            'p_ellis',
            24 * 60,
            [
              msg('p_ellis', 'Hey! Nice to meet you.', 24 * 60),
              msg(ME_ID, 'Thank you for everything, Ellis.', 24 * 30),
              msg(ME_ID, 'You graduated from this chat. It stays here as a read-only record.', 24 * 30, true),
            ],
            {
              status: 'graduated',
              graduation: { by: ME_ID, at: ago(24 * 30), thankYou: farewellLines[0] },
            },
          ),
          pal(
            'p_ash',
            24 * 45,
            [
              msg('p_ash', 'Hi there!', 24 * 45),
              msg(ME_ID, 'You found someone else. This conversation is kept here as a record.', 24 * 40, true),
            ],
            { status: 'ended', endedReason: 'rematched', endedBy: ME_ID },
          ),
          ask(
            'ask_5',
            24 * 50,
            [
              msg(ME_ID, incomingIntroLines[0], 24 * 50),
              msg('p_marlowe', replyLines[1], 24 * 49),
              msg('p_marlowe', 'They graduated from this chat.', 24 * 25, true),
            ],
            {
              status: 'graduated',
              graduation: { by: 'p_marlowe', at: ago(24 * 25), thankYou: farewellLines[1] },
            },
          ),
          ask(
            'ask_6',
            24 * 35,
            [
              msg(ME_ID, incomingIntroLines[1], 24 * 35),
              msg(ME_ID, "You blocked this person. You won't hear from them again here.", 24 * 33, true),
            ],
            { status: 'blocked' },
          ),
        ]

        set((st) => ({
          people: { ...st.people, ...Object.fromEntries(palMatchPeople.map((p) => [p.id, p])) },
          conversations: Object.fromEntries(list.map((c) => [c.id, c])),
          blockedPersonIds: st.blockedPersonIds.includes('p_iris')
            ? st.blockedPersonIds
            : [...st.blockedPersonIds, 'p_iris'],
          pushNotification: null,
        }))
      },

      pushNotification: null,
      dismissPush: () => set({ pushNotification: null }),

      resetDemo: () => set({ ...buildInitialState(), pushNotification: null }),
    }),
    {
      name: 'pixel-pal-concept-b-demo',
      // A push is a moment, not state — it must not reappear on reload.
      partialize: ({ pushNotification: _push, ...rest }) => rest,
    },
  ),
)
