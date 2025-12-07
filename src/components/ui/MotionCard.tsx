import { HTMLAttributes, forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface MotionCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children?: React.ReactNode;
  className?: string;
  hover?: boolean;
  tap?: boolean;
}

const MotionCard = forwardRef<HTMLDivElement, MotionCardProps>(
  ({ className, hover = true, tap = true, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={hover ? { scale: 1.02, y: -4 } : undefined}
        whileTap={tap ? { scale: 0.98 } : undefined}
        transition={{
          type: 'spring',
          stiffness: 260,
          damping: 20,
        }}
        className={cn(
          'rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-md shadow-sm',
          'hover:shadow-blue-glow transition-shadow duration-300',
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

MotionCard.displayName = 'MotionCard';

const MotionCardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
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

MotionCardHeader.displayName = 'MotionCardHeader';

const MotionCardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn(
          'text-lg font-heading font-bold leading-none tracking-tight',
          'bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent',
          className
        )}
        {...props}
      />
    );
  }
);

MotionCardTitle.displayName = 'MotionCardTitle';

const MotionCardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />;
  }
);

MotionCardContent.displayName = 'MotionCardContent';

export { MotionCard, MotionCardHeader, MotionCardTitle, MotionCardContent };


