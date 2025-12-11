import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown, Star, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileIcon } from './FileIcon';

const TreeNode = ({ node, level, selectedPath, onSelect, parentPath = [] }) => {
  const [isExpanded, setIsExpanded] = useState(level < 1);
  const hasChildren = node.children && node.children.length > 0;
  // Build full path from root to this node
  const nodePath = [...parentPath, node.id];
  const isSelected = selectedPath.length > 0 && selectedPath[selectedPath.length - 1] === node.id;

  const handleArrowClick = (e) => {
    e.stopPropagation();
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleFolderClick = () => {
    onSelect(nodePath);
  };

  return (
    <div>
      <motion.div
        className={cn(
          'flex items-center gap-1.5 px-2 py-1.5 rounded text-sm cursor-pointer transition-colors',
          'hover:bg-blue-50',
          isSelected && 'bg-blue-50 border border-blue-200'
        )}
        style={{ paddingLeft: `${level * 20 + 4}px` }}
        onClick={handleFolderClick}
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.98 }}
      >
        <button
          onClick={handleArrowClick}
          className="flex-shrink-0 w-4 h-4 flex items-center justify-center hover:bg-blue-100 rounded"
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown size={14} className="text-gray-600" />
            ) : (
              <ChevronRight size={14} className="text-gray-600" />
            )
          ) : (
            <span className="w-4" />
          )}
        </button>
        <FileIcon item={node} size={18} isOpen={isExpanded} />
        <span className="truncate flex-1 text-left text-gray-700">{node.name}</span>
        {node.documentCount !== undefined && node.documentCount > 0 && (
          <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
            {node.documentCount}
          </span>
        )}
      </motion.div>

      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {node.children.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                level={level + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
                parentPath={nodePath}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const FolderTree = ({ nodes, selectedPath, onSelect, level = 0 }) => {
  return (
    <div className="flex flex-col h-full">
      {/* Quick Access Section */}
      <div className="px-3 py-2 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Quick Access</h3>
        <div className="space-y-1">
          <motion.button
            className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-gray-700 hover:bg-blue-50 w-full text-left"
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Star size={16} className="text-amber-500" />
            <span>Starred</span>
          </motion.button>
          <motion.button
            className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-gray-700 hover:bg-blue-50 w-full text-left"
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Clock size={16} className="text-blue-500" />
            <span>Recent Uploads</span>
          </motion.button>
        </div>
      </div>

      {/* Folder Tree */}
      <div className="flex-1 overflow-y-auto p-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
        {nodes.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            level={level}
            selectedPath={selectedPath}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
};





