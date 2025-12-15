import React from 'react';

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4;
}

export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className = '', level = 2, children, ...props }, ref) => {
    const styles = {
      1: "text-2xl font-bold text-brand-primary font-zen-maru",
      2: "text-xl font-medium text-brand-primary font-zen-maru",
      3: "text-lg font-medium text-brand-primary font-zen-maru",
      4: "text-base font-medium text-brand-primary font-zen-maru",
    };

    if (level === 1) {
      return <h1 ref={ref} className={`${styles[level]} ${className}`} {...props}>{children}</h1>;
    } else if (level === 2) {
      return <h2 ref={ref} className={`${styles[level]} ${className}`} {...props}>{children}</h2>;
    } else if (level === 3) {
      return <h3 ref={ref} className={`${styles[level]} ${className}`} {...props}>{children}</h3>;
    } else {
      return <h4 ref={ref} className={`${styles[level]} ${className}`} {...props}>{children}</h4>;
    }
  }
);

Heading.displayName = "Heading";

export const Text = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={`text-brand-text-secondary font-zen-maru ${className}`}
        {...props}
      >
        {children}
      </p>
    );
  }
);

Text.displayName = "Text";

