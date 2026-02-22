/**
 * DocumentList - Table/Grid view of documents with actions
 * Displays documents with status, type, version, and quick actions
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    FileText, Download, Eye, MessageSquare, CheckCircle, XCircle,
    Clock, AlertTriangle, Edit, MoreHorizontal, Grid, List,
    FileImage, FileSpreadsheet, File, Loader2, BookOpen
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const DocumentList = ({
    documents,
    loading,
    viewMode = 'table',
    onView,
    onViewWithNoting,  // Opens document viewer with noting sheet
    onDownload,
    onDiscuss,
    selectedDocId
}) => {
    const getStatusConfig = (status) => {
        const configs = {
            DRAFT: { color: 'bg-slate-100 text-slate-700', icon: Edit, label: 'Draft' },
            UNDER_REVIEW: { color: 'bg-amber-100 text-amber-700', icon: Clock, label: 'Under Review' },
            REVISION_REQUESTED: { color: 'bg-orange-100 text-orange-700', icon: AlertTriangle, label: 'Revision Requested' },
            VALIDATED: { color: 'bg-blue-100 text-blue-700', icon: CheckCircle, label: 'Validated' },
            APPROVED: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Approved' },
            REJECTED: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Rejected' },
            ARCHIVED: { color: 'bg-gray-100 text-gray-500', icon: File, label: 'Archived' }
        };
        return configs[status] || configs.DRAFT;
    };

    const getTypeIcon = (type) => {
        const icons = {
            DRAWING: FileImage,
            REPORT: FileText,
            CONTRACT: FileSpreadsheet,
            CORRESPONDENCE: FileText,
            SPECIFICATION: FileText,
            INVOICE: FileSpreadsheet,
            MEDIA: FileImage,
            OTHER: File
        };
        return icons[type] || File;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 size={32} className="animate-spin text-slate-400" />
            </div>
        );
    }

    if (!documents || documents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                    <FileText size={32} className="text-slate-400 dark:text-neutral-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-white">No Documents</h3>
                <p className="text-sm text-slate-500 dark:text-neutral-400 mt-1">
                    Upload your first document to get started
                </p>
            </div>
        );
    }

    // Table View
    if (viewMode === 'table') {
        return (
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-neutral-700">
                            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                                Document
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                                Type
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                                Version
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                                Uploaded
                            </th>
                            <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {documents.map((doc, index) => {
                            const statusConfig = getStatusConfig(doc.status);
                            const StatusIcon = statusConfig.icon;
                            const TypeIcon = getTypeIcon(doc.document_type);
                            const isSelected = selectedDocId === doc.id;

                            return (
                                <motion.tr
                                    key={doc.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    className={`border-b border-slate-100 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors ${isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                                        }`}
                                    onClick={() => onView(doc)}
                                >
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-neutral-800 flex items-center justify-center">
                                                <TypeIcon size={20} className="text-slate-500 dark:text-neutral-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800 dark:text-white text-sm line-clamp-1">
                                                    {doc.title}
                                                </p>
                                                {doc.document_number && (
                                                    <p className="text-xs text-slate-500">{doc.document_number}</p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="text-sm text-slate-600 dark:text-neutral-400">
                                            {doc.document_type.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                                            <StatusIcon size={12} />
                                            {statusConfig.label}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="text-sm text-slate-600 dark:text-neutral-400">
                                            v{doc.current_version_number || 1}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div>
                                            <p className="text-sm text-slate-600 dark:text-neutral-400">{doc.uploaded_by_name}</p>
                                            <p className="text-xs text-slate-400 dark:text-neutral-500">
                                                {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center justify-end gap-1">
                                            {onViewWithNoting && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onViewWithNoting(doc);
                                                    }}
                                                    className="p-2 hover:bg-primary-100 rounded-lg transition-colors"
                                                    title="View with Noting Sheet"
                                                >
                                                    <BookOpen size={16} className="text-primary-600" />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onView(doc);
                                                }}
                                                className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                                                title="Quick View"
                                            >
                                                <Eye size={16} className="text-slate-500" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDownload(doc);
                                                }}
                                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                                title="Download"
                                            >
                                                <Download size={16} className="text-slate-500" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDiscuss(doc);
                                                }}
                                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                                title="Discuss"
                                            >
                                                <MessageSquare size={16} className="text-slate-500" />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    }

    // Grid View
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
            {documents.map((doc, index) => {
                const statusConfig = getStatusConfig(doc.status);
                const StatusIcon = statusConfig.icon;
                const TypeIcon = getTypeIcon(doc.document_type);
                const isSelected = selectedDocId === doc.id;

                return (
                    <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.03 }}
                        className={`bg-white dark:bg-neutral-900 rounded-xl border p-4 cursor-pointer hover:shadow-md transition-all ${isSelected ? 'border-primary-500 ring-2 ring-primary-100 dark:ring-primary-900/50' : 'border-slate-200 dark:border-neutral-700'
                            }`}
                        onClick={() => onView(doc)}
                    >
                        {/* Icon & Type */}
                        <div className="flex items-start justify-between mb-3">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-neutral-800 flex items-center justify-center">
                                <TypeIcon size={24} className="text-slate-500 dark:text-neutral-400" />
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                                <StatusIcon size={10} />
                                {statusConfig.label}
                            </span>
                        </div>

                        {/* Title */}
                        <h3 className="font-semibold text-slate-800 dark:text-white text-sm line-clamp-2 mb-1">
                            {doc.title}
                        </h3>
                        {doc.document_number && (
                            <p className="text-xs text-slate-500 dark:text-neutral-400 mb-2">{doc.document_number}</p>
                        )}

                        {/* Meta */}
                        <div className="flex items-center justify-between text-xs text-slate-400 dark:text-neutral-500 mt-3 pt-3 border-t border-slate-100 dark:border-neutral-800">
                            <span>v{doc.current_version_number || 1}</span>
                            <span>{formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}</span>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-1 mt-3">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDownload(doc);
                                }}
                                className="flex-1 py-2 text-xs text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors flex items-center justify-center gap-1"
                            >
                                <Download size={14} />
                                Download
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDiscuss(doc);
                                }}
                                className="flex-1 py-2 text-xs text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors flex items-center justify-center gap-1"
                            >
                                <MessageSquare size={14} />
                                Discuss
                            </button>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
};

export default DocumentList;
