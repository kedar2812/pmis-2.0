import { Plus, Upload, ArrowUpDown, Grid3X3, List, Info, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export const ExplorerRibbon = ({
  viewMode,
  onViewModeChange,
  onNew,
  onUpload,
  onSort,
  onDetails,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
      {/* Left Actions */}
      <div className="flex items-center gap-2">
        <motion.button
          onClick={onNew}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium text-gray-700"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus size={16} />
          <span>New</span>
        </motion.button>
        <motion.button
          onClick={onUpload}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium text-gray-700"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Upload size={16} />
          <span>Upload</span>
        </motion.button>
        {onSort && (
          <motion.button
            onClick={onSort}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium text-gray-700"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowUpDown size={16} />
            <span>Sort</span>
          </motion.button>
        )}
      </div>

      {/* Center - Search */}
      <div className="flex-1 max-w-md mx-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-white border border-gray-300 rounded overflow-hidden">
          <motion.button
            onClick={() => onViewModeChange('list')}
            className={cn(
              'p-2 transition-colors',
              viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
            )}
            whileTap={{ scale: 0.95 }}
          >
            <List size={16} />
          </motion.button>
          <motion.button
            onClick={() => onViewModeChange('grid')}
            className={cn(
              'p-2 transition-colors',
              viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
            )}
            whileTap={{ scale: 0.95 }}
          >
            <Grid3X3 size={16} />
          </motion.button>
        </div>
        {onDetails && (
          <motion.button
            onClick={onDetails}
            className="p-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-600"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Details"
          >
            <Info size={16} />
          </motion.button>
        )}
      </div>
    </div>
  );
};





