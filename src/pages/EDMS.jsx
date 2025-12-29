/**
 * EDMS Page - Electronic Document Management System
 * Windows-like file explorer with clickable project/folder navigation
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText, Upload, Search, Filter, Grid, List,
    RefreshCw, FolderOpen, Folder, ChevronRight, Loader2,
    Home, ArrowLeft, Plus
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import client from '@/api/client';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import DocumentList from '@/components/edms/DocumentList';
import DocumentUploadModal from '@/components/edms/DocumentUploadModal';
import AddVersionModal from '@/components/edms/AddVersionModal';
import DocumentDetailModal from '@/components/edms/DocumentDetailModal';
import NewThreadModal from '@/components/communications/NewThreadModal';

const EDMS = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Navigation state
    const [currentView, setCurrentView] = useState('projects'); // 'projects' | 'folders' | 'documents'
    const [projects, setProjects] = useState([]);
    const [currentProject, setCurrentProject] = useState(null);
    const [currentFolder, setCurrentFolder] = useState(null);
    const [folders, setFolders] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [breadcrumbs, setBreadcrumbs] = useState([]);

    // UI state
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [viewMode, setViewMode] = useState('grid');

    // Modals
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showAddVersionModal, setShowAddVersionModal] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [showDiscussModal, setShowDiscussModal] = useState(false);
    const [discussDocument, setDiscussDocument] = useState(null);
    const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    // Permissions
    const canUpload = ['SPV_Official', 'NICDC_HQ', 'PMNC_Team', 'EPC_Contractor', 'Consultant_Design'].includes(user?.role);
    const canCreateFolder = ['SPV_Official', 'NICDC_HQ', 'PMNC_Team', 'EPC_Contractor', 'Consultant_Design'].includes(user?.role);

    const documentStatuses = [
        { value: '', label: 'All Status' },
        { value: 'DRAFT', label: 'Draft' },
        { value: 'UNDER_REVIEW', label: 'Under Review' },
        { value: 'REVISION_REQUESTED', label: 'Revision Requested' },
        { value: 'VALIDATED', label: 'Validated' },
        { value: 'APPROVED', label: 'Approved' },
        { value: 'REJECTED', label: 'Rejected' },
    ];

    const documentTypes = [
        { value: '', label: 'All Types' },
        { value: 'DRAWING', label: 'Drawing' },
        { value: 'REPORT', label: 'Report' },
        { value: 'CONTRACT', label: 'Contract' },
        { value: 'CORRESPONDENCE', label: 'Correspondence' },
        { value: 'SPECIFICATION', label: 'Specification' },
        { value: 'INVOICE', label: 'Invoice' },
        { value: 'MEDIA', label: 'Media' },
        { value: 'OTHER', label: 'Other' },
    ];

    useEffect(() => {
        fetchProjects();
    }, []);

    useEffect(() => {
        if (currentProject) {
            fetchFoldersAndDocuments();
        }
    }, [currentProject, currentFolder, statusFilter, typeFilter, searchQuery]);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const res = await client.get('/projects/');
            const projectList = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setProjects(projectList);
        } catch (error) {
            console.error('Failed to fetch projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFoldersAndDocuments = async () => {
        if (!currentProject) return;

        setLoading(true);
        try {
            // Fetch folders in current location
            const folderParams = new URLSearchParams();
            folderParams.append('project', currentProject.id);
            if (currentFolder) {
                folderParams.append('parent', currentFolder.id);
            } else {
                folderParams.append('parent', 'null');
            }

            const foldersRes = await client.get(`/edms/folders/?${folderParams.toString()}`);
            const folderList = Array.isArray(foldersRes.data) ? foldersRes.data : (foldersRes.data.results || []);
            setFolders(folderList);

            // Fetch documents in current location
            const docParams = new URLSearchParams();
            docParams.append('project', currentProject.id);
            if (currentFolder) {
                docParams.append('folder', currentFolder.id);
            } else {
                docParams.append('folder', 'null');
            }
            if (statusFilter) docParams.append('status', statusFilter);
            if (typeFilter) docParams.append('type', typeFilter);
            if (searchQuery) docParams.append('search', searchQuery);

            const docsRes = await client.get(`/edms/documents/?${docParams.toString()}`);
            const docsList = Array.isArray(docsRes.data) ? docsRes.data : (docsRes.data.results || []);
            setDocuments(docsList);
        } catch (error) {
            console.error('Failed to fetch folders/documents:', error);
            toast.error('Failed to load content');
        } finally {
            setLoading(false);
        }
    };

    const navigateToProject = (project) => {
        setCurrentProject(project);
        setCurrentFolder(null);
        setCurrentView('folders');
        setBreadcrumbs([{ type: 'project', item: project }]);
    };

    const navigateToFolder = (folder) => {
        setCurrentFolder(folder);
        setBreadcrumbs(prev => [...prev, { type: 'folder', item: folder }]);
    };

    const navigateBack = () => {
        if (breadcrumbs.length === 0) return;

        if (breadcrumbs.length === 1) {
            // Back to projects view
            setCurrentProject(null);
            setCurrentFolder(null);
            setCurrentView('projects');
            setBreadcrumbs([]);
        } else {
            // Go up one folder level
            const newBreadcrumbs = [...breadcrumbs];
            newBreadcrumbs.pop();
            setBreadcrumbs(newBreadcrumbs);

            const lastItem = newBreadcrumbs[newBreadcrumbs.length - 1];
            if (lastItem.type === 'project') {
                setCurrentFolder(null);
            } else {
                setCurrentFolder(lastItem.item);
            }
        }
    };

    const navigateToBreadcrumb = (index) => {
        if (index === -1) {
            // Home clicked
            setCurrentProject(null);
            setCurrentFolder(null);
            setCurrentView('projects');
            setBreadcrumbs([]);
            return;
        }

        const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
        setBreadcrumbs(newBreadcrumbs);

        const targetItem = newBreadcrumbs[index];
        if (targetItem.type === 'project') {
            setCurrentFolder(null);
        } else {
            setCurrentFolder(targetItem.item);
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim() || !currentProject) return;

        try {
            await client.post('/edms/folders/', {
                name: newFolderName.trim(),
                project: currentProject.id,
                parent: currentFolder?.id || null
            });
            toast.success('Folder created');
            setShowCreateFolderModal(false);
            setNewFolderName('');
            fetchFoldersAndDocuments();
        } catch (error) {
            toast.error('Failed to create folder');
        }
    };

    const handleDownload = async (doc) => {
        try {
            const res = await client.get(`/edms/documents/${doc.id}/download/`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(res.data);
            const a = window.document.createElement('a');
            a.href = url;
            a.download = doc.title || 'document';
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success('Download started');
        } catch (error) {
            toast.error('Failed to download');
        }
    };

    const handleDiscuss = (doc) => {
        setDiscussDocument(doc);
        setShowDiscussModal(true);
    };

    const handleThreadCreated = () => {
        setShowDiscussModal(false);
        setDiscussDocument(null);
        toast.success('Discussion thread created');
    };

    // Render project cards (Rich Card Design)
    const renderProjectsView = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
            {projects.map((project, index) => (
                <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
                    onDoubleClick={() => navigateToProject(project)}
                    onClick={() => navigateToProject(project)}
                >
                    {/* Card Header / Icon Area */}
                    <div className="bg-gradient-to-r from-primary-50 to-blue-50 p-6 flex justify-center items-center border-b border-slate-100 relative">
                        <div className="absolute top-2 right-2 opacity-50">
                            {/* Optional: Status badge or similar could go here */}
                        </div>
                        <div className="w-20 h-20 rounded-2xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <FolderOpen size={40} className="text-primary-600" />
                        </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5">
                        <h3 className="font-bold text-slate-800 text-lg mb-1 line-clamp-1 group-hover:text-primary-700 transition-colors">
                            {project.name}
                        </h3>
                        <p className="text-sm text-slate-500 mb-4 line-clamp-1">
                            {project.node_name || 'Project Root'}
                        </p>

                        {/* Footer / Meta */}
                        <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-3 border-t border-slate-100">
                            <span className="flex items-center gap-1">
                                <Folder size={12} />
                                Project Folder
                            </span>
                            <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">
                                Open <ChevronRight size={10} />
                            </span>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );

    // Render folders and documents in current location
    const renderFoldersAndDocuments = () => (
        <div className="p-6 space-y-8">
            {/* Folders Section - Grid of Cards */}
            {folders.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-800 tracking-wide flex items-center gap-2">
                        <Folder size={16} className="text-amber-500" />
                        Folders
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {folders.map((folder, index) => (
                            <motion.div
                                key={folder.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.03 }}
                                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-300 cursor-pointer transition-all group flex flex-col justify-between h-32"
                                onClick={() => navigateToFolder(folder)}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500 group-hover:bg-amber-100 transition-colors">
                                        <Folder size={20} fill="currentColor" className="text-amber-500" />
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ChevronRight size={16} className="text-slate-400" />
                                    </div>
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-700 text-sm line-clamp-1 group-hover:text-amber-700 transition-colors">
                                        {folder.name}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {folder.document_count > 0 ? `${folder.document_count} items` : 'Empty'}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Documents Section - Only show if documents exist OR no folders exist */}
            {(documents.length > 0 || folders.length === 0) && (
                <div className="space-y-3">
                    {folders.length > 0 && documents.length > 0 && (
                        <div className="flex items-center gap-2 pt-4 border-t border-slate-200/60">
                            <FileText size={16} className="text-primary-500" />
                            <h3 className="text-sm font-bold text-slate-800 tracking-wide">
                                Documents
                            </h3>
                        </div>
                    )}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <DocumentList
                            documents={documents}
                            loading={loading && folders.length === 0}
                            viewMode={viewMode}
                            selectedDocId={selectedDocument?.id}
                            onView={(doc) => setSelectedDocument(doc)}
                            onViewWithNoting={(doc) => navigate(`/edms/view/${doc.id}`)}
                            onDownload={handleDownload}
                            onDiscuss={handleDiscuss}
                        />
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-slate-50/50">
            {/* Header Area with Subtle Gradient */}
            <div className="bg-white border-b border-slate-200 shadow-sm z-10">
                <div className="px-6 py-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            {/* Back Button */}
                            {currentView !== 'projects' && (
                                <button
                                    onClick={navigateBack}
                                    className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-full hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                                >
                                    <ArrowLeft size={16} className="text-slate-600" />
                                </button>
                            )}

                            {/* Title & Icon */}
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary-100 rounded-lg text-primary-600">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-slate-800 leading-tight">
                                        Electronic Document Management System
                                    </h1>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {currentProject ? 'Project Documents' : 'Select a Project to browse'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Actions Toolbar */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => currentProject ? fetchFoldersAndDocuments() : fetchProjects()}
                                disabled={loading}
                                className="text-slate-600 hover:text-primary-600 hover:bg-white"
                            >
                                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            </Button>

                            {currentProject && canCreateFolder && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowCreateFolderModal(true)}
                                    className="bg-white border-slate-200 hover:border-primary-200 hover:bg-primary-50 text-slate-700"
                                >
                                    <Plus size={16} className="mr-1" />
                                    New Folder
                                </Button>
                            )}

                            {currentProject && canUpload && (
                                <>
                                    <Button
                                        size="sm"
                                        onClick={() => setShowAddVersionModal(true)}
                                        className="shadow-md shadow-primary-500/20"
                                    >
                                        <RefreshCw size={16} className="mr-1" />
                                        Add Version
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => setShowUploadModal(true)}
                                        className="shadow-md shadow-primary-500/20"
                                    >
                                        <Upload size={16} className="mr-1" />
                                        Upload
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Breadcrumbs & Search Row */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Interactive Breadcrumbs */}
                        <div className="flex items-center gap-2 text-sm overflow-x-auto pb-1 no-scrollbar">
                            <button
                                onClick={() => navigateToBreadcrumb(-1)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border ${breadcrumbs.length === 0
                                    ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                            >
                                <Home size={14} />
                                <span className={breadcrumbs.length > 0 ? 'hidden md:inline' : 'inline'}>Projects</span>
                            </button>

                            {breadcrumbs.map((crumb, index) => {
                                const isLast = index === breadcrumbs.length - 1;
                                return (
                                    <div key={index} className="flex items-center gap-2 animate-fadeIn">
                                        <ChevronRight size={14} className="text-slate-400" />
                                        <button
                                            onClick={() => navigateToBreadcrumb(index)}
                                            className={`px-3 py-1.5 rounded-full transition-all border whitespace-nowrap max-w-[150px] truncate ${isLast
                                                ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                }`}
                                        >
                                            {crumb.item.name}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Search & Filters */}
                        {currentProject && (
                            <div className="flex items-center gap-2 flex-wrap">
                                <div className="relative group">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-primary-500 transition-colors" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search..."
                                        className="pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 w-40 focus:w-60 transition-all shadow-sm"
                                    />
                                </div>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 shadow-sm"
                                >
                                    {documentStatuses.map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Scrollable Content - Wrapped in white rounded container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 min-h-full">
                    {loading && (currentView === 'projects' || folders.length === 0) ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-60">
                            <Loader2 size={40} className="animate-spin text-primary-500 mb-4" />
                            <p className="text-slate-500 font-medium">Loading contents...</p>
                        </div>
                    ) : currentView === 'projects' ? (
                        renderProjectsView()
                    ) : (
                        renderFoldersAndDocuments()
                    )}
                </div>
            </div>

            {/* Create Folder Modal */}
            <AnimatePresence>
                {showCreateFolderModal && (
                    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-white/20"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                                    <Folder size={20} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">
                                    New Folder
                                </h3>
                            </div>

                            <input
                                type="text"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="Enter folder name..."
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                            />
                            <p className="text-xs text-slate-500 mt-2 ml-1">
                                Create in: <span className="font-medium text-slate-700">{currentFolder?.name || currentProject?.name || 'Root'}</span>
                            </p>
                            <div className="flex justify-end gap-2 mt-6">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setShowCreateFolderModal(false);
                                        setNewFolderName('');
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button size="sm" onClick={handleCreateFolder}>
                                    Create Folder
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Upload Modal */}
            {showUploadModal && currentProject && (
                <DocumentUploadModal
                    projectId={currentProject.id}
                    currentFolderId={currentFolder?.id}
                    onClose={() => setShowUploadModal(false)}
                    onUploaded={() => {
                        setShowUploadModal(false);
                        fetchFoldersAndDocuments();
                    }}
                />
            )}

            {/* Add Version Modal */}
            {showAddVersionModal && currentProject && (
                <AddVersionModal
                    projectId={currentProject.id}
                    currentFolderId={currentFolder?.id}
                    onClose={() => setShowAddVersionModal(false)}
                    onVersionAdded={() => {
                        setShowAddVersionModal(false);
                        fetchFoldersAndDocuments();
                    }}
                />
            )}

            {/* Document Detail Modal */}
            {selectedDocument && (
                <DocumentDetailModal
                    document={selectedDocument}
                    userRole={user?.role}
                    onClose={() => setSelectedDocument(null)}
                    onUpdate={fetchFoldersAndDocuments}
                    onDiscuss={handleDiscuss}
                    onViewWithNoting={(doc) => navigate(`/edms/view/${doc.id}`)}
                />
            )}

            {/* Discuss Modal */}
            {showDiscussModal && discussDocument && (
                <NewThreadModal
                    onClose={() => {
                        setShowDiscussModal(false);
                        setDiscussDocument(null);
                    }}
                    onCreated={handleThreadCreated}
                    preselectedContext={{
                        type: 'edms.document',
                        id: discussDocument.id,
                        name: discussDocument.title
                    }}
                />
            )}
        </div>
    );
};

export default EDMS;
