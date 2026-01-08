import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    X,
    ArrowRight,
    FileText,
    Users,
    FolderOpen,
    Calendar,
    MessageSquare,
    Building2,
    LayoutDashboard,
    Clock,
    Filter,
    Command
} from 'lucide-react';
import SearchModal from './SearchModal';

/**
 * GlobalSearchBar - Main search component for the header
 * 
 * Features:
 * - Full search bar on desktop, icon on mobile
 * - Opens SearchModal on focus/click
 * - Keyboard shortcut: Ctrl+K (Windows) / Cmd+K (Mac)
 * - Responsive design matching the app's glassmorphism UI
 * - Uses React Portal to render modal outside header hierarchy
 */
const GlobalSearchBar = ({ isDesktop = true }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    // Global keyboard shortcut handler
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl+K (Windows) or Cmd+K (Mac)
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsModalOpen(true);
            }
            // Escape to close
            if (e.key === 'Escape' && isModalOpen) {
                setIsModalOpen(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isModalOpen]);

    const handleSearchBarClick = useCallback(() => {
        setIsModalOpen(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setIsModalOpen(false);
    }, []);

    const handleResultSelect = useCallback((result) => {
        setIsModalOpen(false);
        if (result.path) {
            navigate(result.path);
        }
        if (result.action) {
            result.action();
        }
    }, [navigate]);

    // Render modal via Portal to document.body (outside header hierarchy)
    const renderModal = () => {
        if (!isModalOpen) return null;

        return createPortal(
            <AnimatePresence>
                <SearchModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onResultSelect={handleResultSelect}
                />
            </AnimatePresence>,
            document.body
        );
    };

    // Desktop: Full search bar
    if (isDesktop) {
        return (
            <>
                <motion.div
                    className="relative flex-1 max-w-xl mx-4"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <div
                        onClick={handleSearchBarClick}
                        className={`
              flex items-center gap-3 px-4 py-2.5 
              bg-slate-50/80 hover:bg-slate-100/80
              border border-slate-200/60 hover:border-slate-300/80
              rounded-xl cursor-text
              transition-all duration-200 ease-out
              group
              ${isFocused ? 'ring-2 ring-primary-500/20 border-primary-400/60' : ''}
            `}
                    >
                        <Search
                            size={18}
                            className="text-slate-400 group-hover:text-slate-500 transition-colors"
                        />
                        <span className="text-slate-400 text-sm flex-1 select-none">
                            Search anything...
                        </span>
                        <div className="flex items-center gap-1 px-2 py-1 bg-white/80 rounded-md border border-slate-200/60">
                            <Command size={12} className="text-slate-400" />
                            <span className="text-xs text-slate-400 font-medium">K</span>
                        </div>
                    </div>
                </motion.div>

                {renderModal()}
            </>
        );
    }

    // Mobile: Search icon button
    return (
        <>
            <motion.button
                onClick={handleSearchBarClick}
                className="p-2 rounded-xl hover:bg-slate-100/60 transition-all duration-200 hover:scale-105 group"
                whileTap={{ scale: 0.95 }}
                title="Search (Ctrl+K)"
            >
                <Search
                    size={20}
                    className="text-slate-500 group-hover:text-primary-600 transition-colors"
                />
            </motion.button>

            {renderModal()}
        </>
    );
};

export default GlobalSearchBar;

