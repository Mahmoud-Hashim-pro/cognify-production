import React, { useEffect, useState } from 'react';

/**
 * Rafiqi (رفيقى) — Full-Screen Splash Screen (chosen concept "A")
 *
 * Ripple rings from a warm gold dot gently reveal the white "Rafiqi" wordmark
 * over the app's navy, with a soft gold glow behind the word. Pure CSS/SVG -
 * no artwork images, so it paints fast and matches the inline pre-app splash
 * in index.html for a seamless handoff.
 *
 * 1. Holds for ~1.5s (500ms on prefers-reduced-motion, rings/glow static).
 * 2. Zero external buttons, menus, header, footer, or text outside the mark.
 * 3. Fades out smoothly and unmounts, revealing the underlying page directly.
 * 4. Does not require user interaction.
 * 5. Mounted once at root in main.tsx, so it never re-appears when switching auth views.
 */
export default function SplashScreen() {
  const [phase, setPhase] = useState<'show' | 'fade' | 'gone'>('show');

  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    // Hold for ~1.5s, or 500ms if reduce motion is preferred
    const hold = reduce ? 500 : 1500;
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
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0F172A] select-none overflow-hidden pointer-events-none"
      style={{
        opacity: phase === 'fade' ? 0 : 1,
        transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Warm gold glow behind the word */}
      <div
        aria-hidden="true"
        className="rafiqi-splash-glow absolute rounded-full"
        style={{
          width: 360,
          height: 360,
          background:
            'radial-gradient(circle, rgba(229,169,60,0.38) 0%, rgba(229,169,60,0.14) 42%, rgba(229,169,60,0) 70%)',
        }}
      />
      {/* Ripple rings from the center dot */}
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden="true"
          className="rafiqi-splash-ring absolute rounded-full"
          style={{
            width: 170,
            height: 170,
            border: '2px solid rgba(75,159,225,0.55)',
            animationDelay: `${i * 0.45}s`,
          }}
        />
      ))}
      {/* Wordmark */}
      <span
        className="rafiqi-splash-word relative text-white font-black tracking-tight"
        style={{ fontSize: 'clamp(2.75rem, 9vw, 4rem)', lineHeight: 1 }}
      >
        Rafiqi
      </span>
      <style>{`
        .rafiqi-splash-glow { animation: rafiqi-glow-in 1.4s ease-out both; }
        .rafiqi-splash-ring { animation: rafiqi-ripple 1.8s cubic-bezier(0.2, 0.6, 0.35, 1) both; opacity: 0; }
        .rafiqi-splash-word { animation: rafiqi-word-in 0.85s ease-out 0.2s both; }
        @keyframes rafiqi-ripple {
          0% { transform: scale(0.5); opacity: 0; }
          18% { opacity: 0.55; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        @keyframes rafiqi-glow-in {
          0% { opacity: 0; transform: scale(0.75); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes rafiqi-word-in {
          0% { opacity: 0; transform: scale(0.94); }
          100% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .rafiqi-splash-glow, .rafiqi-splash-word { animation: none; }
          .rafiqi-splash-ring { animation: none; display: none; }
        }
      `}</style>
    </div>
  );
}
