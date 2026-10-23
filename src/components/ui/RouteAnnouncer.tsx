/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Route Announcer Component (Phase 5: Navigation & Accessibility Engineering)
 * Synchronizes document.title and delivers polite aria-live announcements for screen
 * readers (including Android TalkBack, VoiceOver, and NVDA) upon route and tab transitions.
 */

import React, { useEffect, useState } from 'react';
import { RouteState, getRouteTitle, getRouteAnnouncement } from '../../lib/navigation';

export interface RouteAnnouncerProps {
  route: RouteState;
  language?: string;
}

export const RouteAnnouncer: React.FC<RouteAnnouncerProps> = ({ route, language }) => {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const pageTitle = getRouteTitle(route, language);
    const speechText = getRouteAnnouncement(route, language);

    // 1. Update browser tab title
    if (typeof document !== 'undefined') {
      document.title = `Cognify — ${pageTitle}`;
    }

    // 2. Deliver polite live announcement
    setAnnouncement(speechText);
  }, [route.view, route.tab, language]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only pointer-events-none"
    >
      {announcement}
    </div>
  );
};
