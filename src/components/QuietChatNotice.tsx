import type { Conversation } from '../lib/types'
import { isQuiet, quietFor } from '../lib/quietChat'

/**
 * Quiet-chat reminder (lib/quietChat) — an open door after two silent
 * weeks, never a nudge about neglect. Renders nothing unless the chat is
 * quiet, so it disappears the moment either side sends something. Shared by
 * the anonymous peer chat and the Pixel Pal chat so both read the same.
 */
export function QuietChatNotice({ convo, otherName }: { convo: Conversation; otherName?: string }) {
  if (!isQuiet(convo)) return null
  return (
    <p className="mt-2 rounded-field bg-yellow-40 px-3 py-2 text-center text-body-sm text-navy-80">
      You and {otherName ?? 'your peer'} haven&rsquo;t talked in {quietFor(convo)}. Pick it up whenever
      you&rsquo;re ready — even a quick hello is enough.
    </p>
  )
}
