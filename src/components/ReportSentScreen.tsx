import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { usePhoneOverlayNode } from './ui/PhoneFrame'
import { Button } from './ui/Button'

type ReportSentScreenProps = {
  isOpen: boolean
  /** Pixel Pal chats offer a new match; peer chats just close. */
  kind: 'pal' | 'peer'
  onFindNewPal?: () => void
  onClose: () => void
}

/**
 * Full-screen confirmation after "Send Report" (Figma "Report pixel pal",
 * right frame), shared by both chats. Says three things: the report was
 * sent, the team will follow up, and this chat is now gone from her
 * Messages — reporting removes it for good (see reportConversation). A
 * Pixel Pal report then offers a new match; a peer report just closes.
 */
export function ReportSentScreen({ isOpen, kind, onFindNewPal, onClose }: ReportSentScreenProps) {
  const overlayNode = usePhoneOverlayNode()

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="pointer-events-auto absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white px-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <h1 className="text-h3">Your report has been sent</h1>
          <p className="text-body-sm text-navy-60">
            Thank you for letting us know. You&rsquo;ll get a notification once our team has
            reviewed it.
          </p>
          <p className="text-body-sm text-navy-60">
            This chat has been removed from your messages and is no longer available.
          </p>
          {kind === 'pal' && (
            <p className="text-body-sm text-navy-60">Would you like to be matched with another Pixel Pal?</p>
          )}

          <div className="mt-4 flex w-full flex-col gap-3">
            {kind === 'pal' ? (
              <>
                <Button variant="soft" onClick={onFindNewPal}>
                  Yes please
                </Button>
                <Button variant="soft-outline" onClick={onClose}>
                  No thank you
                </Button>
              </>
            ) : (
              <Button variant="soft" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return overlayNode ? createPortal(content, overlayNode) : content
}
