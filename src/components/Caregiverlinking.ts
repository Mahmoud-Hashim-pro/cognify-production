/**
 * Consent-based Caregiver/Parent Linking.
 *
 * A parent can NEVER read a student's data just by knowing their UID — the
 * Firestore security rules (isVerifiedParent in firestore.rules) only grant
 * access once the STUDENT's own profile carries linkedParentUid /
 * authorizedParentUids / parentEmail, and only the student can write their
 * own profile. This module is the request/approval flow that lets a parent
 * ask, and a student explicitly grant, that access — never automatic.
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  deleteField,
} from 'firebase/firestore';
import { db, cleanDataForFirestore } from './firebase';

export interface CaregiverLinkRequest {
  parentUid: string;
  parentName: string;
  parentEmail: string;
  childUid: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: number;
}

function requestId(childUid: string, parentUid: string): string {
  return `${childUid}_${parentUid}`;
}

/** Parent side: send a link request. Does NOT grant any access by itself. */
export async function sendCaregiverLinkRequest(
  parentUid: string,
  parentName: string,
  parentEmail: string,
  childUid: string
): Promise<void> {
  if (!parentUid || !childUid || parentUid === childUid) {
    throw new Error('Invalid link request.');
  }
  const id = requestId(childUid, parentUid);
  await setDoc(
    doc(db, 'caregiverLinkRequests', id),
    cleanDataForFirestore({
      parentUid,
      parentName: parentName || 'A caregiver',
      parentEmail: parentEmail || '',
      childUid,
      status: 'pending',
      timestamp: Date.now(),
      createdAt: serverTimestamp(),
    })
  );
}

/** Student side: live list of requests addressed to them, newest first. */
export function listenPendingCaregiverRequests(
  childUid: string,
  onChange: (requests: CaregiverLinkRequest[]) => void
): () => void {
  if (!childUid) return () => {};
  const q = collection(db, 'caregiverLinkRequests');
  // Filtered client-side after fetch would need a composite index for a
  // where() + orderBy(); keeping this simple, onSnapshot on the collection
  // is fine at this app's scale and avoids an index deploy step.
  return onSnapshot(q, (snap) => {
    const all = snap.docs
      .map((d) => d.data() as CaregiverLinkRequest)
      .filter((r) => r.childUid === childUid && r.status === 'pending')
      .sort((a, b) => b.timestamp - a.timestamp);
    onChange(all);
  });
}

/**
 * Student side: approve a request. This is the ONLY function that grants
 * real access. Previously this always overwrote linkedParentUid, which
 * meant approving a second caregiver silently kicked the first one out —
 * now the first approval still fills linkedParentUid (kept for back-compat
 * with any code that only reads that single field), and every approval
 * after that is added to authorizedParentUids instead, so a student can be
 * genuinely monitored by more than one parent/doctor/therapist at once.
 */
export async function approveCaregiverLinkRequest(
  childUid: string,
  parentUid: string,
  parentName?: string,
  parentEmail?: string
): Promise<void> {
  const id = requestId(childUid, parentUid);
  await updateDoc(doc(db, 'caregiverLinkRequests', id), { status: 'approved' });

  const childRef = doc(db, `users/${childUid}`);
  const childSnap = await getDoc(childRef);
  const existingPrimary = childSnap.exists() ? (childSnap.data().linkedParentUid as string | undefined) : undefined;

  const update: Record<string, unknown> = {
    [`linkedCaregiversInfo.${parentUid}`]: {
      name: parentName || 'Caregiver',
      email: parentEmail || '',
      linkedAt: Date.now(),
    },
  };
  if (!existingPrimary || existingPrimary === parentUid) {
    update.linkedParentUid = parentUid;
  } else {
    update.authorizedParentUids = arrayUnion(parentUid);
  }

  await setDoc(childRef, cleanDataForFirestore(update), { merge: true });
}

/** Student side: reject a request. Grants nothing, just closes it out. */
export async function rejectCaregiverLinkRequest(childUid: string, parentUid: string): Promise<void> {
  const id = requestId(childUid, parentUid);
  await updateDoc(doc(db, 'caregiverLinkRequests', id), { status: 'rejected' });
}

/**
 * Student side: revoke ONE previously-approved caregiver's access at any
 * time, without touching any other caregiver still linked to this account.
 * If the revoked uid was the primary linkedParentUid, the next uid still in
 * authorizedParentUids (if any) is promoted so access for everyone else is
 * preserved.
 */
export async function revokeParentAccess(childUid: string, parentUid: string): Promise<void> {
  const childRef = doc(db, `users/${childUid}`);
  const childSnap = await getDoc(childRef);
  if (!childSnap.exists()) return;
  const data = childSnap.data();
  const currentPrimary = data.linkedParentUid as string | undefined;
  const currentOthers: string[] = Array.isArray(data.authorizedParentUids) ? data.authorizedParentUids : [];

  const update: Record<string, unknown> = {
    [`linkedCaregiversInfo.${parentUid}`]: deleteField(),
  };

  if (currentPrimary === parentUid) {
    const [promoted, ...rest] = currentOthers;
    update.linkedParentUid = promoted || '';
    update.authorizedParentUids = rest;
  } else {
    update.authorizedParentUids = arrayRemove(parentUid);
  }

  await setDoc(childRef, cleanDataForFirestore(update), { merge: true });
}

/** Every caregiver currently linked to this profile, for display/management UI. */
export function getLinkedCaregivers(profile: {
  linkedParentUid?: string;
  authorizedParentUids?: string[];
  linkedCaregiversInfo?: Record<string, { name: string; email: string; linkedAt: number }>;
}): { uid: string; name: string; email: string; linkedAt: number; isPrimary: boolean }[] {
  const uids = [
    ...(profile.linkedParentUid ? [profile.linkedParentUid] : []),
    ...(profile.authorizedParentUids || []),
  ];
  return uids
    .filter((uid, i) => uids.indexOf(uid) === i) // de-dupe
    .map((uid) => ({
      uid,
      isPrimary: uid === profile.linkedParentUid,
      name: profile.linkedCaregiversInfo?.[uid]?.name || 'Caregiver',
      email: profile.linkedCaregiversInfo?.[uid]?.email || '',
      linkedAt: profile.linkedCaregiversInfo?.[uid]?.linkedAt || 0,
    }));
}
