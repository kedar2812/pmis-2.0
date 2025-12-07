import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FileText,
  Download,
  History,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  Tag,
  Folder,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Document, NotingSheetEntry, DocumentVersion } from '@/mock/interfaces';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';
import { projects } from '@/mock';

interface DocumentPreviewDrawerProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove?: (doc: Document, remark: string) => void;
  onReject?: (doc: Document, remark: string) => void;
  onAddNote?: (doc: Document, note: NotingSheetEntry) => void;
  onDownload?: (doc: Document) => void;
}

// Action icon mapping
const getActionIcon = (action: NotingSheetEntry['action']) => {
  switch (action) {
    case 'Approve':
      return <CheckCircle size={16} className="text-emerald-500" />;
    case 'Reject':
      return <XCircle size={16} className="text-red-500" />;
    case 'Request_Revision':
      return <AlertCircle size={16} className="text-amber-500" />;
    default:
      return <Clock size={16} className="text-blue-500" />;
  }
};

// Action background color
const getActionBg = (action: NotingSheetEntry['action']) => {
  switch (action) {
    case 'Approve':
      return 'bg-emerald-50 border-emerald-200';
    case 'Reject':
      return 'bg-red-50 border-red-200';
    case 'Request_Revision':
      return 'bg-amber-50 border-amber-200';
    default:
      return 'bg-blue-50 border-blue-200';
  }
};

