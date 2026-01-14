import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Card = forwardRef(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md shadow-sm dark:shadow-lg', className)}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

const CardHeader = forwardRef(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col space-y-1.5 p-6', className)}
        {...props}
      />
    );
  }
);

CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef(
  ({ className, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn('text-lg font-semibold leading-none tracking-tight text-slate-900 dark:text-white', className)}
        {...props}
      />
    );
  }
);

CardTitle.displayName = 'CardTitle';

const CardContent = forwardRef(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />;
  }
);

CardContent.displayName = 'CardContent';

export { Card, CardHeader, CardTitle, CardContent };







