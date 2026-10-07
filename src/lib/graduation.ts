// Endings that the *other* person starts — her Pal moving on, or either
// kind of chat partner graduating — and the one thank-you she can send
// back after a graduation. See lib/types.ts `Graduation` / `endedBy`.

import { ME_ID } from './seed'
import type { Conversation } from './types'

/**
 * True when the other person graduated and she hasn't thanked them yet —
 * the chat is already archived, but the graduation push lets her send one
 * thank-you back. Never true for a chat she graduated herself: her note
 * went with the graduation.
 */
export function canSayThanks(convo: Conversation): boolean {
  const g = convo.graduation
  return convo.status === 'graduated' && !!g && g.by !== ME_ID && !g.reply?.text
}

/** Her Pal chose "Find someone else". */
export function endedByThem(convo: Conversation): boolean {
  return convo.status === 'ended' && !!convo.endedBy && convo.endedBy !== ME_ID
}
