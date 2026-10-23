import React from 'react';
import { cn } from '../../lib/utils';

export type BrandLogoVariant = 'icon' | 'horizontal' | 'stacked';
export type BrandLogoSize = 'sm' | 'md' | 'lg' | 'xl';

export interface BrandLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BrandLogoVariant;
  size?: BrandLogoSize;
  badgeText?: string;
  subtitle?: string;
  isAccessibleHeading?: boolean;
}

const markSizeMap: Record<BrandLogoSize, string> = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
  xl: 'w-14 h-14',
};

const textSizeMap: Record<BrandLogoSize, { title: string; badge: string; subtitle: string }> = {
  sm: { title: 'text-base font-bold', badge: 'text-[9px] px-1.5 py-0.2', subtitle: 'text-[10px]' },
  md: { title: 'text-lg font-black', badge: 'text-[10px] px-1.5 py-0.5', subtitle: 'text-xs' },
  lg: { title: 'text-xl font-black', badge: 'text-xs px-2 py-0.5', subtitle: 'text-xs' },
  xl: { title: 'text-3xl font-black', badge: 'text-xs px-2.5 py-1', subtitle: 'text-sm' },
};

/**
 * Cognify Constellation Logomark:
 * Represents 3 interconnected cognitive nodes: Intelligence, Accessibility, and Human Empowerment.
 * Dignified, modern, and completely avoids stereotypical disability symbols.
 */
export const ConstellationMark = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg
    className={cn('shrink-0 text-current', className)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {/* Interconnecting Pathways */}
    <path
      d="M7 7.5L12.5 16.5M8 7L16 6.5M16.5 7.5L13.5 16"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.5"
    />
    {/* Node 1: Vision / Perception */}
    <circle cx="6.5" cy="7" r="2.5" fill="currentColor" />
    {/* Node 2: Adaptive Understanding */}
    <circle cx="17" cy="6" r="2.5" fill="currentColor" opacity="0.9" />
    {/* Node 3: Independence / Agency */}
    <circle cx="13" cy="17.5" r="2.5" fill="currentColor" opacity="0.8" />
  </svg>
);

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  badgeText = 'A11y',
  subtitle,
  isAccessibleHeading = false,
  className,
  ...props
}) => {
  const textStyles = textSizeMap[size];

  if (variant === 'icon') {
    return (
      <div
        className={cn(
          'inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-[#243B73] to-[#087F8C] text-white p-1.5 shadow-sm select-none',
          className
        )}
        aria-label="Cognify"
        role="img"
        {...props}
      >
        <ConstellationMark className={markSizeMap[size]} />
      </div>
    );
  }

  const TitleTag = isAccessibleHeading ? 'h1' : 'span';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2.5 font-sans select-none',
        variant === 'stacked' && 'flex-col items-center text-center gap-2',
        className
      )}
      {...props}
    >
      {/* Logomark Container */}
      <div
        className={cn(
          'inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#243B73] to-[#087F8C] text-white p-2 shadow-sm shrink-0'
        )}
        aria-hidden="true"
      >
        <ConstellationMark className={markSizeMap[size]} />
      </div>

      {/* Wordmark and Tagline */}
      <div className={cn('leading-none text-start', variant === 'stacked' && 'text-center')}>
        <div className="flex items-center gap-2">
          <TitleTag
            className={cn(
              'tracking-tight text-stone-900 dark:text-white',
              textStyles.title
            )}
          >
            Cognify
          </TitleTag>

          {badgeText && (
            <span
              className={cn(
                'font-bold rounded-lg uppercase tracking-wider border select-none',
                'bg-[#087F8C]/10 text-[#087F8C] border-[#087F8C]/30 dark:bg-[#087F8C]/20 dark:text-[#5EEAD4] dark:border-[#087F8C]/40',
                textStyles.badge
              )}
            >
              {badgeText}
            </span>
          )}
        </div>

        {subtitle && (
          <p
            className={cn(
              'text-stone-500 dark:text-stone-400 font-medium mt-1 leading-snug',
              textStyles.subtitle
            )}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default BrandLogo;
