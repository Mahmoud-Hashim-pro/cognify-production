/**
 * One-time admin bootstrap: custom claims + /config/admins document.
 *
 * firestore.rules no longer hardcodes personal emails. It reads founder and
 * permanent-admin emails from /config/admins, and treats the custom claim
 * `role` ('admin' | 'superadmin') as the primary admin signal.
 *
 * RUN THIS BEFORE DEPLOYING THE NEW firestore.rules, or founder/admin access
 * fails closed (the rules return empty lists when /config/admins is missing).
 *
 * Prerequisites:
 *   npm i -D firebase-admin   (or run with npx)
 *   Set ONE of:
 *     - GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
 *     - FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
 *
 * Usage:
 *   node scripts/set-admin-claims.mjs
 *   node scripts/set-admin-claims.mjs --dry-run
 *
 * The default identity lists below are the ones that used to be hardcoded in
 * firestore.rules. Override any of them with env vars (comma-separated):
 *   FOUNDER_EMAILS, PERMANENT_ADMIN_EMAILS, SECURITY_AUDITS_OWNER
 */

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const DRY_RUN = process.argv.includes('--dry-run');

const split = (v) => (v || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

const founderEmails = split(process.env.FOUNDER_EMAILS).length
  ? split(process.env.FOUNDER_EMAILS)
  : ['modyhashim2006@gmail.com', 'pro.mahmoud.h@gmail.com'];
const permanentAdminEmails = split(process.env.PERMANENT_ADMIN_EMAILS).length
  ? split(process.env.PERMANENT_ADMIN_EMAILS)
  : ['its.alkhateeb@gmail.com', 'esraahosni8@gmail.com'];
const securityAuditsOwner =
  (process.env.SECURITY_AUDITS_OWNER || '').trim().toLowerCase() || founderEmails[0];

if (!founderEmails.length) {
  console.error('Founder list is empty; refusing to continue (lockout risk).');
  process.exit(1);
}

let app;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  app = initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
} else {
  app = initializeApp({ credential: applicationDefault() });
}
const auth = getAuth(app);
const db = getFirestore(app);

async function setClaimsForEmail(email, claims) {
  try {
    const user = await auth.getUserByEmail(email);
    if (DRY_RUN) {
      console.log(`[dry-run] would set claims for ${email} (uid ${user.uid}):`, claims);
      return;
    }
    await auth.setCustomUserClaims(user.uid, { ...(user.customClaims || {}), ...claims });
    console.log(`claims set for ${email} (uid ${user.uid}):`, claims);
  } catch (err) {
    console.warn(`SKIP ${email}: ${err.message} (create the account first, then re-run)`);
  }
}

console.log('Founders:', founderEmails.join(', '));
console.log('Permanent admins:', permanentAdminEmails.join(', '));
console.log('Security-audits owner:', securityAuditsOwner);

for (const email of founderEmails) {
  await setClaimsForEmail(email, { role: 'superadmin', founder: true });
}
for (const email of permanentAdminEmails) {
  await setClaimsForEmail(email, { role: 'admin', permanent: true });
}
if (!founderEmails.includes(securityAuditsOwner) && !permanentAdminEmails.includes(securityAuditsOwner)) {
  await setClaimsForEmail(securityAuditsOwner, { securityAudits: true });
}

const configDoc = {
  founderEmails,
  permanentAdminEmails,
  securityAuditsOwner,
  updatedAt: DRY_RUN ? null : FieldValue.serverTimestamp(),
  updatedBy: 'scripts/set-admin-claims.mjs',
};

if (DRY_RUN) {
  console.log('[dry-run] would write /config/admins:', { ...configDoc, updatedAt: '<serverTimestamp>' });
} else {
  await db.doc('config/admins').set(configDoc, { merge: true });
  console.log('/config/admins written.');
}

console.log('\nNext steps:');
console.log('  1. Deploy the rules: firebase deploy --only firestore:rules');
console.log('  2. Have admins sign out and back in so their tokens pick up the new claims.');
console.log('  3. Verify admin dashboards work, then you can delete this script if you like.');