// Version History Panel
const VersionHistoryPanel = ({ versions }: { versions: DocumentVersion[] }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History size={18} className="text-slate-600" />
          <span className="font-medium text-slate-900">Version History</span>
          <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
            {versions.length} versions
          </span>
        </div>
        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-3">
              {versions.map((v, index) => (
                <div
                  key={v.version}
                  className={cn(
                    'p-3 rounded-lg border',
                    index === 0 ? 'bg-primary-50 border-primary-200' : 'bg-white border-slate-200'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-900">{v.version}</span>
                    {index === 0 && (
                      <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mb-1">{v.changeNotes}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <User size={12} /> {v.uploadedBy}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> {new Date(v.uploadedDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Noting Sheet Chat Component
const NotingSheetChat = ({
  notes,
  canApprove,
  onAddNote,
  onApprove,
  onReject,
}: {
  notes: NotingSheetEntry[];
  canApprove: boolean;
  onAddNote: (remark: string, action: NotingSheetEntry['action']) => void;
  onApprove: (remark: string) => void;
  onReject: (remark: string) => void;
}) => {
  const [newRemark, setNewRemark] = useState('');
  const { user } = useAuth();

  const handleSubmit = (action: NotingSheetEntry['action']) => {
    if (!newRemark.trim()) {
      toast.error('Please enter a remark');
      return;
    }

    if (action === 'Approve') {
      onApprove(newRemark);
    } else if (action === 'Reject') {
      onReject(newRemark);
    } else {
      onAddNote(newRemark, action);
    }
    setNewRemark('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <FileText size={18} />
          Noting Sheet
        </h3>
        <p className="text-xs text-slate-500 mt-1">Document approval history and remarks</p>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {notes.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            <Clock size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No remarks yet</p>
          </div>
        ) : (
          notes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('p-4 rounded-xl border', getActionBg(note.action))}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium text-sm">
                  {note.userName.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-900">{note.userName}</span>
                    <span className="text-xs text-slate-500">({note.userRole})</span>
                    {getActionIcon(note.action)}
                  </div>
                  <p className="text-sm text-slate-700 mb-2">{note.remark}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {note.action.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(note.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <textarea
          value={newRemark}
          onChange={(e) => setNewRemark(e.target.value)}
          placeholder="Type your remark..."
          className="w-full p-3 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          rows={3}
        />
        <div className="flex items-center justify-between mt-3">
          <button
            onClick={() => handleSubmit('Comment')}
            disabled={!newRemark.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <Send size={16} />
            Add Comment
          </button>
          {canApprove && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleSubmit('Reject')}
                disabled={!newRemark.trim()}
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <XCircle size={16} />
                Reject
              </Button>
              <Button
                onClick={() => handleSubmit('Approve')}
                disabled={!newRemark.trim()}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle size={16} />
                Approve
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const DocumentPreviewDrawer = ({
  document: doc,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onAddNote,
  onDownload,
}: DocumentPreviewDrawerProps) => {
  const { user, hasPermission } = useAuth();
  const canApprove = hasPermission('edms:approve') && doc?.status === 'Pending_Approval';

  if (!doc) return null;

  const project = projects.find((p) => p.id === doc.projectId);

  const handleAddNote = (remark: string, action: NotingSheetEntry['action']) => {
    if (!onAddNote || !user) return;
    const newNote: NotingSheetEntry = {
      id: `note-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      remark,
      action,
      timestamp: new Date().toISOString(),
    };
    onAddNote(doc, newNote);
    toast.success('Note added successfully');
  };

  const handleApprove = (remark: string) => {
    if (onApprove) {
      onApprove(doc, remark);
      toast.success('Document approved', {
        description: 'The document has been approved successfully.',
      });
    }
  };

  const handleReject = (remark: string) => {
    if (onReject) {
      onReject(doc, remark);
      toast.error('Document rejected', {
        description: 'The document has been rejected.',
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-5xl bg-white shadow-2xl z-50 flex"
          >
            {/* Left Panel - Document Preview */}
            <div className="flex-1 flex flex-col border-r border-slate-200">
              {/* Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText size={24} className="text-primary-600" />
                  <div>
                    <h2 className="font-semibold text-slate-900 truncate max-w-md">{doc.name}</h2>
                    <p className="text-sm text-slate-500">{doc.category} • {doc.version}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {onDownload && (
                    <Button variant="outline" onClick={() => onDownload(doc)}>
                      <Download size={16} />
                      Download
                    </Button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Document Preview Area */}
              <div className="flex-1 bg-slate-100 flex items-center justify-center p-8">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg text-center">
                  <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText size={48} className="text-slate-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{doc.name}</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    {doc.mimeType} • {formatFileSize(doc.fileSize)}
                  </p>
                  {onDownload && (
                    <Button onClick={() => onDownload(doc)} className="w-full">
                      <Download size={16} />
                      Download to View
                    </Button>
                  )}
                </div>
              </div>

              {/* Document Metadata */}
              <div className="p-4 border-t border-slate-200 space-y-4">
                {/* Status Badge */}
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-slate-600">Status:</span>
                  <span
                    className={cn(
                      'px-3 py-1 rounded-full text-sm font-medium',
                      doc.status === 'Approved' && 'bg-emerald-100 text-emerald-700',
                      doc.status === 'Rejected' && 'bg-red-100 text-red-700',
                      doc.status === 'Pending_Approval' && 'bg-amber-100 text-amber-700',
                      doc.status === 'Under Review' && 'bg-blue-100 text-blue-700',
                      doc.status === 'Draft' && 'bg-slate-100 text-slate-700'
                    )}
                  >
                    {doc.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Folder size={16} className="text-slate-400" />
                    <span className="text-slate-600">Project:</span>
                    <span className="font-medium text-slate-900">{project?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-slate-400" />
                    <span className="text-slate-600">Uploaded:</span>
                    <span className="font-medium text-slate-900">
                      {new Date(doc.uploadedDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-slate-400" />
                    <span className="text-slate-600">By:</span>
                    <span className="font-medium text-slate-900">{doc.uploadedBy.userName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag size={16} className="text-slate-400" />
                    <span className="text-slate-600">Phase:</span>
                    <span className="font-medium text-slate-900">{doc.phase}</span>
                  </div>
                </div>

                {/* Tags */}
                {doc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {doc.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Version History */}
                {doc.versionHistory.length > 1 && (
                  <VersionHistoryPanel versions={[...doc.versionHistory].reverse()} />
                )}
              </div>
            </div>

            {/* Right Panel - Noting Sheet */}
            <div className="w-96 flex flex-col bg-slate-50">
              <NotingSheetChat
                notes={doc.notingSheet}
                canApprove={canApprove}
                onAddNote={handleAddNote}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

