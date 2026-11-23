import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  position?: 'start' | 'end' | 'bottom';
  size?: 'sm' | 'md' | 'lg' | 'full';
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnBackdropClick?: boolean;
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  description,
  position = 'start',
  size = 'md',
  children,
  footer,
  closeOnBackdropClick = true,
  className,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
      // Focus drawer or first focusable element
      setTimeout(() => {
        const focusable = drawerRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        focusable?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        previouslyFocusedElement.current?.focus();
      };
    }
  }, [isOpen, onClose]);

  const sizeClasses = {
    start: {
      sm: 'w-72 max-w-[85vw]',
      md: 'w-80 max-w-[85vw]',
      lg: 'w-96 max-w-[90vw]',
      full: 'w-screen',
    },
    end: {
      sm: 'w-72 max-w-[85vw]',
      md: 'w-80 max-w-[85vw]',
      lg: 'w-96 max-w-[90vw]',
      full: 'w-screen',
    },
    bottom: {
      sm: 'max-h-[40vh]',
      md: 'max-h-[60vh]',
      lg: 'max-h-[80vh]',
      full: 'max-h-screen',
    },
  };

  const isBottom = position === 'bottom';
  const isEnd = position === 'end';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeOnBackdropClick ? onClose : undefined}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <motion.div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'drawer-title' : undefined}
            aria-describedby={description ? 'drawer-desc' : undefined}
            initial={
              isBottom
                ? { y: '100%' }
                : isEnd
                ? { x: '100%' }
                : { x: '-100%' }
            }
            animate={isBottom ? { y: 0 } : { x: 0 }}
            exit={
              isBottom
                ? { y: '100%' }
                : isEnd
                ? { x: '100%' }
                : { x: '-100%' }
            }
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className={cn(
              'relative z-10 flex flex-col font-sans shadow-2xl',
              'bg-cognify-surface-light dark:bg-cognify-surface-dark border-cognify-border-light dark:border-cognify-border-dark',
              isBottom
                ? 'w-full mt-auto border-t rounded-t-3xl'
                : isEnd
                ? 'ms-auto h-full border-s'
                : 'me-auto h-full border-e',
              !isBottom && sizeClasses[isEnd ? 'end' : 'start'][size],
              className
            )}
          >
            {/* Header */}
            {(title || onClose) && (
              <div className="flex items-center justify-between p-5 border-b border-cognify-border-light dark:border-cognify-border-dark">
                <div className="space-y-0.5 text-start min-w-0">
                  {title && (
                    <h2
                      id="drawer-title"
                      className="text-base sm:text-lg font-bold text-cognify-text-primary dark:text-cognify-text-dark-primary truncate"
                    >
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p
                      id="drawer-desc"
                      className="text-xs text-cognify-text-secondary dark:text-cognify-text-dark-secondary"
                    >
                      {description}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 min-h-[44px] min-w-[44px] rounded-xl text-cognify-text-secondary dark:text-cognify-text-dark-secondary hover:text-cognify-text-primary dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-cognify-focus"
                  aria-label="Close drawer"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar text-start">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="p-4 border-t border-cognify-border-light dark:border-cognify-border-dark bg-slate-50/50 dark:bg-slate-900/40">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Drawer;
