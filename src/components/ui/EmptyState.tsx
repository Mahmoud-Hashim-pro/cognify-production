import React from 'react';
import { cn } from '../../lib/utils';
import { Button, ButtonProps } from './Button';
import { FolderOpen } from 'lucide-react';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    variant?: ButtonProps['variant'];
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * EmptyState:
 * Dignified, clean, and helpful empty state component.
 * Completely avoids disability cliches; communicates clarity and next steps.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  ...props
}) => {
  return (
    <div
      role="region"
      aria-label={title}
      className={cn(
        'w-full max-w-lg mx-auto p-8 sm:p-10 rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/60 dark:bg-[#171E2E]/60 backdrop-blur-sm text-center font-sans space-y-4 shadow-xs',
        className
      )}
      {...props}
    >
      {/* Decorative Icon Holder */}
      <div
        className="w-14 h-14 mx-auto rounded-2xl bg-stone-100 dark:bg-stone-800 text-[#087F8C] dark:text-[#5EEAD4] flex items-center justify-center border border-stone-200/80 dark:border-stone-700/80 shadow-xs"
        aria-hidden="true"
      >
        {icon || <FolderOpen className="w-7 h-7" />}
      </div>

      {/* Text Info */}
      <div className="space-y-1.5 max-w-sm mx-auto">
        <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white tracking-tight">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
          {description}
        </p>
      </div>

      {/* Action Buttons */}
      {(action || secondaryAction) && (
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          {action && (
            <Button
              variant={action.variant || 'teal'}
              size="md"
              onPress={action.onClick}
              leftIcon={action.icon}
            >
              {action.label}
            </Button>
          )}

          {secondaryAction && (
            <Button
              variant="outline"
              size="md"
              onPress={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
