import React, { useEffect, useState } from 'react';

/**
 * Rafiqi (رفيقى) — Temporary Full-Screen Splash Screen
 * 
 * 1. Displays the official Rafiqi artwork full screen for ~1 second (500ms on prefers-reduced-motion).
 * 2. Zero external buttons, menus, header, footer, or text outside the artwork image.
 * 3. Fades out smoothly and unmounts, revealing the underlying Sign-In page directly.
 * 4. Does not require user interaction.
 * 5. Mounted once at root in main.tsx, so it never re-appears when switching auth views.
 */
export default function SplashScreen() {
  const [phase, setPhase] = useState<'show' | 'fade' | 'gone'>('show');

  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    // Hold for ~1.2s (~1 second), or 500ms if reduce motion is preferred
    const hold = reduce ? 500 : 1200;
    const fadeDuration = reduce ? 250 : 400;

    const t1 = setTimeout(() => setPhase('fade'), hold);
    const t2 = setTimeout(() => setPhase('gone'), hold + fadeDuration);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === 'gone') return null;

  return (
    <div
      role="status"
      aria-label="Rafiqi · رفيقى"
      aria-live="polite"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#071B33] select-none overflow-hidden pointer-events-none"
      style={{
        opacity: phase === 'fade' ? 0 : 1,
        transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <img
        src="/assets/welcome-hero-doorway.jpg"
        alt="Rafiqi · رفيقى"
        width={1536}
        height={864}
        className="w-full h-full object-contain object-center select-none"
        loading="eager"
        decoding="sync"
      />
    </div>
  );
}
