---
description: How to create a new modal component or refactor an existing one to follow the standard closing behavior.
---

# Standard Modal Implementation Pattern

All modal pop-up windows in PMIS must follow this standard pattern for consistency.

## Required Features

1. **createPortal** - Render to `document.body` to escape parent stacking contexts
2. **AnimatePresence + motion.div** - Smooth fade/scale animations
3. **z-[9999]** - Highest z-index for backdrop and content
4. **backdrop-blur-sm** - 6px blur effect on backdrop
5. **ESC key handler** - Close modal on Escape key press
6. **Click outside to close** - Backdrop click closes modal

## Required Imports

```jsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
```

## Standard Modal Template

```jsx
const MyModal = ({ isOpen, onClose, children }) => {
    // ESC key handler
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm"
                    />
                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div 
                            className="bg-white rounded-xl shadow-2xl pointer-events-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header with close button */}
                            <div className="flex justify-between items-center p-4 border-b">
                                <h2 className="text-lg font-bold">Modal Title</h2>
                                <button
                                    onClick={onClose}
                                    className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <X size={18} className="text-slate-500" />
                                </button>
                            </div>
                            {/* Content */}
                            <div className="p-4">
                                {children}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};
```

## Key Rules

| Rule | Implementation |
|------|---------------|
| Backdrop z-index | `z-[9999]` |
| Content z-index | `z-[9999]` |
| Blur effect | `backdrop-blur-sm` (6px) |
| Background opacity | `bg-black/50` or `bg-slate-900/60` |
| Border radius | `rounded-xl` or `rounded-2xl` |
| Shadow | `shadow-2xl` |
| Animation duration | `0.2s` |

## Disable ESC During Loading

If modal has async operations, prevent closing during loading:

```jsx
useEffect(() => {
    const handleEscape = (e) => {
        if (e.key === 'Escape' && isOpen && !loading) {
            onClose();
        }
    };
    // ...
}, [isOpen, onClose, loading]);
```

## Example Modals Following This Pattern

- `MasterFormModal.jsx`
- `DeleteConfirmModal.jsx`
- `CreateProjectModal.jsx`
- `GenerateBillModal.jsx`
- `FundManagement.jsx` (inline modal)
- `Budgeting.jsx` (inline modal)
