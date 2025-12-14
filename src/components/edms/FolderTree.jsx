/**
 * FolderTree - Hierarchical folder navigation for EDMS
 * Per-project folder structure with create/move capabilities
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Folder, FolderOpen, ChevronRight, ChevronDown,
    Plus, MoreVertical, Home, Loader2
} from 'lucide-react';
import client from '@/api/client';
import { toast } from 'sonner';

const FolderTree = ({
    projectId,
    selectedFolderId,
    onFolderSelect,
    onCreateFolder,
    canCreateFolder = false
}) => {
    const [folders, setFolders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedFolders, setExpandedFolders] = useState(new Set());
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [createInFolder, setCreateInFolder] = useState(null);

    useEffect(() => {
        if (projectId) {
            fetchFolderTree();
        }
    }, [projectId]);

    const fetchFolderTree = async () => {
        setLoading(true);
        try {
            const res = await client.get(`/edms/folders/tree/?project=${projectId}`);
            setFolders(res.data);
        } catch (error) {
            console.error('Failed to fetch folders:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (folderId) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) {
                next.delete(folderId);
            } else {
                next.add(folderId);
            }
            return next;
        });
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;

        try {
            await client.post('/edms/folders/', {
                name: newFolderName.trim(),
                project: projectId,
                parent: createInFolder
            });
            toast.success('Folder created');
            setShowCreateModal(false);
            setNewFolderName('');
            setCreateInFolder(null);
            fetchFolderTree();
        } catch (error) {
            toast.error('Failed to create folder');
        }
    };

    const openCreateModal = (parentId = null) => {
        setCreateInFolder(parentId);
        setShowCreateModal(true);
    };

    const renderFolder = (folder, depth = 0) => {
        const isExpanded = expandedFolders.has(folder.id);
        const isSelected = selectedFolderId === folder.id;
        const hasChildren = folder.children && folder.children.length > 0;

        return (
            <div key={folder.id}>
                <div
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer group transition-all ${isSelected
                            ? 'bg-primary-100 text-primary-700'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                    style={{ paddingLeft: `${depth * 16 + 8}px` }}
                    onClick={() => onFolderSelect(folder.id)}
                >
                    {/* Expand/Collapse */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(folder.id);
                        }}
                        className={`p-0.5 rounded hover:bg-slate-200 ${!hasChildren ? 'invisible' : ''}`}
                    >
                        {isExpanded ? (
                            <ChevronDown size={14} />
                        ) : (
                            <ChevronRight size={14} />
                        )}
                    </button>

                    {/* Folder Icon */}
                    {isExpanded ? (
                        <FolderOpen size={16} className={isSelected ? 'text-primary-600' : 'text-amber-500'} />
                    ) : (
                        <Folder size={16} className={isSelected ? 'text-primary-600' : 'text-amber-500'} />
                    )}

                    {/* Name */}
                    <span className="flex-1 text-sm font-medium truncate">
                        {folder.name}
                    </span>

                    {/* Document Count */}
                    {folder.document_count > 0 && (
                        <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {folder.document_count}
                        </span>
                    )}

                    {/* Create Subfolder */}
                    {canCreateFolder && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                openCreateModal(folder.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded transition-opacity"
                        >
                            <Plus size={14} />
                        </button>
                    )}
                </div>

                {/* Children */}
                <AnimatePresence>
                    {isExpanded && hasChildren && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            {folder.children.map(child => renderFolder(child, depth + 1))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="space-y-1">
            {/* Root (All Documents) */}
            <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${selectedFolderId === null
                        ? 'bg-primary-100 text-primary-700'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                onClick={() => onFolderSelect(null)}
            >
                <Home size={16} className={selectedFolderId === null ? 'text-primary-600' : 'text-slate-500'} />
                <span className="text-sm font-medium">All Documents</span>
            </div>

            {/* Folder Tree */}
            <div className="pl-2">
                {folders.map(folder => renderFolder(folder))}
            </div>

            {/* Create Root Folder Button */}
            {canCreateFolder && (
                <button
                    onClick={() => openCreateModal(null)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg w-full transition-colors"
                >
                    <Plus size={16} />
                    <span>New Folder</span>
                </button>
            )}

            {/* Create Folder Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-xl p-4 w-full max-w-sm shadow-xl"
                    >
                        <h3 className="text-lg font-semibold text-slate-800 mb-3">
                            Create Folder
                        </h3>
                        <input
                            type="text"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            placeholder="Folder name"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setNewFolderName('');
                                }}
                                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateFolder}
                                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                            >
                                Create
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default FolderTree;
