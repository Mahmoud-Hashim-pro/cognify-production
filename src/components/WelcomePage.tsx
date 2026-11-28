import React, { useEffect } from 'react';
import { LogIn, UserPlus } from 'lucide-react';

export interface WelcomePageProps {
  onSignIn: () => void;
  onRegister: () => void;
}

/**
 * Rafiqi (رفيقى) — True Full-Screen Welcome Screen
 *
 * 1. Artwork behaves as the screen's full background (edge-to-edge, 100vw x 100dvh).
 * 2. No separate header, footer, or surrounding page sections.
 * 3. No margins, cards, borders, or surrounding empty space.
 * 4. Image aspect ratio is strictly preserved (never stretched or distorted).
 * 5. Sign In and Create Account actions are subtle overlays floating near the bottom.
 * 6. Responsive background positioning adapts on mobile/tablet to keep brand content visible.
 * 7. Zero page scrolling and zero scrollbars.
 * 8. Clear navigation: Welcome -> Sign In or Create Account.
 */
export const WelcomePage: React.FC<WelcomePageProps> = ({ onSignIn, onRegister }) => {
  // Keyboard navigation: Enter or Space triggers Sign In, Escape returns
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSignIn();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSignIn]);

  return (
    <div
      role="region"
      aria-label="رفيقى — Welcome Screen"
      className="fixed inset-0 w-screen h-screen h-[100dvh] overflow-hidden select-none bg-[#071B33] bg-no-repeat bg-cover bg-[position:75%_center] sm:bg-[position:62%_center] lg:bg-center"
      style={{
        backgroundImage: "url('/assets/welcome-hero-doorway.jpg')",
        minHeight: '-webkit-fill-available',
      }}
    >
      {/* ── SUBTLE FLOATING ACTIONS OVERLAY (Near the bottom, zero space subtracted from artwork) ── */}
      <div className="absolute bottom-6 sm:bottom-8 inset-x-0 z-20 flex flex-col items-center justify-end px-4 sm:px-6 pointer-events-none">
        <div className="w-full max-w-sm sm:max-w-md flex flex-col sm:flex-row items-center justify-center gap-3 pointer-events-auto">
          {/* Action 1: Sign In (تسجيل الدخول) */}
          <button
            type="button"
            onClick={onSignIn}
            className="w-full sm:flex-1 min-h-[48px] px-6 py-3.5 bg-gradient-to-r from-[#1769AA] to-[#00C2FF] hover:from-[#13568c] hover:to-[#00a8dc] active:scale-[0.98] text-white text-sm sm:text-base font-black rounded-2xl shadow-xl shadow-[#00C2FF]/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-sky-400"
            aria-label="تسجيل الدخول"
          >
            <LogIn className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>تسجيل الدخول</span>
          </button>

          {/* Action 2: Create Account (إنشاء حساب) */}
          <button
            type="button"
            onClick={onRegister}
            className="w-full sm:flex-1 min-h-[48px] px-6 py-3.5 bg-[#071B33]/80 hover:bg-[#0B2545]/90 border border-sky-400/40 backdrop-blur-md active:scale-[0.98] text-white text-sm sm:text-base font-bold rounded-2xl shadow-lg transition-all cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-sky-400 flex items-center justify-center gap-2"
            aria-label="إنشاء حساب"
          >
            <UserPlus className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>إنشاء حساب</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
