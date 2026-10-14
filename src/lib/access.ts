import { UserProfile, AccountPath } from '../types';

// The views supported in the Cognify Assistive Platform.
export type AppView =
  | 'chat' | 'profile' | 'settings' | 'video' | 'disability'
  | 'admin' | 'support' | 'privacy_security'
  | 'learning' | 'goals' | 'gpa' | 'analytics' | 'planner' | 'memory'
  | 'gym' | 'iq' | 'institution' | 'france' | 'privacy' | 'intelligence'
  | 'teacher' | 'parent' | 'evaluation' | 'ai_quality'
  | 'resilience' | 'tenancy' | 'developer_api' | 'retention';

/** A user counts as an accessibility user if they picked the Special Needs path
 *  OR have a real accessibility mode enabled. */
export function isAccessibilityUser(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false;
  return profile.accountPath === 'Special Needs'
    || (!!profile.accessibilityMode && profile.accessibilityMode !== 'None');
}

/** The section label for a user (used by the admin directory). */
export function sectionOf(profile: Pick<UserProfile, 'accountPath'>): AccountPath {
  return profile.accountPath || 'Special Needs';
}

/**
 * Can this profile open the given view?
 * - Admins can open admin and all views.
 * - Assistive suites and accessible tools are universally open.
 */
export function canAccessView(
  profile: UserProfile | null | undefined,
  view: AppView,
  isAdmin: boolean,
): boolean {
  if (!profile) return false;
  if (view === 'admin') return isAdmin;
  return true;
}

/** Where to send a user who lands in the app or hits a redirected view — always the Assistive Suite. */
export function homeViewFor(_profile: UserProfile | null | undefined): AppView {
  return 'disability';
}
