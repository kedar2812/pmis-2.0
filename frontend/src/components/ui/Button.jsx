import { forwardRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const Button = forwardRef(
  ({ className, variant = 'default', size = 'md', children, ...props }, ref) => {
    const [hovered, setHovered] = useState(false);

    if (variant === 'default') {
      return (
        <motion.button
          ref={ref}
          className={cn(
            'relative inline-flex items-center justify-center rounded-xl font-medium',
            'overflow-hidden transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
            'disabled:pointer-events-none disabled:opacity-50',
            {
              'h-8 px-3 text-sm': size === 'sm',
              'h-10 px-4': size === 'md',
              'h-12 px-6 text-lg': size === 'lg',
            },
            className
          )}
          onHoverStart={() => setHovered(true)}
          onHoverEnd={() => setHovered(false)}
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.01 }}
          {...props}
        >
          {/* Liquid background gradient */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-primary-600 via-primary-700 to-primary-600"
            initial={false}
            animate={{
              backgroundPosition: hovered ? ['0% 50%', '100% 50%', '0% 50%'] : '0% 50%',
            }}
            transition={{
              duration: 1.5,
              repeat: hovered ? Infinity : 0,
              ease: 'linear',
            }}
            style={{
              backgroundSize: '200% 100%',
            }}
          />
          
          {/* Shine effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            initial={{ x: '-100%' }}
            animate={{ x: hovered ? '100%' : '-100%' }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          />
          
          <span className="relative z-10 text-white font-semibold flex items-center gap-2 whitespace-nowrap">{children}</span>
        </motion.button>
      );
    }

    return (
      <motion.button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          {
            'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50': variant === 'outline',
            'text-slate-700 hover:bg-slate-100': variant === 'ghost',
            'bg-red-600 text-white hover:bg-red-700': variant === 'destructive',
            'h-8 px-3 text-sm': size === 'sm',
            'h-10 px-4': size === 'md',
            'h-12 px-6 text-lg': size === 'lg',
          },
          className
        )}
        whileTap={{ scale: 0.97 }}
        whileHover={{ scale: 1.01, y: -1 }}
        {...props}
      >
        <span className="flex items-center gap-2 whitespace-nowrap">{children}</span>
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export default Button;







