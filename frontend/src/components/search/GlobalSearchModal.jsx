import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, X, Loader2, Briefcase, FileText, MessageSquare,
    Users, Building2, CalendarCheck, Receipt, ArrowRight, Command
} from 'lucide-react';
import { globalSearch } from '@/api/services/searchService';

const TYPE_CONFIG = {
    Project: { icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    'RA Bill': { icon: Receipt, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    Thread: { icon: MessageSquare, color: 'text-pink-500', bg: 'bg-pink-500/10' },
    Document: { icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    Contractor: { icon: Building2, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    User: { icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    Task: { icon: CalendarCheck, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
};
const DEFAULT_CONFIG = { icon: FileText, color: 'text-slate-500', bg: 'bg-slate-500/10' };

function useDebounce(value, delay) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}

/* ── Easing: custom cubic-bezier for that buttery Apple feel ─────────── */
const smoothEase = [0.16, 1, 0.3, 1]; // ease-out-expo

const GlobalSearchModal = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const inputRef = useRef(null);

    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const debouncedQuery = useDebounce(query, 300);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setResults([]);
            setSelectedIndex(0);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => inputRef.current?.focus());
            });
        }
    }, [isOpen]);

    useEffect(() => {
        if (!debouncedQuery || debouncedQuery.length < 2) {
            setResults([]);
            setIsLoading(false);
            return;
        }
        let cancelled = false;
        setIsLoading(true);
        globalSearch(debouncedQuery).then((data) => {
            if (!cancelled) { setResults(data); setSelectedIndex(0); setIsLoading(false); }
        });
        return () => { cancelled = true; };
    }, [debouncedQuery]);

    useEffect(() => {
        if (query && query.length >= 2) setIsLoading(true);
    }, [query]);

    const grouped = useMemo(() => {
        const map = new Map();
        results.forEach((r) => { if (!map.has(r.type)) map.set(r.type, []); map.get(r.type).push(r); });
        return map;
    }, [results]);

    const flatList = useMemo(() => results, [results]);

    const handleSelect = useCallback((result) => {
        if (result?.url) { navigate(result.url); onClose(); }
    }, [navigate, onClose]);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => {
            switch (e.key) {
                case 'ArrowDown': e.preventDefault(); setSelectedIndex((p) => Math.min(p + 1, flatList.length - 1)); break;
                case 'ArrowUp': e.preventDefault(); setSelectedIndex((p) => Math.max(p - 1, 0)); break;
                case 'Enter': e.preventDefault(); if (flatList[selectedIndex]) handleSelect(flatList[selectedIndex]); break;
                case 'Escape': e.preventDefault(); onClose(); break;
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, selectedIndex, flatList, handleSelect, onClose]);

    useEffect(() => {
        const el = document.getElementById(`sr-${selectedIndex}`);
        if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, [selectedIndex]);

    let ri = 0;

    return (
        <AnimatePresence>
            {isOpen && (
                /* Full-screen container */
                <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh] px-4">
                    {/* ── Backdrop ─────────────────────────────────────── */}
                    <motion.div
                        className="absolute inset-0 bg-black/50 dark:bg-black/70"
                        style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
                        onClick={onClose}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25, ease: smoothEase }}
                    />

                    {/* ── Modal ────────────────────────────────────────── */}
                    <motion.div
                        className="relative w-full max-w-[640px] rounded-2xl shadow-2xl overflow-hidden
                            bg-white dark:bg-neutral-900
                            border border-gray-200/80 dark:border-neutral-600
                            will-change-transform"
                        initial={{ opacity: 0, scale: 0.97, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: 8 }}
                        transition={{ duration: 0.2, ease: smoothEase }}
                    >
                        {/* Input */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-neutral-700">
                            <Search size={18} className="text-gray-400 dark:text-neutral-400 flex-shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search projects, bills, documents, users..."
                                className="flex-1 bg-transparent text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none"
                                autoComplete="off"
                                spellCheck="false"
                            />
                            {isLoading && <Loader2 size={16} className="text-primary-500 animate-spin flex-shrink-0" />}
                            {query && !isLoading && (
                                <button onClick={() => setQuery('')} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors">
                                    <X size={14} className="text-gray-400 dark:text-neutral-500" />
                                </button>
                            )}
                        </div>

                        {/* Results area */}
                        <div className="max-h-[48vh] overflow-y-auto overscroll-contain">
                            {isLoading && results.length === 0 && (
                                <div className="p-3 space-y-2.5">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="flex items-center gap-3 animate-pulse px-2">
                                            <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-neutral-700" />
                                            <div className="flex-1 space-y-1.5">
                                                <div className="h-3 w-3/5 rounded bg-gray-200 dark:bg-neutral-700" />
                                                <div className="h-2.5 w-2/5 rounded bg-gray-100 dark:bg-neutral-800" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!isLoading && results.length > 0 && (
                                <div className="py-1.5">
                                    {[...grouped.entries()].map(([type, items]) => (
                                        <div key={type}>
                                            <div className="px-4 pt-2.5 pb-1">
                                                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-neutral-500">{type}s</span>
                                            </div>
                                            {items.map((result) => {
                                                const idx = ri++;
                                                const cfg = TYPE_CONFIG[result.type] || DEFAULT_CONFIG;
                                                const Icon = cfg.icon;
                                                const sel = idx === selectedIndex;
                                                return (
                                                    <button
                                                        key={result.id}
                                                        id={`sr-${idx}`}
                                                        onClick={() => handleSelect(result)}
                                                        onMouseEnter={() => setSelectedIndex(idx)}
                                                        className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors duration-75 cursor-pointer
                                                            ${sel ? 'bg-primary-50 dark:bg-primary-900/25' : 'hover:bg-gray-50 dark:hover:bg-neutral-800/50'}`}
                                                    >
                                                        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                                                            <Icon size={15} className={cfg.color} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-sm font-medium truncate ${sel ? 'text-primary-700 dark:text-primary-200' : 'text-gray-800 dark:text-gray-100'}`}>{result.title}</p>
                                                            {result.subtitle && <p className={`text-xs truncate mt-0.5 ${sel ? 'text-primary-500 dark:text-primary-300/80' : 'text-gray-500 dark:text-neutral-400'}`}>{result.subtitle}</p>}
                                                        </div>
                                                        <ArrowRight size={13} className={`flex-shrink-0 transition-opacity duration-75 ${sel ? 'opacity-60 text-primary-500 dark:text-primary-400' : 'opacity-0'}`} />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!isLoading && debouncedQuery && debouncedQuery.length >= 2 && results.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-10 px-4">
                                    <Search size={28} className="text-gray-300 dark:text-neutral-600 mb-2" />
                                    <p className="text-sm text-gray-500 dark:text-neutral-400">No results found</p>
                                    <p className="text-xs text-gray-400 dark:text-neutral-500 mt-0.5">Try a different keyword</p>
                                </div>
                            )}

                            {!query && (
                                <div className="flex flex-col items-center justify-center py-10 px-4">
                                    <Command size={28} className="text-gray-300 dark:text-neutral-600 mb-2" />
                                    <p className="text-sm text-gray-400 dark:text-neutral-500">Start typing to search across all modules</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-neutral-700 text-[10px] text-gray-400 dark:text-neutral-500">
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 font-mono">↑↓</kbd> Navigate</span>
                                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 font-mono">↵</kbd> Open</span>
                                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 font-mono">Esc</kbd> Close</span>
                            </div>
                            <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default GlobalSearchModal;
