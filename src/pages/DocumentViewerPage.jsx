/**
 * DocumentViewerPage - Split-screen document viewer with Noting Sheet
 * 
 * Left Pane: PDF/Image viewer
 * Right Pane: Noting Sheet panel
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Download, Printer, ZoomIn, ZoomOut, RotateCw,
    ChevronLeft, ChevronRight, Maximize2, Minimize2,
    BookOpen, Plus, FileText, AlertCircle, Loader2, X
} from 'lucide-react';
import client from '@/api/client';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import NotingPanel from '@/components/edms/NotingPanel';
import AddNoteModal from '@/components/edms/AddNoteModal';
import * as XLSX from 'xlsx';

const DocumentViewerPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [document, setDocument] = useState(null);
    const [notings, setNotings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fileUrl, setFileUrl] = useState(null);
    const [fileType, setFileType] = useState('unknown'); // 'pdf', 'image', 'video', 'excel', 'unknown'
    const [excelData, setExcelData] = useState(null); // For excel parsing
    const [showAddNote, setShowAddNote] = useState(false);
    const [panelWidth, setPanelWidth] = useState(35); // Percentage
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [zoom, setZoom] = useState(100);

    // Get user info for role-based permissions
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role = user?.role || 'Admin'; // Fallback to Admin for dev if missing

    // Add Admin/SuperUser to allowed roles
    const allowedRoles = ['SPV_Official', 'NICDC_HQ', 'PMNC_Team', 'Admin', 'SuperUser'];
    const rulingRoles = ['SPV_Official', 'NICDC_HQ', 'Admin', 'SuperUser'];

    const canAddNoting = allowedRoles.includes(role);
    const canAddRuling = rulingRoles.includes(role);

    useEffect(() => {
        fetchDocument();
        fetchNotings();
    }, [id]);

    const fetchDocument = async () => {
        try {
            const res = await client.get(`/edms/documents/${id}/`);
            setDocument(res.data);

            if (res.data.current_version) {
                const docVersion = res.data.current_version;
                const mimeType = docVersion.mime_type || '';

                // Determine File Type
                let type = 'unknown';
                if (mimeType.includes('pdf')) type = 'pdf';
                else if (mimeType.match(/image\/(jpeg|png|gif|webp)/)) type = 'image';
                else if (mimeType.match(/video\/(mp4|webm|ogg)/)) type = 'video';
                else if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv') || docVersion.file_name.endsWith('.xlsx') || docVersion.file_name.endsWith('.xls') || docVersion.file_name.endsWith('.csv')) type = 'excel';

                setFileType(type);

                // Fetch File content
                const downloadRes = await client.get(`/edms/documents/${id}/download/`, {
                    responseType: 'blob'
                });

                if (type === 'excel') {
                    // Parse Excel
                    const arrayBuffer = await downloadRes.data.arrayBuffer();
                    const workbook = XLSX.read(arrayBuffer);
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                    setExcelData(jsonData);
                    setFileUrl(null); // No URL needed specifically unless we want to download
                } else {
                    // Create URL for media/pdf
                    const url = URL.createObjectURL(downloadRes.data);
                    setFileUrl(url);
                }
            }
        } catch (error) {
            console.error('Failed to fetch document:', error);
            toast.error('Failed to load document');
        } finally {
            setLoading(false);
        }
    };

    const fetchNotings = async () => {
        try {
            const res = await client.get(`/edms/noting-sheets/?document=${id}`);
            setNotings(res.data);
        } catch (error) {
            console.error('Failed to fetch notings:', error);
        }
    };

    const handleDownload = async () => {
        try {
            const res = await client.get(`/edms/documents/${id}/download/`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(res.data);
            const a = window.document.createElement('a');
            a.href = url;
            a.download = document.current_version?.file_name || 'document';
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success('Download started');
        } catch (error) {
            toast.error('Failed to download');
        }
    };

    const handleExportNotingSheet = async () => {
        try {
            window.open(`/api/edms/noting-sheets/export_pdf/?document=${id}`, '_blank');
            toast.success('Noting sheet export started');
        } catch (error) {
            toast.error('Failed to export noting sheet');
        }
    };

    const handleNoteAdded = () => {
        fetchNotings();
        setShowAddNote(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <Loader2 size={48} className="animate-spin text-white" />
            </div>
        );
    }

    if (!document) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
                <AlertCircle size={48} className="mb-4" />
                <h2 className="text-xl font-semibold">Document not found</h2>
                <Button onClick={() => navigate(-1)} className="mt-4">
                    Go Back
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-white font-bold text-xl truncate max-w-md">
                            {document.title}
                        </h1>
                        <p className="text-slate-400 text-sm">
                            {document.document_number || 'No document number'} • v{document.current_version?.version_number || 1}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-all font-medium text-sm"
                    >
                        <Download size={16} />
                        Download PDF
                    </button>
                    <button
                        onClick={handleExportNotingSheet}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-all font-medium text-sm"
                    >
                        <Printer size={16} />
                        Export Notes
                    </button>
                </div>
            </header>

            {/* Main Content - Floating Splite View */}
            <div className="flex-1 flex overflow-hidden px-4 pb-4 gap-4">
                {/* Left Pane - Document Viewer */}
                <div
                    className="flex flex-col bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl"
                    style={{ width: `${100 - panelWidth}%`, transition: 'width 0.3s ease' }}
                >
                    {/* Viewer Toolbar */}
                    <div className="flex items-center justify-between px-6 py-3 bg-slate-800/50 backdrop-blur border-b border-slate-800">
                        <div className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-1 border border-slate-800">
                            <button
                                onClick={() => setZoom(Math.max(25, zoom - 25))}
                                className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition-colors"
                            >
                                <ZoomOut size={16} />
                            </button>
                            <span className="text-slate-300 text-xs font-mono w-12 text-center">{zoom}%</span>
                            <button
                                onClick={() => setZoom(Math.min(300, zoom + 25))}
                                className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition-colors"
                            >
                                <ZoomIn size={16} />
                            </button>
                        </div>

                        {fileType === 'pdf' && (
                            <div className="flex items-center gap-4 text-slate-400 text-sm">
                                <div className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-1 border border-slate-800">
                                    <button
                                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                        className="p-1 hover:bg-slate-700 rounded-md disabled:opacity-30 transition-colors"
                                        disabled={currentPage <= 1}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="text-xs font-medium px-2">
                                        Page {currentPage} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                        className="p-1 hover:bg-slate-700 rounded-md disabled:opacity-30 transition-colors"
                                        disabled={currentPage >= totalPages}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => setPanelWidth(panelWidth > 20 ? 0 : 35)}
                            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                            title={panelWidth > 0 ? 'Maximize Viewer' : 'Show Notes'}
                        >
                            {panelWidth > 0 ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
                        </button>
                    </div>

                    {/* Document Display Content */}
                    <div className="flex-1 overflow-auto p-8 flex items-start justify-center bg-slate-900/50">
                        {fileType === 'pdf' && fileUrl ? (
                            <iframe
                                src={fileUrl}
                                className="bg-white shadow-2xl transition-all duration-300"
                                style={{
                                    width: `${zoom}%`,
                                    height: '100%',
                                    aspectRatio: '1/1.414'
                                }}
                                title="Document Viewer"
                            />
                        ) : fileType === 'image' && fileUrl ? (
                            <img
                                src={fileUrl}
                                alt="Document"
                                className="shadow-2xl object-contain transition-all duration-300"
                                style={{
                                    width: `${zoom}%`,
                                    maxWidth: 'none' // Allow zoom to exceed container
                                }}
                            />
                        ) : fileType === 'video' && fileUrl ? (
                            <div
                                style={{ width: `${zoom}%`, maxWidth: '100%' }}
                                className="shadow-2xl bg-black rounded-lg overflow-hidden"
                            >
                                <video controls className="w-full h-auto">
                                    <source src={fileUrl} />
                                    Your browser does not support the video tag.
                                </video>
                            </div>
                        ) : fileType === 'excel' && excelData ? (
                            <div
                                className="bg-white shadow-2xl overflow-auto w-full transition-all duration-300"
                                style={{
                                    width: `${zoom}%`,
                                    maxWidth: 'none'
                                }}
                            >
                                <table className="w-full border-collapse text-sm text-slate-800">
                                    <tbody>
                                        {excelData.map((row, rowIndex) => (
                                            <tr key={rowIndex} className={rowIndex === 0 ? "bg-slate-100 font-bold border-b border-slate-300" : "border-b border-slate-100 hover:bg-slate-50"}>
                                                {row.map((cell, cellIndex) => (
                                                    <td key={cellIndex} className="p-2 border-r border-slate-200 min-w-[100px] whitespace-nowrap">
                                                        {cell}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
                                <div className="p-6 bg-slate-800/50 rounded-2xl flex flex-col items-center">
                                    <FileText size={48} className="mb-4 opacity-50" />
                                    <h3 className="text-lg font-medium text-slate-300">
                                        Preview not available
                                    </h3>
                                    <p className="text-sm text-slate-500 mb-6 text-center max-w-xs">
                                        This file type ({document?.current_version?.mime_type || 'unknown'}) cannot be previewed directly.
                                    </p>
                                    <button
                                        onClick={handleDownload}
                                        className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary-600 hover:bg-primary-700 text-white font-medium transition-all"
                                    >
                                        <Download size={18} />
                                        Download File
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Pane - Noting Sheet */}
                {panelWidth > 0 && (
                    <motion.div
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 50, opacity: 0 }}
                        className="bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-slate-200"
                        style={{ width: `${panelWidth}%` }}
                    >
                        {/* Panel Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
                                    <BookOpen size={20} />
                                </div>
                                <div>
                                    <h2 className="font-bold text-slate-800">Noting Sheet</h2>
                                    <p className="text-xs text-slate-500">
                                        {notings.filter(n => !n.is_draft).length} official notes
                                    </p>
                                </div>
                            </div>
                            {canAddNoting && (
                                <Button size="sm" onClick={() => setShowAddNote(true)} className="rounded-full px-4 shadow-sm">
                                    <Plus size={16} className="mr-1.5" />
                                    Add Note
                                </Button>
                            )}
                        </div>

                        {/* Noting Panel Content */}
                        <div className="flex-1 overflow-y-auto bg-slate-50/30">
                            <NotingPanel
                                notings={notings}
                                documentId={id}
                                onRefresh={fetchNotings}
                                canAddNoting={canAddNoting}
                                canAddRuling={canAddRuling}
                            />
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Add Note Modal */}
            <AnimatePresence>
                {showAddNote && (
                    <AddNoteModal
                        documentId={id}
                        document={document}
                        onClose={() => setShowAddNote(false)}
                        onSuccess={handleNoteAdded}
                        canAddRuling={canAddRuling}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default DocumentViewerPage;
