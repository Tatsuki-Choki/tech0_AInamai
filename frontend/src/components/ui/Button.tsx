import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'surface' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, ...props }, ref) => {
    
    const baseStyles = "inline-flex items-center justify-center rounded-full font-zen-maru font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:pointer-events-none disabled:opacity-50";
    
    const variants = {
      primary: "bg-brand-primary text-white hover:bg-brand-primary/90 shadow-sm",
      secondary: "bg-brand-buttons text-white hover:bg-brand-buttons/90 shadow-sm",
      surface: "bg-white text-brand-primary hover:bg-gray-50 shadow-button-surface",
      ghost: "hover:bg-brand-primary/10 text-brand-primary",
      outline: "border border-brand-primary text-brand-primary hover:bg-brand-primary/10",
    };

    const sizes = {
      sm: "h-8 px-3 text-sm",
      md: "h-12 px-6 text-base",
      lg: "h-14 px-8 text-lg",
      icon: "h-10 w-10",
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";

