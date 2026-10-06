import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { Card } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/TextField'
import { TextArea } from '../../components/ui/TextArea'
import { Sheet } from '../../components/ui/Sheet'
import { useDemoStore } from '../../store/useDemoStore'

function linesToList(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

// Same data-URL read pattern V2's `AttachSheet` uses for a picked image.
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

// Small camera badge for the avatar's edit affordance — inline SVG, ported
// as-is from V2.
function CameraIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  )
}

/**
 * Pal Auto Match · Edit Social Profile — ported from V2's
 * `SocialProfileEdit.tsx`. Reached from `SocialProfilePreview`'s "Edit
 * social profile"; edits the same `me` record the preview shows and Ask's
 * own profile-reveal modal reads (one Social Profile, never a second
 * identity — see lib/types.ts). No Pixel-Pal-only fields, no treatment,
 * location, or matching-preference data here.
 *
 * V2 edited `people[currentMemberId]` (its multi-member model); V4 is
 * single-persona, so this edits `me` directly via the new
 * `updateSocialProfile` store action. Fields and interaction pattern are
 * otherwise unchanged from V2.
 *
 * Draft is local `useState`, seeded from the store once on mount, and only
 * written back via `updateSocialProfile` on "Save Changes" — Back/Cancel
 * navigate away without ever calling it, so unsaved edits are discarded.
 *
 * The avatar is editable the same way: tapping it (or its camera badge)
 * opens a small `Sheet` — "Choose from photo library" / "Remove photo"
 * (only when a photo is currently set) / "Cancel" — a `Sheet` plus an
 * off-screen `<input type="file">`, read via `FileReader` into a data URL.
 * No camera capture, per prototype scope.
 */
export default function SocialProfileEdit() {
  const navigate = useNavigate()
  // Opened from somewhere other than Pal onboarding (e.g. an anonymous
  // chat's "Share your profile?" sheet)? Then Save/Cancel go back there,
  // carrying whatever state that screen asked to get back.
  const { state } = useLocation() as { state?: { returnTo?: string; returnState?: unknown } }
  const me = useDemoStore((s) => s.me)
  const updateSocialProfile = useDemoStore((s) => s.updateSocialProfile)

  const [displayName, setDisplayName] = useState(me.displayName)
  const [signature, setSignature] = useState(me.signature ?? '')
  const [aboutMe, setAboutMe] = useState(me.aboutMe ?? '')
  const [socialLinks, setSocialLinks] = useState((me.socialLinks ?? []).join('\n'))
  const [avatarUrl, setAvatarUrl] = useState(me.avatarUrl ?? '')
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const goToPreview = () =>
    state?.returnTo
      ? navigate(state.returnTo, { replace: true, state: state.returnState })
      : navigate('/pixel-pal-match/social-profile-preview')

  const handleSave = () => {
    updateSocialProfile({
      displayName: displayName.trim() || me.displayName,
      signature: signature.trim(),
      aboutMe: aboutMe.trim(),
      socialLinks: linesToList(socialLinks),
      avatarUrl,
    })
    goToPreview()
  }

  async function handlePhotoPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow picking the same file again next time
    if (!file) return
    setAvatarUrl(await readAsDataUrl(file))
    setAvatarSheetOpen(false)
  }

  function handleRemovePhoto() {
    setAvatarUrl('')
    setAvatarSheetOpen(false)
  }

  return (
    // No `relative` here on purpose — same reasoning as V2: this root can
    // grow taller than the device viewport, so it must not become the
    // positioned ancestor for `Sheet`'s `absolute inset-0` below. Falling
    // through to `PhoneFrame`'s own device-screen div keeps the sheet pinned
    // to the real bottom edge.
    <div className="flex min-h-full flex-col gap-6 p-5">
      <ScreenHeader title="Edit Social Profile" onBack={goToPreview} />

      <Card className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="relative">
          <button
            type="button"
            onClick={() => setAvatarSheetOpen(true)}
            aria-label="Change photo"
            className="block rounded-card"
          >
            <Avatar name={displayName || me.displayName} src={avatarUrl || undefined} size="xl" />
          </button>
          <button
            type="button"
            onClick={() => setAvatarSheetOpen(true)}
            aria-label="Change photo"
            className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-pill border-2 border-white bg-lavender-40 text-navy shadow-card"
          >
            <CameraIcon />
          </button>
        </div>
      </Card>

      <div className="flex flex-col gap-5">
        <TextField
          label={"Your Name or Alias".toUpperCase()}
          name="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <TextField
          label={"Your Signature".toUpperCase()}
          name="signature"
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          helperText="A short line shown near your name."
        />
        <TextArea
          label={"About Me".toUpperCase()}
          name="aboutMe"
          rows={3}
          value={aboutMe}
          onChange={(e) => setAboutMe(e.target.value)}
        />
        <TextArea
          label={"Social Links".toUpperCase()}
          name="socialLinks"
          rows={2}
          value={socialLinks}
          onChange={(e) => setSocialLinks(e.target.value)}
          helperText="One per line."
        />
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-6">
        <Button variant="primary" onClick={handleSave}>
          Save Changes
        </Button>
        <Button variant="ghost" onClick={goToPreview}>
          Cancel
        </Button>
      </div>

      <Sheet isOpen={avatarSheetOpen} onClose={() => setAvatarSheetOpen(false)} title="Profile photo">
        <div className="flex flex-col gap-2">
          <Button variant="secondary" onClick={() => photoInputRef.current?.click()}>
            Choose from photo library
          </Button>
          {avatarUrl && (
            <Button variant="secondary" onClick={handleRemovePhoto}>
              Remove photo
            </Button>
          )}
          <Button variant="ghost" onClick={() => setAvatarSheetOpen(false)}>
            Cancel
          </Button>
        </div>
      </Sheet>
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoPicked}
      />
    </div>
  )
}
