import React, { useEffect, useRef, useId } from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  dismissLabel?: string;
  closeOnBackdropClick?: boolean;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  children,
  dismissLabel,
  closeOnBackdropClick = true,
}) => {
  const isRTLDoc = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  const effectiveDismissLabel = dismissLabel || (isRTLDoc ? 'إغلاق النافذة المنبثقة' : 'Close modal dialog');
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Remember trigger element when opened; restore focus when closed
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    } else if (previousActiveElementRef.current) {
      previousActiveElementRef.current.focus();
      previousActiveElementRef.current = null;
    }
  }, [isOpen]);

  // Focus trap & Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]):not([aria-hidden="true"]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([aria-hidden="true"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Initial focus on modal open
    const timeout = setTimeout(() => {
      if (dialogRef.current) {
        const focusable = dialogRef.current.querySelector<HTMLElement>(
          'button:not([disabled]):not([aria-hidden="true"]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]:not([aria-hidden="true"])'
        );
        focusable?.focus();
      }
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Accessible Backdrop */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => closeOnBackdropClick && onClose()}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity w-full h-full border-none cursor-default"
      />

      {/* Modal Dialog Card */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={cn(
          'relative w-full rounded-3xl bg-cognify-surface-light dark:bg-cognify-surface-dark border border-cognify-border-light dark:border-cognify-border-dark text-cognify-text-primary dark:text-cognify-text-dark-primary shadow-2xl z-10 overflow-hidden flex flex-col max-h-[90vh]',
          sizeClasses[size]
        )}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-cognify-border-light dark:border-cognify-border-dark flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <h2
              id={titleId}
              className="text-lg sm:text-xl font-bold tracking-tight text-cognify-text-primary dark:text-cognify-text-dark-primary"
            >
              {title}
            </h2>
            {description && (
              <p
                id={descId}
                className="text-xs sm:text-sm text-cognify-text-secondary dark:text-cognify-text-dark-secondary leading-relaxed"
              >
                {description}
              </p>
            )}
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={effectiveDismissLabel}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl text-cognify-text-secondary hover:text-cognify-text-primary dark:text-cognify-text-dark-secondary dark:hover:text-cognify-text-dark-primary hover:bg-cognify-bg-light dark:hover:bg-cognify-surface-elevated transition-colors cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-cognify-focus focus-visible:ring-offset-2 focus-visible:ring-offset-cognify-surface-light dark:focus-visible:ring-offset-cognify-bg-dark"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Dialog;
