import React, { useState } from 'react';

/**
 * Shows a notice as one short line with a "Read more" toggle.
 * The full text stays in the page (only clamped visually), so screen readers read all of it.
 */
export const ClampedNotice: React.FC<{
  children: React.ReactNode;
  isAr: boolean;
  className?: string;
}> = ({ children, isAr, className = '' }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`flex-1 min-w-0 ${className}`}>
      <div className={open ? '' : 'line-clamp-1'}>{children}</div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="min-h-[44px] px-1 text-xs font-bold underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B9FE1] rounded"
      >
        {open ? (isAr ? 'عرض أقل' : 'Show less') : isAr ? 'اقرأ المزيد' : 'Read more'}
      </button>
    </div>
  );
};
