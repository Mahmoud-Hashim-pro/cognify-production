import React, { useState } from 'react';

interface Props {
  children: React.ReactNode;
  isAr: boolean;
  className?: string;
}

/** Shows a long notice as one line with a Read more button. The full text is the same text, one tap away. */
export default function ClampedNotice({ children, isAr, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`flex items-start gap-2 min-w-0 ${className}`}>
      <div className={`flex-1 min-w-0 text-xs leading-relaxed ${open ? '' : 'truncate'}`}>{children}</div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="shrink-0 min-h-[32px] px-1 text-xs font-bold underline underline-offset-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] rounded"
      >
        {open ? (isAr ? 'أقل' : 'Less') : isAr ? 'المزيد' : 'Read more'}
      </button>
    </div>
  );
}
