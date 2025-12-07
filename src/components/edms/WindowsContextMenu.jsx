import React from 'react';
import { motion } from 'framer-motion';
import { Eye, Download, History, MessageSquare, Trash2, FileText, Copy, Edit } from 'lucide-react';

export const WindowsContextMenu = ({
  x,
  y,
  doc,
  onView,
  onDownload,
  onHistory,
  onDelete,
  canDelete,
  onClose,
}) => {
  // Calculate position to keep menu within viewport
  const menuWidth = 200;
  const menuHeight = canDelete ? 280 : 220;
  const padding = 8;

  let adjustedX = x;
  if (x + menuWidth + padding > window.innerWidth) {
    adjustedX = x - menuWidth;
  }
  if (adjustedX < padding) {
    adjustedX = padding;
  }

  let adjustedY = y;
  if (y + menuHeight + padding > window.innerHeight) {
    adjustedY = y - menuHeight;
  }
  if (adjustedY < padding) {
    adjustedY = padding;
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed z-50 bg-white rounded-sm shadow-lg border border-gray-300 py-1 min-w-[200px]"
        style={{ left: adjustedX, top: adjustedY }}
      >
        <button
          onClick={() => {
            onView();
            onClose();
          }}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-blue-50 transition-colors text-left"
        >
          <Eye size={16} className="text-gray-600" />
          <span>Open</span>
        </button>
        <button
          onClick={() => {
            onView();
            onClose();
          }}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-blue-50 transition-colors text-left"
        >
          <FileText size={16} className="text-gray-600" />
          <span>Preview</span>
        </button>
        <div className="border-t border-gray-200 my-1" />
        <button
          onClick={() => {
            onDownload();
            onClose();
          }}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-blue-50 transition-colors text-left"
        >
          <Download size={16} className="text-gray-600" />
          <span>Download</span>
        </button>
        <button
          onClick={() => {
            onClose();
          }}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-blue-50 transition-colors text-left"
        >
          <Copy size={16} className="text-gray-600" />
          <span>Copy</span>
        </button>
        <button
          onClick={() => {
            onClose();
          }}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-blue-50 transition-colors text-left"
        >
          <Edit size={16} className="text-gray-600" />
          <span>Rename</span>
        </button>
        <div className="border-t border-gray-200 my-1" />
        <button
          onClick={() => {
            onHistory();
            onClose();
          }}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-blue-50 transition-colors text-left"
        >
          <History size={16} className="text-gray-600" />
          <span>Version History</span>
        </button>
        <button
          onClick={() => {
            onView();
            onClose();
          }}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-blue-50 transition-colors text-left"
        >
          <MessageSquare size={16} className="text-gray-600" />
          <span>Add Note</span>
        </button>
        {canDelete && onDelete && (
          <>
            <div className="border-t border-gray-200 my-1" />
            <button
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
            >
              <Trash2 size={16} />
              <span>Delete</span>
            </button>
          </>
        )}
      </motion.div>
    </>
  );
};


