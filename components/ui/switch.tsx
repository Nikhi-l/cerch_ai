"use client";

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, className, ...props }, ref) => {
    const controlled = typeof checked !== 'undefined';
    const [internal, setInternal] = React.useState<boolean>(Boolean(checked));

    React.useEffect(() => {
      if (controlled) setInternal(Boolean(checked));
    }, [checked, controlled]);

    const value = controlled ? Boolean(checked) : internal;

    const toggle = () => {
      const next = !value;
      if (!controlled) setInternal(next);
      onCheckedChange?.(next);
    };

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={value}
        onClick={toggle}
        className={cn(
          'inline-flex h-5 w-9 items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          value
            ? 'bg-primary border-primary dark:bg-primary dark:border-primary'
            : 'bg-muted border-border dark:bg-zinc-800 dark:border-zinc-700',
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 rounded-full bg-background dark:bg-white shadow transition-transform translate-x-0.5',
            value && 'translate-x-[18px]'
          )}
        />
      </button>
    );
  },
);
Switch.displayName = 'Switch';
