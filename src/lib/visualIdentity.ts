/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Cognify Visual Identity Guidelines & Rules (Phase 3)
 *
 * Core Product Philosophy:
 * Cognify is designed around independence, dignity, intelligence, and agency,
 * strictly rejecting stereotypical disability imagery, medicalized symbols, or infantilizing metaphors.
 */

export const VISUAL_IDENTITY_RULES = {
  // 1. Logo Usage & Brand Placement
  branding: {
    logomark: 'Constellation Mark (3 interconnected cognitive nodes)',
    symbolism: 'Nodes represent Perception (Vision), Adaptive Processing (AI Tutor), and Human Agency (Independence).',
    placement: 'Placed in the primary header / navbar (start position) and main navigation drawers.',
    clearSpace: 'Minimum 12px clear margin around the constellation mark.',
    allowedVariants: ['icon', 'horizontal', 'stacked'],
  },

  // 2. Icon Style & Meaning
  iconography: {
    library: 'lucide-react (consistent 1.5px to 2px stroke width, rounded terminals)',
    ruleNeverIconAlone: 'Icons MUST NEVER be the sole communicator of an interactive control. Every icon button must have a visible label or an aria-label attribute.',
    sizing: {
      inline: 'w-4 h-4 (16px)',
      standard: 'w-5 h-5 (20px)',
      featured: 'w-6 h-6 to w-7 h-7 (24px to 28px)',
    },
    tones: ['indigo', 'teal', 'amber', 'emerald', 'purple', 'rose', 'neutral'],
  },

  // 3. Dignified Visuals & No Stereotyping
  illustrations: {
    prohibitedThemes: [
      'Wheelchairs or hospital symbols for general accessibility',
      'Eye-patches, blindfolds, or cartoonish eye glasses',
      'Infantilizing pastel cartoons or pity-inducing graphics',
    ],
    approvedVisualThemes: [
      'Constellations and cognitive network graphs',
      'Clean geometric cards and structured typography',
      'Subtle atmospheric ambient light glows (blur-2xl with max 10% opacity)',
      'Clear, dignified product screenshots and document layouts',
    ],
  },

  // 4. Card & Surface Treatments
  surfaces: {
    borders: '1px solid border-stone-200/80 (Light) and border-stone-800/80 (Dark)',
    backgrounds: {
      lightCanvas: '#F5F7FB',
      lightCard: '#FFFFFF',
      darkCanvas: '#111622',
      darkCard: '#171E2E',
    },
    shadows: 'Restrained subtle shadows (shadow-sm, max 3px blur). Heavy drop-shadows are strictly avoided.',
  },

  // 5. Hierarchy, Border Radii & Touch Targets
  hierarchy: {
    primaryActions: 'Deep Indigo (#243B73) or Collegiate Teal (#087F8C) fill, rounded-2xl, min 48px touch height.',
    secondaryActions: '1px border outline, rounded-2xl, subtle hover fill.',
    tertiaryActions: 'Ghost / text action with visible focus ring on keyboard tab.',
    radii: {
      badge: 'rounded-md or rounded-lg (6px to 8px)',
      input: 'rounded-xl (12px)',
      button: 'rounded-2xl (16px)',
      card: 'rounded-2xl (16px)',
      modal: 'rounded-3xl (24px)',
    },
  },

  // 6. Accessible Status Communication
  statusRule: {
    ruleNeverColorAlone: 'Status and critical conditions MUST NEVER be indicated by color alone.',
    requirement: 'Every status indicator must pair color with both an explicit semantic icon and text label.',
  },

  // 7. Empty States & Feedback
  emptyStates: {
    tone: 'Reassuring, structured, and action-oriented.',
    components: 'Clear title, calm explanation, and an immediate primary action button to get started.',
  },
} as const;
