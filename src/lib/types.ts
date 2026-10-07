// Data model — Pixel Pal Concept B (anonymous ask → private message request →
// 1:1 chat → optional mutual profile reveal). See ../../docs/concept-b-spec.md
// for the product rationale. Deliberately has no Member/Pal role split and no
// matching algorithm — both are legacy concepts from the other prototypes
// (V1 suggestion-based matching, V2 automatic matching); see that doc's
// "Not this" section.

export type PersonId = string

/**
 * Coarse enough to compare "are these two people nearby" without pinpointing
 * anyone — see lib/location.ts, which is the only thing allowed to turn this
 * into copy. Never rendered directly; the other person's `city`/`state` are
 * not shown to anyone but themselves.
 */
export type Location = { city: string; state: string }

/**
 * A patient's existing Social Profile — reused as-is, never a second
 * identity created for Pixel Pal. `alias` may be a first name or a made-up
 * handle (the patient's own choice, same as the real app); `avatarUrl` is
 * optional so `Avatar` falls back to initials rather than a stock photo.
 */
export type Person = {
  id: PersonId
  displayName: string
  alias: string
  avatarUrl?: string
  location?: Location

  // --- Social Profile extras — only used by the Pal Auto Match Social
  // Profile preview screen (ported from V2), which shows these fields
  // conditionally when present. Ask never reads these. `socialLinks` render
  // as a platform icon there, never as the raw URL.
  signature?: string
  aboutMe?: string
  socialLinks?: string[]
}

export type AskStatus = 'open' | 'closed'

/**
 * Where the author is in their own treatment journey — shown only as a
 * feed filter (EXPERIENCE chips), never asked of the patient at post time.
 * That's deliberate: spec's "not built" list rules out preference/matching
 * questions on the ask composer itself, so this only exists on seeded
 * asks — a patient's own new post never gets one.
 */
export type AskExperience = 'not_started' | 'first_time' | 'been_through_it'

export type Ask = {
  id: string
  authorId: PersonId
  text: string
  createdAt: string
  status: AskStatus
  /** Deterministic index into the anonymous-avatar palette (see AnonymousAvatar) — never derived from the author's real identity. */
  anonSeed: number
  experience?: AskExperience
}

export type RequestStatus = 'pending' | 'accepted' | 'declined'

export type MessageRequest = {
  id: string
  askId: string
  responderId: PersonId
  introMessage: string
  status: RequestStatus
  createdAt: string
}

export type ChatMessage = {
  id: string
  senderId: PersonId
  text: string
  createdAt: string
  /** A quiet, centered system line (e.g. "You shared your profile") rather than a bubble. */
  system?: boolean
}

/**
 * `active` — ordinary, still-open chat. `graduated` — she (or they) ended it
 * the positive way, once it had run its course; kept as a read-only record
 * rather than deleted. `blocked` — she stopped the connection for safety
 * reasons; also read-only from then on, but a distinct reason from
 * graduating. Conversation-level, not person-level, so blocking someone
 * doesn't retroactively rewrite a different, unrelated chat with them.
 *
 * `ended` — Pal Auto Match only: the connection stopped being active for a
 * reason that is neither "ran its course positively" (`graduated`) nor a
 * safety block (`blocked`) — see `endedReason`. Deliberately its own value
 * rather than reusing `graduated`: "this specific match wasn't the right
 * fit, so I want to look for someone else" and "this relationship ran its
 * course and I'm closing it with gratitude" are different user intents that
 * must not collapse into the same lifecycle state, even though both leave a
 * conversation no longer active. Ask's `acceptIncomingRequest`/
 * `simulateAskAuthorResponds`/`graduateConversation`/`blockPerson` never
 * produce this value.
 *
 * `reported` — either origin: a safety/moderation exit distinct from
 * both `blocked` (Ask's own safety exit, which stays visible as a read-only
 * record) and `ended`/`graduated` (both ordinary relationship endings that
 * stay visible). A reported conversation must disappear from the reporting
 * user's Messages entirely and never be reachable again — see
 * `reportConversation` in the store.
 */
export type ConversationStatus = 'active' | 'graduated' | 'blocked' | 'ended' | 'reported'

/**
 * Only meaningful when `status === 'ended'` — why, distinct from the
 * `graduated`/`blocked` reasons those statuses already carry in their own
 * name. `rematched`: she chose "Find someone else" on this Pal Auto Match
 * connection — a mismatch/rematch outcome, not a positive close-out.
 */
export type ConversationEndedReason = 'rematched'

/**
 * How this conversation came to exist — the two independent discovery paths
 * (V4 direction doc). Shared entity, origin-specific fields and origin-
 * specific chat behavior: an ask-origin conversation carries the ask it grew
 * out of and a mutual, independent profile-reveal state; a pal_match-origin
 * conversation has neither, because Pal Auto Match has no ask/reply context
 * and no hidden-identity phase — both social profiles are visible from the
 * moment the conversation exists (see Person, once Pal Auto Match ports its
 * own screens). Do not read `askId`/`askSnippet`/`profileShared` without
 * checking `origin` first.
 */
export type ConversationOrigin = 'ask' | 'pal_match'

export type Conversation = {
  id: string
  origin: ConversationOrigin
  participantIds: [PersonId, PersonId]
  messages: ChatMessage[]
  status: ConversationStatus
  createdAt: string

  /** Ask-origin only. The ask this conversation grew out of. */
  askId?: string
  /** Ask-origin only. Frozen copy of the ask text at the moment the request
   * was accepted — the ask may later be edited or closed without rewriting
   * the reason two people are talking. */
  askSnippet?: string
  /** Ask-origin only. Per-participant opt-in — sharing is mutual and never
   * automatic (see spec). Absent for pal_match conversations, which are
   * never identity-hidden in the first place — that's a different state
   * than "both participants share a boolean that happens to be true". */
  profileShared?: Record<PersonId, boolean>

  /** Only set when `status === 'ended'` — see `ConversationEndedReason`. */
  endedReason?: ConversationEndedReason
  /** Only set when `status === 'ended'` — who chose to move on. Her own
   * "Find someone else" vs. her Pal's; decides the copy she sees (the Pal's
   * reason is never shown — see lib/graduation). Absent on older demos,
   * which only ever ended from her side. */
  endedBy?: PersonId

  /** Only set when `status === 'graduated'` — see `Graduation`. */
  graduation?: Graduation

  /** Only set when `status === 'reported'` — the free-text reason she gave
   * when reporting this Pal. Kept as the minimum internal record needed to
   * represent the report; never surfaced in any UI (the conversation itself
   * is no longer reachable once this is set). */
  reportReason?: string
}

/**
 * How a chat graduated — it's archived right away. Whoever graduated may
 * leave an optional thank-you; the other side can send one back from the
 * graduation push (see lib/graduation), and both show in the archived chat.
 */
export type Graduation = {
  by: PersonId
  at: string
  thankYou?: string
  /** The other side's thank-you, sent back from the graduation push. */
  reply?: { text?: string; at: string }
}
