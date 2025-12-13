import { useState, useMemo } from 'react';
import { Folder, FileText, ChevronRight, ChevronDown, Lock, Clock, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StatusBadge = ({ status }) => {
    const styles = {
        'DRAFT': 'bg-slate-100 text-slate-600',
        'SUBMITTED': 'bg-blue-100 text-blue-700',
        'UNDER_REVIEW': 'bg-amber-100 text-amber-700',
        'APPROVED': 'bg-green-100 text-green-700',
        'REJECTED': 'bg-red-100 text-red-700',
        'CLARIFICATION_REQ': 'bg-purple-100 text-purple-700'
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status] || styles['DRAFT']}`}>
            {status?.replace('_', ' ')}
        </span>
    );
};

const FileRow = ({ doc, onClick }) => (
    <div
        onClick={() => onClick(doc)}
        className="flex items-center gap-3 p-3 hover:bg-slate-50 border-b border-slate-100 cursor-pointer group transition-colors"
    >
        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
            <FileText size={18} />
        </div>
        <div className="flex-1 min-w-0">
            <h4 className="font-medium text-slate-700 truncate group-hover:text-primary-600">{doc.title}</h4>
            <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>v{doc.current_version}</span>
                <span>•</span>
                <span>{new Date(doc.updated_at).toLocaleDateString()}</span>
                <span>•</span>
                <span className="font-mono">{doc.file_hash?.substring(0, 8)}...</span>
            </div>
        </div>
        <StatusBadge status={doc.status} />
    </div>
);

const FolderRow = ({ name, children, depth = 0 }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="select-none">
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer text-slate-700 font-medium"
                style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
            >
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <Folder size={18} className="text-amber-400 fill-amber-400" />
                <span>{name}</span>
                <span className="text-xs text-slate-400 ml-auto">({children?.length || 0})</span>
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const FileExplorer = ({ documents, isLoading, onDocumentClick }) => {
    // Transform flat list to tree (Project -> Package -> Category -> Files)
    const tree = useMemo(() => {
        const structure = {};

        documents.forEach(doc => {
            const proj = doc.project_name || 'Unassigned Project';
            const pkg = doc.metadata?.package || 'General'; // Using metadata for flexibility

            if (!structure[proj]) structure[proj] = {};
            if (!structure[proj][pkg]) structure[proj][pkg] = [];

            structure[proj][pkg].push(doc);
        });

        return structure;
    }, [documents]);

    if (isLoading) return <div className="p-8 text-center text-slate-500">Loading vault...</div>;

    if (documents.length === 0) return (
        <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <Folder size={48} className="mb-4 text-slate-200" />
            <p>Vault is empty</p>
        </div>
    );

    return (
        <div className="h-full overflow-y-auto custom-scrollbar">
            {Object.entries(tree).map(([projName, packages]) => (
                <FolderRow key={projName} name={projName}>
                    {Object.entries(packages).map(([pkgName, docs]) => (
                        <FolderRow key={pkgName} name={pkgName} depth={1}>
                            <div className="pl-8">
                                {docs.map(doc => (
                                    <FileRow key={doc.id} doc={doc} onClick={onDocumentClick} />
                                ))}
                            </div>
                        </FolderRow>
                    ))}
                </FolderRow>
            ))}
        </div>
    );
};

export default FileExplorer;
