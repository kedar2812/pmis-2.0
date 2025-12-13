import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Send, User } from 'lucide-react';
import Button from '@/components/ui/Button';

const NotingSheetPanel = ({ notings, onAddNoting, canAddNoting }) => {
    const { user } = useAuth();
    const [remark, setRemark] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (remark.trim()) {
            onAddNoting(remark);
            setRemark('');
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 border-l border-slate-200">
            {/* Header */}
            <div className="p-4 bg-white border-b border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800">Noting Sheet</h3>
                <p className="text-xs text-slate-500">Official Record of Remarks</p>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {notings.length === 0 ? (
                    <div className="text-center text-slate-400 py-8 text-sm italic">
                        No notings yet. Start the discussion.
                    </div>
                ) : (
                    notings.map((note) => (
                        <div key={note.id} className={`flex gap-3 ${note.user === user?.username ? 'flex-row-reverse' : ''}`}>
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 border border-slate-300">
                                <User size={14} />
                            </div>
                            <div className={`max-w-[85%] space-y-1 ${note.user === user?.username ? 'items-end' : ''} flex flex-col`}>
                                <div className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${note.is_ruling
                                        ? 'bg-amber-50 border border-amber-200 text-amber-900 rounded-tr-none'
                                        : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                                    }`}>
                                    {note.remark_text}
                                </div>
                                <div className="text-[10px] text-slate-400 flex gap-2 place-items-center px-1">
                                    <span className="font-semibold text-slate-600">{note.user_name || note.user}</span>
                                    <span>•</span>
                                    <span className="uppercase tracking-wide">{note.role}</span>
                                    <span>•</span>
                                    <span>{new Date(note.timestamp).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Input */}
            {canAddNoting && (
                <div className="p-4 bg-white border-t border-slate-200">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <textarea
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                            placeholder="Write an official remark..."
                            className="flex-1 p-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none h-20"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e);
                                }
                            }}
                        />
                        <Button type="submit" disabled={!remark.trim()} size="icon" className="h-20 w-12 self-end">
                            <Send size={18} />
                        </Button>
                    </form>
                    <p className="text-[10px] text-slate-400 mt-2 text-center">
                        <span className="font-bold text-slate-500">Note:</span> Remarks are immutable and become part of the permanent record.
                    </p>
                </div>
            )}
        </div>
    );
};

export default NotingSheetPanel;
