import React, { useState } from 'react';
import { AlertCircle, RefreshCw, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  details?: string | Error;
  onRetry?: () => void;
  onBack?: () => void;
  retryLabel?: string;
  backLabel?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this view. Please try again.',
  details,
  onRetry,
  onBack,
  retryLabel = 'Try Again',
  backLabel = 'Go Back',
  className,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const detailsText = details instanceof Error ? `${details.name}: ${details.message}\n${details.stack || ''}` : details;

  return (
    <div
      role="alert"
      className={cn(
        'p-8 max-w-lg mx-auto my-8 rounded-3xl text-center space-y-5 font-sans',
        'bg-rafiqi-surface-light dark:bg-rafiqi-surface-dark border border-rafiqi-error-text-light/20 dark:border-rafiqi-error-text-dark/30 shadow-lg',
        className
      )}
    >
      <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rafiqi-error flex items-center justify-center border border-rose-500/30">
        <AlertCircle className="w-7 h-7" aria-hidden="true" />
      </div>

      <div className="space-y-2">
        <h3 className="text-lg sm:text-xl font-bold text-rafiqi-text-primary dark:text-rafiqi-text-dark-primary">
          {title}
        </h3>
        <p className="text-sm text-rafiqi-text-secondary dark:text-rafiqi-text-dark-secondary leading-relaxed">
          {message}
        </p>
      </div>

      {detailsText && (
        <div className="text-start">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs font-semibold text-rafiqi-text-secondary dark:text-rafiqi-text-dark-secondary hover:text-rafiqi-primary dark:hover:text-rafiqi-primary-muted inline-flex items-center gap-1 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-rafiqi-focus"
          >
            <span>{showDetails ? 'Hide technical details' : 'Show technical details'}</span>
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showDetails && (
            <pre className="mt-2 p-3 rounded-xl text-xs font-mono bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-800 overflow-x-auto max-h-48 whitespace-pre-wrap break-all custom-scrollbar">
              {detailsText}
            </pre>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        {onRetry && (
          <Button variant="primary" onClick={onRetry} leftIcon={<RefreshCw className="w-4 h-4" />}>
            {retryLabel}
          </Button>
        )}
        {onBack && (
          <Button variant="secondary" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4 rtl:rotate-180" />}>
            {backLabel}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ErrorState;
