import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const MotionCard = forwardRef(
  ({ className, hover = true, tap = true, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={hover ? { scale: 1.01, y: -2 } : undefined}
        whileTap={tap ? { scale: 0.99 } : undefined}
        transition={{
          duration: 0.2,
          ease: 'easeOut',
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

const MotionCardHeader = forwardRef(
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

const MotionCardTitle = forwardRef(
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

const MotionCardContent = forwardRef(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />;
  }
);

MotionCardContent.displayName = 'MotionCardContent';

export { MotionCard, MotionCardHeader, MotionCardTitle, MotionCardContent };







