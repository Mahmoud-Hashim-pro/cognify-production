import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { MediaConsentRecord, UserProfile } from '../types';

/**
 * One-time informed consent before the first camera / microphone use.
 *
 * The consent text explains, in plain Egyptian Arabic and English:
 * - camera frames go to Google's Gemini AI for description and are not stored by us,
 * - browser voice commands may be processed by Google (Chrome) or Apple (Safari),
 * - location is used only for emergency SOS alerts,
 * - what is stored (camera memories, chats) and how to delete it.
 *
 * Bump MEDIA_CONSENT_VERSION when the text materially changes: every user
 * (and guest) will be asked once again.
 */
export const MEDIA_CONSENT_VERSION = '2026-11-27';

const GUEST_CONSENT_KEY = 'rafiqi_media_consent';

function readGuestConsent(): MediaConsentRecord | null {
  try {
    const raw = window.localStorage.getItem(GUEST_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MediaConsentRecord;
    return typeof parsed?.granted === 'boolean' ? parsed : null;
  } catch {
    return null;
  }
}

function writeGuestConsent(record: MediaConsentRecord): void {
  try {
    window.localStorage.setItem(GUEST_CONSENT_KEY, JSON.stringify(record));
  } catch {
    // storage unavailable (private mode) - the profile write still counts
  }
}

/** True when the user (or guest) already granted the current consent version. */
export function hasMediaConsent(profile: UserProfile | null | undefined): boolean {
  const record = profile?.mediaConsent || readGuestConsent();
  return !!record && record.granted === true && record.version === MEDIA_CONSENT_VERSION;
}

/**
 * Records consent in the profile (signed-in users) and always mirrors it to
 * localStorage so guests and future guest sessions are covered too.
 * Local state updates optimistically; a failed sync rolls back via the caller.
 */
export async function recordMediaConsent(
  profile: UserProfile | null | undefined,
  setProfile?: (p: UserProfile) => void
): Promise<MediaConsentRecord> {
  const record: MediaConsentRecord = {
    granted: true,
    version: MEDIA_CONSENT_VERSION,
    consentedAt: new Date().toISOString(),
  };
  writeGuestConsent(record);
  if (profile?.uid) {
    if (setProfile) setProfile({ ...profile, mediaConsent: record });
    await setDoc(doc(db, `users/${profile.uid}`), { mediaConsent: record }, { merge: true });
  }
  return record;
}
