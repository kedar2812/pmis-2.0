// Toast provider wrapper for Sonner with enhanced styling
import { Toaster, toast } from 'sonner';
import { CheckCircle2, AlertTriangle, XCircle, Info, Loader2 } from 'lucide-react';

/**
 * ToastProvider Component
 * 
 * Enhanced Sonner toast provider with premium styling.
 */
export const ToastProvider = () => {
  return (
    <Toaster
      position="top-right"
      expand={true}
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        style: {
          background: '#fff',
          color: '#1f2937',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          padding: '16px',
        },
        classNames: {
          success: 'border-l-4 border-l-green-500',
          error: 'border-l-4 border-l-red-500',
          warning: 'border-l-4 border-l-amber-500',
          info: 'border-l-4 border-l-blue-500',
        },
      }}
    />
  );
};

/**
 * Toast helper functions
 * 
 * Convenience functions for showing different types of toasts.
 */
export const showToast = {
  success: (message, description) => {
    toast.success(message, {
      description,
      icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
    });
  },

  error: (message, description) => {
    toast.error(message, {
      description,
      icon: <XCircle className="w-5 h-5 text-red-600" />,
      duration: 6000,
    });
  },

  warning: (message, description) => {
    toast.warning(message, {
      description,
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
    });
  },

  info: (message, description) => {
    toast.info(message, {
      description,
      icon: <Info className="w-5 h-5 text-blue-600" />,
    });
  },

  loading: (message) => {
    return toast.loading(message, {
      icon: <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />,
    });
  },

  promise: (promise, messages) => {
    return toast.promise(promise, {
      loading: messages.loading || 'Loading...',
      success: messages.success || 'Success!',
      error: messages.error || 'Something went wrong',
    });
  },

  dismiss: (id) => {
    toast.dismiss(id);
  },

  dismissAll: () => {
    toast.dismiss();
  },
};



