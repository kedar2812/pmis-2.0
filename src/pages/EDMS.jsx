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

    // Render project cards (Windows-like folders)
    const renderProjectsView = () => (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-6">
            {projects.map((project, index) => (
                <motion.div
                    key={project.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex flex-col items-center p-4 rounded-xl cursor-pointer hover:bg-slate-100 transition-all group"
                    onDoubleClick={() => navigateToProject(project)}
                    onClick={() => navigateToProject(project)}
                >
                    <div className="w-20 h-20 mb-2 relative">
                        <FolderOpen
                            size={80}
                            className="text-amber-400 group-hover:text-amber-500 transition-colors drop-shadow-md"
                            strokeWidth={1.5}
                        />
                    </div>
                    <p className="text-sm font-medium text-slate-700 text-center line-clamp-2 group-hover:text-slate-900">
                        {project.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                        {project.node_name || 'Project'}
                    </p>
                </motion.div>
            ))}
        </div>
    );

    // Render folders and documents in current location
    const renderFoldersAndDocuments = () => (
        <div className="p-4">
            {/* Folders Section */}
            {folders.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">
                        Folders
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {folders.map((folder, index) => (
                            <motion.div
                                key={folder.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.02 }}
                                className="flex flex-col items-center p-3 rounded-lg cursor-pointer hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-all group"
                                onClick={() => navigateToFolder(folder)}
                            >
                                <Folder
                                    size={48}
                                    className="text-amber-400 group-hover:text-amber-500 mb-1"
                                    fill="currentColor"
                                    strokeWidth={1}
                                />
                                <p className="text-xs font-medium text-slate-700 text-center line-clamp-1">
                                    {folder.name}
                                </p>
                                {folder.document_count > 0 && (
                                    <span className="text-[10px] text-slate-400">
                                        {folder.document_count} docs
                                    </span>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Documents Section */}
            <div>
                {folders.length > 0 && documents.length > 0 && (
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">
                        Documents
                    </h3>
                )}
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
    );

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        {/* Back Button */}
                        {currentView !== 'projects' && (
                            <button
                                onClick={navigateBack}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft size={20} className="text-slate-600" />
                            </button>
                        )}

                        {/* Title */}
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <FileText className="text-primary-600" size={24} />
                                Document Management
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => currentProject ? fetchFoldersAndDocuments() : fetchProjects()}
                            disabled={loading}
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </Button>

                        {currentProject && canCreateFolder && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowCreateFolderModal(true)}
                            >
                                <Plus size={16} className="mr-1" />
                                New Folder
                            </Button>
                        )}

                        {currentProject && canUpload && (
                            <Button size="sm" onClick={() => setShowUploadModal(true)}>
                                <Upload size={16} className="mr-1" />
                                Upload
                            </Button>
                        )}
                    </div>
                </div>

                {/* Breadcrumb Navigation */}
                <div className="flex items-center gap-1 text-sm overflow-x-auto pb-1">
                    <button
                        onClick={() => navigateToBreadcrumb(-1)}
                        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition-colors whitespace-nowrap"
                    >
                        <Home size={14} />
                        <span>Projects</span>
                    </button>

                    {breadcrumbs.map((crumb, index) => (
                        <div key={index} className="flex items-center">
                            <ChevronRight size={14} className="text-slate-400 mx-1" />
                            <button
                                onClick={() => navigateToBreadcrumb(index)}
                                className={`px-2 py-1 rounded transition-colors whitespace-nowrap ${index === breadcrumbs.length - 1
                                    ? 'bg-primary-100 text-primary-700 font-medium'
                                    : 'hover:bg-slate-100 text-slate-600 hover:text-slate-800'
                                    }`}
                            >
                                {crumb.item.name}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Filters Row (only show when in project) */}
                {currentProject && (
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                        {/* Search */}
                        <div className="relative flex-1 max-w-xs">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search documents..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>

                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            {documentStatuses.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>

                        {/* Type Filter */}
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            {documentTypes.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>

                        {/* View Toggle */}
                        <div className="flex bg-slate-100 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-2 rounded ${viewMode === 'table' ? 'bg-white shadow-sm' : ''}`}
                            >
                                <List size={16} className={viewMode === 'table' ? 'text-primary-600' : 'text-slate-400'} />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
                            >
                                <Grid size={16} className={viewMode === 'grid' ? 'text-primary-600' : 'text-slate-400'} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                {loading && (currentView === 'projects' || folders.length === 0) ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 size={32} className="animate-spin text-slate-400" />
                    </div>
                ) : currentView === 'projects' ? (
                    renderProjectsView()
                ) : (
                    renderFoldersAndDocuments()
                )}
            </div>

            {/* Create Folder Modal */}
            <AnimatePresence>
                {showCreateFolderModal && (
                    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-xl p-4 w-full max-w-sm shadow-xl"
                        >
                            <h3 className="text-lg font-semibold text-slate-800 mb-3">
                                Create New Folder
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
                            <p className="text-xs text-slate-500 mt-2">
                                Creating in: {currentFolder?.name || currentProject?.name || 'Root'}
                            </p>
                            <div className="flex justify-end gap-2 mt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setShowCreateFolderModal(false);
                                        setNewFolderName('');
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button size="sm" onClick={handleCreateFolder}>
                                    Create
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
