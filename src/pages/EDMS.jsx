import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import FileExplorer from '@/components/edms/FileExplorer';
import DocumentReviewModal from '@/components/edms/DocumentReviewModal';
import UploadDrawer from '@/components/edms/UploadDrawer';
import Button from '@/components/ui/Button';
import { Plus, Search, Filter } from 'lucide-react';
import client from '@/api/client';
import { toast } from 'sonner';

const EDMS = () => {
    const { user, hasPermission } = useAuth();
    const [documents, setDocuments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDoc, setSelectedDoc] = useState(null); // For Review Modal
    const [showUpload, setShowUpload] = useState(false);

    // Fetch Documents
    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        setIsLoading(true);
        try {
            const res = await client.get('/edms/documents/');
            setDocuments(res.data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load documents");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDocumentClick = (doc) => {
        setSelectedDoc(doc);
    };

    return (
        <div className="p-6 h-[calc(100vh-4rem)] flex flex-col gap-6">
            {/* Header / Actions */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Document Management</h1>
                    <p className="text-slate-500 text-sm">Govt. System of Record</p>
                </div>

                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Search by Title, Contract No..."
                        />
                    </div>

                    <Button variant="outline" onClick={() => { }}>
                        <Filter size={18} className="mr-2" /> Filter
                    </Button>

                    {hasPermission('edms:upload') && (
                        <Button onClick={() => setShowUpload(true)}>
                            <Plus size={18} className="mr-2" /> Upload Document
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Content Area - File Explorer */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <FileExplorer
                    documents={documents}
                    isLoading={isLoading}
                    onDocumentClick={handleDocumentClick}
                />
            </div>

            {/* Modals */}
            <AnimatePresence>
                {selectedDoc && (
                    <DocumentReviewModal
                        document={selectedDoc}
                        onClose={() => setSelectedDoc(null)}
                        onUpdate={() => {
                            fetchDocuments();
                            setSelectedDoc(null);
                        }}
                    />
                )}
            </AnimatePresence>

            <UploadDrawer
                isOpen={showUpload}
                onClose={() => setShowUpload(false)}
                onSuccess={() => {
                    setShowUpload(false);
                    fetchDocuments();
                }}
            />
        </div>
    );
};

export default EDMS;
