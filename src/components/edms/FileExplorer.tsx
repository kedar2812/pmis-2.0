import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  FileImage,
  FileVideo,
  FileSpreadsheet,
  File,
  Search,
  Grid3X3,
  List,
  MoreVertical,
  Eye,
  Download,
  History,
  MessageSquare,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Document, FolderNode, DocumentPhase, DocumentDiscipline } from '@/mock/interfaces';
import { projects } from '@/mock';

interface FileExplorerProps {
  documents: Document[];
  onSelectDocument: (doc: Document) => void;
  onViewDocument: (doc: Document) => void;
  onDownloadDocument: (doc: Document) => void;
  onViewHistory: (doc: Document) => void;
  onDeleteDocument?: (doc: Document) => void;
  canDelete?: boolean;
  selectedDocumentId?: string;
}

// File type icon mapping
const getFileIcon = (doc: Document) => {
  const iconClass = 'flex-shrink-0';
  switch (doc.mimeType) {
    case 'application/pdf':
      return <FileText className={cn(iconClass, 'text-red-500')} size={20} />;
    case 'application/dwg':
      return <FileText className={cn(iconClass, 'text-blue-500')} size={20} />;
    case 'application/xlsx':
      return <FileSpreadsheet className={cn(iconClass, 'text-green-500')} size={20} />;
    case 'image/jpeg':
    case 'image/png':
      return <FileImage className={cn(iconClass, 'text-purple-500')} size={20} />;
    case 'video/mp4':
      return <FileVideo className={cn(iconClass, 'text-pink-500')} size={20} />;
    default:
      return <File className={cn(iconClass, 'text-gray-500')} size={20} />;
  }
};

// Status badge component
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

