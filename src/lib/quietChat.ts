// "Quiet" peer chats — ported from the auto-match prototype's
// QuietThreadNotice. After two weeks with no messages, an active chat gets a
// gentle push and a yellow in-chat notice inviting either side to pick it up
// again. Dormancy is not failure: the copy is an open door, never a tally of
// how long someone's been left waiting.

import type { Conversation } from './types'

export const QUIET_AFTER_DAYS = 14

const DAY_MS = 86_400_000

/** Last message, or creation time for an accepted-but-silent chat. */
export function lastActivityAt(convo: Conversation): string {
  const lastMessage = convo.messages[convo.messages.length - 1]
  return lastMessage ? lastMessage.createdAt : convo.createdAt
}

/** Legacy chats with no `status` count as active, same as everywhere else. */
export function isQuiet(convo: Conversation, now = Date.now()): boolean {
  if (convo.status && convo.status !== 'active') return false
  return now - new Date(lastActivityAt(convo)).getTime() >= QUIET_AFTER_DAYS * DAY_MS
}

/**
 * Deliberately vague — an exact day count reads as a counter of how long
 * you've left someone waiting, which is the one thing the notice must not do.
 */
export function quietFor(convo: Conversation, now = Date.now()): string {
  const days = Math.floor((now - new Date(lastActivityAt(convo)).getTime()) / DAY_MS)
  if (days >= 60) return 'a couple of months'
  if (days >= 30) return 'over a month'
  return 'a couple of weeks'
}
