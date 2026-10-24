import React from 'react';
import { Button as ReactAriaButton, type ButtonProps as ReactAriaButtonProps } from 'react-aria-components/Button';
import { cn } from '../../lib/utils';

export interface AriaButtonProps extends ReactAriaButtonProps {
  className?: string | ((values: { isHovered: boolean; isPressed: boolean; isFocused: boolean; isDisabled: boolean }) => string);
}

/**
 * Shared accessible button built on Adobe React Aria's headless <Button>.
 * Guarantees high-contrast WCAG 2.2 focus ring (#F59E0B) and minimum touch ergonomics.
 */
export const AriaButton = React.forwardRef<HTMLButtonElement, AriaButtonProps>(
  ({ className, ...props }, ref) => {
    return (
      <ReactAriaButton
        ref={ref}
        {...props}
        className={(renderProps) =>
          cn(
            // Baseline high-contrast focus-visible ring
            'outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-cognify-focus data-[focus-visible]:ring-offset-2 data-[focus-visible]:ring-offset-cognify-bg-dark dark:data-[focus-visible]:ring-offset-cognify-bg-dark',
            'data-[pressed]:scale-[0.98] transition-transform motion-reduce:transition-none motion-reduce:data-[pressed]:scale-100',
            'data-[disabled]:opacity-60 data-[disabled]:cursor-not-allowed',
            typeof className === 'function'
              ? className(renderProps)
              : className
          )
        }
      />
    );
  }
);

AriaButton.displayName = 'AriaButton';

export default AriaButton;
