import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  noPadding?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', noPadding = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-white rounded-card shadow-card border border-brand-text-card-unselected/50 ${!noPadding ? 'p-6' : ''} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

