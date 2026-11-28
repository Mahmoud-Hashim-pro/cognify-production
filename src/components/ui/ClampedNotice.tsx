import React, { useState } from 'react';
import { L } from '../../lib/translations';

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
    <div className={`flex-1 min-w-0 flex gap-2 ${open ? 'flex-col items-start' : 'items-center'} ${className}`}>
      <div className={`min-w-0 ${open ? '' : 'flex-1 line-clamp-1'}`}>{children}</div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="shrink-0 min-h-[44px] px-1 text-xs font-bold underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B9FE1] rounded"
      >
        {open ? (isAr ? 'عرض أقل' : L('Show less')) : isAr ? 'اقرأ المزيد' : L('Read more')}
      </button>
    </div>
  );
};