// Tree Node Component
const TreeNode = ({
  node,
  level = 0,
  selectedPath,
  onSelect,
}: {
  node: FolderNode;
  level?: number;
  selectedPath: string[];
  onSelect: (path: string[]) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedPath.join('/') === node.id;

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
    onSelect([node.id]);
  };

  return (
    <div>
      <motion.button
        onClick={handleClick}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors',
          'hover:bg-slate-100',
          isSelected && 'bg-primary-50 text-primary-700'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.98 }}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
          ) : (
            <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
          )
        ) : (
          <span className="w-4" />
        )}
        {isExpanded && hasChildren ? (
          <FolderOpen size={18} className="text-amber-500 flex-shrink-0" />
        ) : hasChildren ? (
          <Folder size={18} className="text-amber-500 flex-shrink-0" />
        ) : (
          <FileText size={18} className="text-slate-400 flex-shrink-0" />
        )}
        <span className="truncate flex-1 text-left">{node.name}</span>
        {node.documentCount !== undefined && node.documentCount > 0 && (
          <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
            {node.documentCount}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {node.children!.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                level={level + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Context Menu Component
const ContextMenu = ({
  x,
  y,
  doc,
  onView,
  onDownload,
  onHistory,
  onDelete,
  canDelete,
  onClose,
}: {
  x: number;
  y: number;
  doc: Document;
  onView: () => void;
  onDownload: () => void;
  onHistory: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
  onClose: () => void;
}) => {
  // Calculate position to keep menu within viewport
  const menuWidth = 200;
  const menuHeight = canDelete ? 240 : 180;
  const padding = 8;
  
  // Adjust X position if menu would overflow right edge
  let adjustedX = x;
  if (x + menuWidth + padding > window.innerWidth) {
    adjustedX = x - menuWidth;
  }
  // Ensure menu doesn't go off left edge
  if (adjustedX < padding) {
    adjustedX = padding;
  }
  
  // Adjust Y position if menu would overflow bottom edge
  let adjustedY = y;
  if (y + menuHeight + padding > window.innerHeight) {
    adjustedY = y - menuHeight;
  }
  // Ensure menu doesn't go off top edge
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
        className="fixed z-50 bg-white rounded-xl shadow-lg border border-slate-200 py-2 min-w-[180px]"
        style={{ left: adjustedX, top: adjustedY }}
      >
        <button
          onClick={() => { onView(); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-slate-50 transition-colors"
        >
          <Eye size={16} className="text-slate-500" />
          View Details
        </button>
        <button
          onClick={() => { onDownload(); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-slate-50 transition-colors"
        >
          <Download size={16} className="text-slate-500" />
          Download
        </button>
        <button
          onClick={() => { onHistory(); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-slate-50 transition-colors"
        >
          <History size={16} className="text-slate-500" />
          Version History
        </button>
        <div className="border-t border-slate-100 my-1" />
        <button
          onClick={() => { onView(); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-slate-50 transition-colors"
        >
          <MessageSquare size={16} className="text-slate-500" />
          Add Note
        </button>
        {canDelete && onDelete && (
          <>
            <div className="border-t border-slate-100 my-1" />
            <button
              onClick={() => { onDelete(); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </>
        )}
      </motion.div>
    </>
  );
};

export const FileExplorer = ({
  documents,
  onSelectDocument,
  onViewDocument,
  onDownloadDocument,
  onViewHistory,
  onDeleteDocument,
  canDelete,
  selectedDocumentId,
}: FileExplorerProps) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPath, setSelectedPath] = useState<string[]>(['all']);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; doc: Document } | null>(null);

  // Build folder tree from documents
  const folderTree = useMemo((): FolderNode[] => {
    const tree: FolderNode[] = [
      {
        id: 'all',
        name: 'All Documents',
        type: 'project',
        documentCount: documents.length,
        children: [],
      },
    ];

    // Group by project
    const projectMap = new Map<string, FolderNode>();

    documents.forEach((doc) => {
      const project = projects.find((p) => p.id === doc.projectId);
      const projectName = project?.name || 'Unknown Project';

      if (!projectMap.has(doc.projectId)) {
        projectMap.set(doc.projectId, {
          id: doc.projectId,
          name: projectName,
          type: 'project',
          projectId: doc.projectId,
          children: [],
          documentCount: 0,
        });
      }

      const projectNode = projectMap.get(doc.projectId)!;
      projectNode.documentCount = (projectNode.documentCount || 0) + 1;

      // Find or create phase node
      let phaseNode = projectNode.children?.find((c) => c.name === doc.phase);
      if (!phaseNode) {
        phaseNode = {
          id: `${doc.projectId}-${doc.phase}`,
          name: doc.phase,
          type: 'phase',
          phase: doc.phase,
          children: [],
          documentCount: 0,
        };
        projectNode.children = projectNode.children || [];
        projectNode.children.push(phaseNode);
      }
      phaseNode.documentCount = (phaseNode.documentCount || 0) + 1;

      // Find or create discipline node
      let disciplineNode = phaseNode.children?.find((c) => c.name === doc.discipline);
      if (!disciplineNode) {
        disciplineNode = {
          id: `${doc.projectId}-${doc.phase}-${doc.discipline}`,
          name: doc.discipline,
          type: 'discipline',
          discipline: doc.discipline,
          children: [],
          documentCount: 0,
        };
        phaseNode.children = phaseNode.children || [];
        phaseNode.children.push(disciplineNode);
      }
      disciplineNode.documentCount = (disciplineNode.documentCount || 0) + 1;
    });

    tree[0].children = Array.from(projectMap.values());
    return tree;
  }, [documents]);

  // Filter documents based on selection and search
  const filteredDocuments = useMemo(() => {
    let filtered = documents;

    // Filter by selected path
    if (selectedPath[0] !== 'all') {
      const pathId = selectedPath[0];
      if (pathId.includes('-')) {
        const parts = pathId.split('-');
        const projectId = parts[0] + '-' + parts[1];
        filtered = filtered.filter((d) => d.projectId === projectId);
        
        if (parts.length >= 3) {
          const phase = parts[2] as DocumentPhase;
          filtered = filtered.filter((d) => d.phase === phase);
        }
        if (parts.length >= 4) {
          const discipline = parts[3] as DocumentDiscipline;
          filtered = filtered.filter((d) => d.discipline === discipline);
        }
      } else {
        filtered = filtered.filter((d) => d.projectId === pathId);
      }
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.tags.some((t) => t.toLowerCase().includes(query)) ||
          d.category.toLowerCase().includes(query) ||
          d.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [documents, selectedPath, searchQuery]);

  const handleContextMenu = (e: React.MouseEvent, doc: Document) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, doc });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="flex h-[calc(100vh-16rem)] bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Sidebar Tree */}
      <div className="w-72 border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-3">Folder Structure</h3>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {folderTree.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              selectedPath={selectedPath}
              onSelect={setSelectedPath}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                viewMode === 'list' ? 'bg-primary-100 text-primary-700' : 'hover:bg-slate-100'
              )}
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                viewMode === 'grid' ? 'bg-primary-100 text-primary-700' : 'hover:bg-slate-100'
              )}
            >
              <Grid3X3 size={18} />
            </button>
          </div>
        </div>

        {/* File List/Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <Folder size={48} className="mb-4 text-slate-300" />
              <p className="text-lg font-medium">No documents found</p>
              <p className="text-sm">Try adjusting your search or folder selection</p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-1">
              {filteredDocuments.map((doc) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-colors',
                    'hover:bg-slate-50',
                    selectedDocumentId === doc.id && 'bg-primary-50 ring-1 ring-primary-200'
                  )}
                  onClick={() => onSelectDocument(doc)}
                  onContextMenu={(e) => handleContextMenu(e, doc)}
                  onDoubleClick={() => onViewDocument(doc)}
                >
                  {getFileIcon(doc)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{doc.name}</p>
                    <p className="text-xs text-slate-500">
                      {doc.category} • {doc.version} • {formatFileSize(doc.fileSize)}
                    </p>
                  </div>
                  <StatusBadge status={doc.status} />
                  <span className="text-xs text-slate-400">
                    {new Date(doc.uploadedDate).toLocaleDateString()}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContextMenu(e, doc);
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <MoreVertical size={16} className="text-slate-400" />
                  </button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredDocuments.map((doc) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    'p-4 rounded-xl border border-slate-200 cursor-pointer transition-all',
                    'hover:shadow-lg hover:border-primary-200',
                    selectedDocumentId === doc.id && 'ring-2 ring-primary-500 border-transparent'
                  )}
                  onClick={() => onSelectDocument(doc)}
                  onContextMenu={(e) => handleContextMenu(e, doc)}
                  onDoubleClick={() => onViewDocument(doc)}
                >
                  <div className="flex items-center justify-center h-24 bg-slate-50 rounded-lg mb-3">
                    {React.cloneElement(getFileIcon(doc), { size: 40 })}
                  </div>
                  <p className="font-medium text-sm text-slate-900 truncate mb-1">{doc.name}</p>
                  <div className="flex items-center justify-between">
                    <StatusBadge status={doc.status} />
                    <span className="text-xs text-slate-400">{doc.version}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            doc={contextMenu.doc}
            onView={() => onViewDocument(contextMenu.doc)}
            onDownload={() => onDownloadDocument(contextMenu.doc)}
            onHistory={() => onViewHistory(contextMenu.doc)}
            onDelete={onDeleteDocument ? () => onDeleteDocument(contextMenu.doc) : undefined}
            canDelete={canDelete}
            onClose={() => setContextMenu(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};


