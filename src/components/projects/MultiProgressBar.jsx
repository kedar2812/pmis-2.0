import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export const MultiProgressBar = ({
  segments,
  total,
  height = 8,
  showPulse = false,
  onSegmentClick,
  className,
}) => {
  if (total === 0) {
    return (
      <div
        className={cn('w-full bg-gray-200 rounded-full overflow-hidden', className)}
        style={{ height }}
      >
        <div className="w-full h-full bg-gray-100" />
      </div>
    );
  }

  return (
    <div
      className={cn('w-full bg-gray-200 rounded-full overflow-hidden flex', className)}
      style={{ height }}
    >
      {segments.map((segment, index) => {
        const widthPercent = (segment.value / total) * 100;
        const hasValue = segment.value > 0;

        return (
          <motion.div
            key={segment.id}
            initial={{ width: 0 }}
            animate={{ width: `${widthPercent}%` }}
            transition={{
              duration: 0.5,
              delay: index * 0.1,
              ease: 'easeOut',
            }}
            className={cn(
              'h-full transition-all duration-200 relative',
              segment.color,
              hasValue && 'cursor-pointer hover:opacity-90'
            )}
            style={{
              animation: showPulse && segment.id === 'litigation' && widthPercent > 10 
                ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' 
                : undefined
            }}
            onClick={() => hasValue && onSegmentClick?.(segment.id)}
            whileHover={hasValue ? { scale: 1.02 } : {}}
            title={segment.tooltip || segment.label}
          />
        );
      })}
    </div>
  );
};
