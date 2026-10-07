import { useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { usePhoneOverlayNode } from './ui/PhoneFrame'
import { ChevronLeft } from './ui/ScreenHeader'
import { Button } from './ui/Button'
import { TextField } from './ui/TextField'

// Same list and order as the Figma "Report pixel pal" frame.
const reportReasons = [
  'Inappropriate or offensive language',
  'Personal attack or harassment',
  'Misinformation or unverified claims about treatment or health conditions',
  'Self-promotion',
  'Off-topic or irrelevant information',
  'Other',
]

type ReportReasonScreenProps = {
  isOpen: boolean
  /** Screen title — "Report Pixel Pal" or "Report Peer". */
  title: string
  onBack: () => void
  /** All selected reasons, joined (with the "Other" text in place of "Other"). */
  onSubmit: (reason: string) => void
}

/**
 * Full-screen report-reason picker, shared by Ask's Chat.tsx and Pal Auto
 * Match's PixelPalChat.tsx — matches the Figma "Report pixel pal" frame:
 * multi-select reasons (checkboxes), "Other" revealing a free-text field,
 * and a note that sending the report removes the chat. A
 * full page (portaled into PhoneFrame's overlay layer, same trick as
 * `Modal`) rather than a centered `Modal`, since the reference renders it
 * as its own screen with a back chevron, not a dialog card.
 */
export function ReportReasonScreen({ isOpen, title, onBack, onSubmit }: ReportReasonScreenProps) {
  const overlayNode = usePhoneOverlayNode()
  const [selected, setSelected] = useState<string[]>([])
  const [otherText, setOtherText] = useState('')

  const otherChosen = selected.includes('Other')
  const reason = selected.map((r) => (r === 'Other' ? `Other: ${otherText.trim()}` : r)).join('; ')
  const canSubmit = selected.length > 0 && (!otherChosen || otherText.trim().length > 0)

  function toggle(r: string) {
    setSelected((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]))
  }

  function reset() {
    setSelected([])
    setOtherText('')
  }

  function handleBack() {
    reset()
    onBack()
  }

  function handleSubmit() {
    if (!canSubmit) return
    onSubmit(reason)
    reset()
  }

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="pointer-events-auto absolute inset-0 z-50 flex flex-col bg-white p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            onClick={handleBack}
            aria-label="Back"
            className="flex h-11 w-11 shrink-0 items-center justify-center"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-icon bg-lavender-40">
              <ChevronLeft />
            </span>
          </button>

          <h1 className="mt-4 text-h3">{title}</h1>
          <p className="mt-3 text-body-bold text-navy">Please select the reason(s).</p>

          <div className="mt-5 flex flex-1 flex-col gap-4 overflow-y-auto" role="group" aria-label="Report reasons">
            {reportReasons.map((r) => (
              <div key={r}>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    value={r}
                    checked={selected.includes(r)}
                    onChange={() => toggle(r)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-navy"
                  />
                  <span className="text-body-sm text-navy">{r}</span>
                </label>
                {r === 'Other' && otherChosen && (
                  <div className="mt-2 pl-8">
                    <TextField
                      autoFocus
                      value={otherText}
                      onChange={(e) => setOtherText(e.target.value)}
                      placeholder="Tell us more"
                      aria-label="Other reason"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <Button variant="soft" disabled={!canSubmit} onClick={handleSubmit}>
              Send Report
            </Button>
            <Button variant="soft-outline" onClick={handleBack}>
              Cancel
            </Button>
            <p className="text-center text-label text-navy-80">
              Note: once you send a report, this chat and its history will no longer be available.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return overlayNode ? createPortal(content, overlayNode) : content
}
