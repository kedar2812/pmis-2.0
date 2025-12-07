import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FileIcon } from './FileIcon';
import type { Document } from '@/mock/interfaces';

interface FileGridProps {
  documents: Document[];
  selectedDocumentId?: string;
  viewMode: 'grid' | 'list';
  onSelect: (doc: Document) => void;
  onDoubleClick: (doc: Document) => void;
  onContextMenu: (e: React.MouseEvent, doc: Document) => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const StatusBadge = ({ status }: { status: Document['status'] }) => {
  const styles = {
    Draft: 'bg-slate-100 text-slate-700',
    Pending_Approval: 'bg-amber-100 text-amber-700',
    'Under Review': 'bg-blue-100 text-blue-700',
    Approved: 'bg-emerald-100 text-emerald-700',
    Rejected: 'bg-red-100 text-red-700',
  };

  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', styles[status] || styles.Draft)}>
      {status.replace('_', ' ')}
    </span>
  );
};

export const FileGrid = ({
  documents,
  selectedDocumentId,
  viewMode,
  onSelect,
  onDoubleClick,
  onContextMenu,
}: FileGridProps) => {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <div className="w-16 h-16 flex items-center justify-center mb-4">
          <FileIcon item={{ id: 'empty', name: 'empty', type: 'file' } as any} size={64} />
        </div>
        <p className="text-lg font-medium mt-4">This folder is empty</p>
        <p className="text-sm text-gray-400">Try selecting a different folder</p>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4">
        {documents.map((doc) => (
          <motion.div
            key={doc.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'flex flex-col items-center p-4 rounded-lg cursor-pointer transition-all',
              'hover:bg-blue-50 hover:shadow-md',
              selectedDocumentId === doc.id && 'bg-blue-50 border-2 border-blue-200'
            )}
            onClick={() => onSelect(doc)}
            onDoubleClick={() => onDoubleClick(doc)}
            onContextMenu={(e) => onContextMenu(e, doc)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-center w-24 h-24 mb-3 bg-gray-50 rounded-lg">
              <FileIcon item={doc} size={48} />
            </div>
            <p className="text-sm font-medium text-gray-900 text-center truncate w-full mb-1" title={doc.name}>
              {doc.name}
            </p>
            <p className="text-xs text-gray-500">{formatFileSize(doc.fileSize)}</p>
            <StatusBadge status={doc.status} />
          </motion.div>
        ))}
      </div>
    );
  }

  // List view
  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase">
        <div className="col-span-5">Name</div>
        <div className="col-span-2">Date Modified</div>
        <div className="col-span-2">Type</div>
        <div className="col-span-1">Size</div>
        <div className="col-span-2">Status</div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {documents.map((doc) => (
          <motion.div
            key={doc.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              'grid grid-cols-12 gap-4 px-4 py-3 cursor-pointer transition-colors',
              'hover:bg-blue-50',
              selectedDocumentId === doc.id && 'bg-blue-50 border-l-4 border-blue-500'
            )}
            onClick={() => onSelect(doc)}
            onDoubleClick={() => onDoubleClick(doc)}
            onContextMenu={(e) => onContextMenu(e, doc)}
          >
            <div className="col-span-5 flex items-center gap-3">
              <FileIcon item={doc} size={20} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                <p className="text-xs text-gray-500">{doc.category}</p>
              </div>
            </div>
            <div className="col-span-2 text-sm text-gray-600">
              {new Date(doc.uploadedDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
            <div className="col-span-2 text-sm text-gray-600">{doc.type}</div>
            <div className="col-span-1 text-sm text-gray-600">{formatFileSize(doc.fileSize)}</div>
            <div className="col-span-2">
              <StatusBadge status={doc.status} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

