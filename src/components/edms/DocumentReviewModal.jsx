import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ArrowLeftRight, AlertCircle, FileText, Download } from 'lucide-react';
// import { Document, Page, pdfjs } from 'react-pdf'; // Removed for stability
import client from '@/api/client';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import NotingSheetPanel from './NotingSheetPanel';
import { toast } from 'sonner';

// pdfjs.GlobalWorkerOptions.workerSrc = ... // Removed

const DocumentReviewModal = ({ document, onClose, onUpdate }) => {
    const { user, hasPermission } = useAuth();
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [isLoadingPdf, setIsLoadingPdf] = useState(true);

    useEffect(() => {
        let objectUrl = null;
        const fetchPdf = async () => {
            try {
                setIsLoadingPdf(true);
                // Direct Secure Stream from ViewSet
                // No need to ask for a URL first.
                const token = localStorage.getItem('access_token');
                if (!token) throw new Error("No auth token");

                // Construct full URL manually to avoid any client base path issues
                // Endpoint: /api/edms/documents/{pk}/preview/
                const url = `http://localhost:8000/api/edms/documents/${document.id}/preview/`;

                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    console.error("PDF Load Error:", response.status, response.statusText);
                    const errorText = await response.text().catch(() => "Unknown backend error");
                    console.error("Error Body:", errorText);
                    if (response.status === 404) throw new Error("Document file not found (404)");
                    if (response.status === 403) throw new Error("Access denied (403)");
                    throw new Error(`Failed to load document stream: ${response.status} ${response.statusText}`);
                }

                const blob = await response.blob();
                objectUrl = URL.createObjectURL(blob);
                setPdfUrl(objectUrl);
            } catch (err) {
                console.error("Failed to load secure PDF", err);
                toast.error(err.message || "Could not load document preview");
            } finally {
                setIsLoadingPdf(false);
            }
        };
        fetchPdf();

        // Cleanup
        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [document]);

    const handleAction = async (action, remarks) => {
        try {
            await client.post(`/edms/documents/${document.id}/${action}/`, { remarks });
            toast.success(`Document ${action}ed successfully`);
            onUpdate();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.error || `Failed to ${action} document`);
        }
    };

    const handleAddNoting = async (text) => {
        // Technically adding a noting is usually part of a transition or just a comment.
        // If we want just a comment without status change, we need an endpoint for it.
        // But per requirements, "Notings" track history.
        // Assuming current backend only supports notings via status transitions? 
        // Or we should add a separate 'add_noting' endpoint.
        // For now, let's treat it as a clarification request if user is approver?
        // Or just a pure noting log.
        // Let's assume we implement a `notings/` endpoint on the ViewSet if needed.
        // But for this MVP, let's assume notings are tied to actions for "Ruling".
        // If non-ruling, maybe we skip for now or stick to actions.

        toast.info("For this version, please use the Action buttons (Approve/Reject) to add ruling remarks.");
    };

    if (typeof document === 'undefined' || !document.body) return null;

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-xl w-full max-w-[95vw] h-[90vh] flex flex-col overflow-hidden shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                                <FileText size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">{document?.title}</h2>
                                <div className="flex gap-4 text-sm text-slate-500">
                                    <span className="font-mono">ID: {document.id.substring(0, 8)}</span>
                                    <span>v{document.current_version}</span>
                                    <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-xs font-bold uppercase">{document.status}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="outline" size="sm">
                                <Download size={16} className="mr-2" /> Download
                            </Button>
                            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X size={24} className="text-slate-500" />
                            </button>
                        </div>
                    </div>

                    {/* Split View */}
                    <div className="flex-1 flex overflow-hidden">
                        {/* LEFT: PDF Viewer */}
                        <div className="flex-1 bg-slate-500 relative flex flex-col">
                            {/* Toolbar */}

                            <div className="flex-1 overflow-auto flex justify-center p-8 custom-scrollbar">
                                {isLoadingPdf ? (
                                    <div className="text-white flex items-center justify-center h-full">Loading Secure Preview...</div>
                                ) : (
                                    <iframe
                                        src={`${pdfUrl}#toolbar=0`}
                                        className="w-full h-full border-none bg-white"
                                        title="Document Preview"
                                    />
                                )}
                            </div>
                        </div>

                        {/* RIGHT: Noting Sheet */}
                        <div className="w-[400px] flex-shrink-0 bg-white z-20 shadow-[-5px_0_15px_-5px_rgb(0,0,0,0.1)]">
                            <NotingSheetPanel
                                notings={document.notings || []}
                                onAddNoting={handleAddNoting}
                                canAddNoting={false} // Only via actions for now
                            />
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center">
                        <div className="text-xs text-slate-400 font-mono">
                            SHA-256: {document.file_hash}
                        </div>

                        <div className="flex gap-3">
                            {/* Dynamic Actions based on Roles & Status */}
                            {user?.role === 'EPC_Contractor' && document.status === 'DRAFT' && (
                                <Button onClick={() => handleAction('submit', 'Submitted for review')}>
                                    Submit for Review <ArrowLeftRight size={16} className="ml-2" />
                                </Button>
                            )}

                            {(user?.role === 'PMNC_Team' || user?.role === 'SPV_Official') && document.status === 'SUBMITTED' && (
                                <Button onClick={() => handleAction('request_clarification', 'Please clarify')} variant="outline" className="border-amber-500 text-amber-600 hover:bg-amber-50">
                                    <AlertCircle size={16} className="mr-2" /> Request Clarification
                                </Button>
                            )}

                            {(user?.role === 'PMNC_Team' || user?.role === 'SPV_Official') && (document.status === 'SUBMITTED' || document.status === 'UNDER_REVIEW') && (
                                <>
                                    <Button onClick={() => handleAction('reject', 'Rejected')} variant="danger">
                                        <X size={16} className="mr-2" /> Reject
                                    </Button>
                                    <Button onClick={() => handleAction('approve', 'Approved')} variant="success" className="bg-green-600 hover:bg-green-700 text-white">
                                        <Check size={16} className="mr-2" /> Approve
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
};

export default DocumentReviewModal;
