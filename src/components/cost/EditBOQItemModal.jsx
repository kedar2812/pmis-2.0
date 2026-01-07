import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Key, FileText, Ruler, Calculator, IndianRupee } from 'lucide-react';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';

const EditBOQItemModal = ({ isOpen, onClose, item, onSave }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        item_code: '',
        description: '',
        uom: '',
        quantity: '',
        rate: ''
    });

    useEffect(() => {
        if (item) {
            setFormData({
                item_code: item.item_code || '',
                description: item.description || '',
                uom: item.uom || '',
                quantity: item.quantity || '',
                rate: item.rate || ''
            });
        }
    }, [item]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await onSave(item.id, formData);
            toast.success('BOQ Item updated successfully');
            onClose();
        } catch (error) {
            console.error('Update failed:', error);
            toast.error('Failed to update item');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
            >
                <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Edit2 className="w-5 h-5 text-primary-600" />
                        Edit BOQ Item
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-lg">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                            Item Code
                        </label>
                        <div className="relative">
                            <Key className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input
                                required
                                name="item_code"
                                value={formData.item_code}
                                onChange={handleChange}
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-mono"
                                placeholder="e.g. 1.1.2"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                            Description
                        </label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                            <textarea
                                required
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={3}
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                                placeholder="Enter item description..."
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                                UOM
                            </label>
                            <div className="relative">
                                <Ruler className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <input
                                    required
                                    name="uom"
                                    value={formData.uom}
                                    onChange={handleChange}
                                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                                    placeholder="e.g. Cum"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                                Quantity
                            </label>
                            <div className="relative">
                                <Calculator className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <input
                                    required
                                    type="number"
                                    name="quantity"
                                    value={formData.quantity}
                                    onChange={handleChange}
                                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                            Rate
                        </label>
                        <div className="relative">
                            <IndianRupee className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input
                                required
                                type="number"
                                name="rate"
                                value={formData.rate}
                                onChange={handleChange}
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </motion.div>
        </div>,
        document.body
    );
};

// Simple Edit Icon wrapper cause lucide import issues sometimes
const Edit2 = ({ ...props }) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
);

export default EditBOQItemModal;
