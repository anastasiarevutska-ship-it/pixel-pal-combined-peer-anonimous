// Stable, temporary identification for anonymous Pixel Pal connections — see
// docs/concept-b-spec.md. Never a name, never derived from the other
// person's real identity: just a position in a fixed nickname pool, so the
// same connection reads as the same nickname everywhere (Messages, Your
// Post, chat header) until profiles are mutually shared.

import type { Conversation, Person, PersonId } from './types'

/**
 * Nicknames for anonymous chats — powerful women from mythology and history
 * (public domain, so no character trademarks). Order matters: a
 * connection's nickname is its creation-order slot in this list.
 */
export const ANON_NICKNAMES = [
  'Athena',
  'Artemis',
  'Freya',
  'Boudica',
  'Cleopatra',
  'Nefertiti',
  'Durga',
  'Valkyrie',
  'Hippolyta',
  'Hypatia',
] as const

export type AnonIdentity = {
  /** The nickname shown while the chat is still anonymous. */
  name: string
  /** Stable AnonymousAvatar seed, so the avatar tone follows the nickname. */
  seed: number
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/**
 * Maps conversationId → anonymous nickname, numbered by when each connection
 * was *created* (oldest first) rather than by however a screen currently
 * sorts its list — so a chat's nickname never shifts with display order.
 *
 * Patients may pick any alias for their Social Profile — including one of
 * these nicknames. So any nickname matching a real alias/display name she
 * can see (her own, or anyone she talks to) is skipped: an anonymous chat
 * must never read like a revealed profile, and a revealed "Athena"
 * must never be confused with an anonymous one. Screens also always pair the
 * nickname with the silhouette avatar + "Anonymous" line, never a real
 * avatar, for the same reason.
 *
 * Ask-origin only. A `pal_match` conversation is never anonymous (identity
 * is revealed from the start — see Conversation.origin in lib/types.ts), so
 * it never consumes a slot. Filtered here, not at each call site.
 */
export function anonymousPalIdentities(
  conversations: Conversation[],
  me: Person,
  people: Record<PersonId, Person>,
): Record<string, AnonIdentity> {
  const mine = [...conversations]
    .filter((c) => c.participantIds.includes(me.id))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  const taken = new Set<string>()
  for (const p of [me, ...mine.flatMap((c) => c.participantIds.map((id) => people[id]))]) {
    if (!p) continue
    taken.add(normalize(p.alias))
    taken.add(normalize(p.displayName))
  }
  const pool = ANON_NICKNAMES.map((name, seed) => ({ name, seed })).filter((n) => !taken.has(normalize(n.name)))

  const identities: Record<string, AnonIdentity> = {}
  mine
    .filter((c) => c.origin === 'ask')
    .forEach((c, i) => {
      const slot = pool[i % pool.length]
      // Past the end of the pool, add a round number rather than repeat a
      // nickname outright ("Artemis 2").
      const round = Math.floor(i / pool.length)
      identities[c.id] = { name: round ? `${slot.name} ${round + 1}` : slot.name, seed: slot.seed }
    })
  return identities
}
