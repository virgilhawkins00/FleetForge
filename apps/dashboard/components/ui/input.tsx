'use client';

import { cn } from '@/lib/utils';
import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400',
            'focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500',
            'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
            error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-500',
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-danger-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };

