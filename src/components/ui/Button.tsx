import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, icon, iconRight, ...props }, ref) => {
    const baseStyles = 'ui-button relative inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary: 'bg-primary-800 text-white hover:bg-primary-900 hover:-translate-y-0.5 focus:ring-primary-500 shadow-sm hover:shadow-lg hover:shadow-primary-900/20',
      secondary: 'bg-gold-100 text-primary-800 hover:bg-gold-200 hover:-translate-y-0.5 focus:ring-gold-500',
      outline: 'border-2 border-primary-800 text-primary-800 hover:bg-primary-50 hover:-translate-y-0.5 focus:ring-primary-500',
      ghost: 'text-primary-800 hover:bg-primary-50 focus:ring-primary-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 hover:-translate-y-0.5 focus:ring-red-500 shadow-sm hover:shadow-lg hover:shadow-red-900/20',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-5 py-2.5 text-base gap-2',
      lg: 'px-8 py-3 text-lg gap-2.5',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <>
            {icon && <span className="flex-shrink-0">{icon}</span>}
            {children}
            {iconRight && <span className="flex-shrink-0">{iconRight}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
