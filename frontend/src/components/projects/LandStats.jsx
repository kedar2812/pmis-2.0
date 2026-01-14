import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MultiProgressBar } from './MultiProgressBar';
import { cn } from '@/lib/utils';

export const LandStats = ({ project, className }) => {
  const navigate = useNavigate();
  const [hoveredSegment, setHoveredSegment] = useState(null);

  if (!project.land_data) {
    return null;
  }

  const { total_required_acres, acquired_acres, notification_issued_acres, litigation_acres } =
    project.land_data;

  // Calculate remaining acres
  const remaining_acres = Math.max(
    0,
    total_required_acres - acquired_acres - notification_issued_acres - litigation_acres
  );

  // Build segments (always show all three, even if value is 0)
  const segments = [
    {
      id: 'possession',
      value: acquired_acres,
      color: 'bg-emerald-500',
      label: 'Possession Taken',
      tooltip: `${acquired_acres.toLocaleString()} acres (${(acquired_acres * 0.404686).toFixed(2)} hectares)`,
    },
    {
      id: 'notification',
      value: notification_issued_acres,
      color: 'bg-amber-400',
      label: 'Under Notification (Section 11/19)',
      tooltip: `${notification_issued_acres.toLocaleString()} acres (${(notification_issued_acres * 0.404686).toFixed(2)} hectares)`,
    },
    {
      id: 'litigation',
      value: litigation_acres,
      color: 'bg-rose-500',
      label: 'In Litigation/Court Stay',
      tooltip: `${litigation_acres.toLocaleString()} acres (${(litigation_acres * 0.404686).toFixed(2)} hectares)`,
    },
  ];

  // Calculate percentages
  const possessionPercent = (acquired_acres / total_required_acres) * 100;
  const notificationPercent = (notification_issued_acres / total_required_acres) * 100;
  const litigationPercent = (litigation_acres / total_required_acres) * 100;
  const shouldPulseLitigation = litigationPercent > 10;

  const handleSegmentClick = (segmentId) => {
    navigate(`/gis?layer=land_parcels&status=${segmentId === 'possession' ? 'acquired' : segmentId === 'notification' ? 'pending' : 'litigation'}&project=${project.id}`);
  };

  const handleMapClick = () => {
    navigate(`/gis?layer=land_parcels&project=${project.id}`);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info size={16} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Land Acquisition Status</span>
        </div>
        <motion.button
          onClick={handleMapClick}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-primary-600"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          title="View on Map"
        >
          <Map size={16} />
        </motion.button>
      </div>

      {/* Multi-segment Progress Bar */}
      <div className="relative group">
        <MultiProgressBar
          segments={segments}
          total={total_required_acres}
          height={10}
          showPulse={shouldPulseLitigation}
          onSegmentClick={handleSegmentClick}
          className="shadow-sm"
        />
      </div>

      {/* Legend with Tooltips */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        {segments.map((segment) => {
          const percent = (segment.value / total_required_acres) * 100;
          const isLitigation = segment.id === 'litigation';
          const shouldPulse = isLitigation && percent > 10;

          return (
            <div
              key={segment.id}
              className={cn(
                'relative flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors',
                shouldPulse && 'animate-pulse'
              )}
              onMouseEnter={() => setHoveredSegment(segment.id)}
              onMouseLeave={() => setHoveredSegment(null)}
              onClick={() => handleSegmentClick(segment.id)}
            >
              <div className={cn('w-3 h-3 rounded flex-shrink-0', segment.color)} />
              <span className="text-gray-600 truncate text-xs">{segment.label.split(' ')[0]}</span>
              <span className="text-gray-900 font-semibold ml-auto text-xs">
                {percent.toFixed(1)}%
              </span>

              {/* Tooltip on hover */}
              {hoveredSegment === segment.id && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-20 whitespace-nowrap pointer-events-none"
                >
                  <div className="font-semibold mb-1">{segment.label}</div>
                  <div className="text-gray-300">{segment.tooltip}</div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-200">
        <span>
          Total: <span className="font-semibold text-gray-700">{total_required_acres.toLocaleString()} acres</span>
        </span>
        <span>
          Acquired: <span className="font-semibold text-emerald-600">{acquired_acres.toLocaleString()} acres</span>
        </span>
      </div>
    </div>
  );
};
