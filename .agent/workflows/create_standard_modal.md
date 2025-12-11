---
description: How to create a new modal component or refactor an existing one to follow the standard closing behavior.
---

# Standard Modal Implementation Workflow

This workflow ensures all modal windows (pop-ups) in the application behave consistently:
1.  **Backdrop Click**: Must NOT close the modal.
2.  **Escape Key**: Must close the modal.
3.  **X Button**: Must close the modal.
4.  **Z-Index**: Should use `z-[50]` or `z-[60]` (for nested), avoiding arbitrarily high values like `z-[9999]`.

## Steps

### 1. Import Dependencies
In your modal component file:
```javascript
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useModalClose } from '@/hooks/useModalClose'; // Custom hook
```

### 2. Implement the Hook
Inside your component:
```javascript
export const MyModal = ({ isOpen, onClose }) => {
  // Use the standard hook for Escape key closing
  // 3rd argument is optional: true to block closing (e.g. isSubmitting)
  useModalClose(isOpen, onClose); 

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        // Standard backdrop classes
        // IMPORTANT: No onClick={onClose} here!
        className="fixed inset-0 z-[50] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-lg shadow-xl w-full max-w-lg"
            onClick={(e) => e.stopPropagation()} // Prevent clicks inside modal from validly bubbling if we had a listener
        >
             {/* Header */}
             <div className="flex justify-between items-center p-4 border-b">
                <h2 className="text-lg font-bold">Modal Title</h2>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
                    <X size={20} />
                </button>
             </div>
             
             {/* Content */}
             <div className="p-6">
                {/* ... */}
             </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
```

### 3. Verification
- Verify clicking the backdrop (dark area) does **NOT** close the modal.
- Verify pressing `Esc` key **does** close the modal.
- Verify clicking the 'X' button **does** close the modal.
