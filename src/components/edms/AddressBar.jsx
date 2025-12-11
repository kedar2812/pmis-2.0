import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { motion } from 'framer-motion';

export const AddressBar = ({ path, onNavigate }) => {
  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-white border-b border-gray-200">
      <motion.button
        onClick={() => onNavigate(0)}
        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Home size={16} />
        <span>This PC</span>
      </motion.button>
      
      {path.map((segment, index) => (
        <React.Fragment key={index}>
          <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
          <motion.button
            onClick={() => onNavigate(index + 1)}
            className="px-2 py-1 rounded hover:bg-gray-100 transition-colors text-sm text-gray-700 truncate max-w-[200px]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            title={segment}
          >
            {segment}
          </motion.button>
        </React.Fragment>
      ))}
    </div>
  );
};





