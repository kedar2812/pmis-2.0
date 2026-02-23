// Toast provider wrapper for Sonner with enhanced beautiful styling
import { Toaster, toast } from 'sonner';
import { CheckCircle2, AlertTriangle, XCircle, Info, Loader2 } from 'lucide-react';

/**
 * ToastProvider Component
 * 
 * Enhanced Sonner toast provider with premium glassmorphic styling inside application bounds.
 */
export const ToastProvider = () => {
  return (
    <Toaster
      position="top-right"
      expand={true}
      closeButton
      duration={4000}
      theme="system"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: 'group relative flex w-full md:w-[360px] items-start gap-4 rounded-2xl border border-app-subtle bg-app-card/95 backdrop-blur-xl p-4 shadow-glass dark:shadow-2xl font-sans transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none',
          title: 'text-sm font-semibold text-app-heading',
          description: 'text-xs text-app-muted mt-1 leading-relaxed',
          content: 'flex-1 pr-6', /* Adds padding to prevent text overlap with close button */
          icon: 'mt-0.5 flex-shrink-0 flex items-center justify-center p-1.5 rounded-full',
          success: 'border-l-[6px] border-l-emerald-500 [&>[data-icon]]:bg-emerald-100/70 dark:[&>[data-icon]]:bg-emerald-900/40 [&>[data-icon]]:text-emerald-600 dark:[&>[data-icon]]:text-emerald-400',
          error: 'border-l-[6px] border-l-rose-500 [&>[data-icon]]:bg-rose-100/70 dark:[&>[data-icon]]:bg-rose-900/40 [&>[data-icon]]:text-rose-600 dark:[&>[data-icon]]:text-rose-400',
          warning: 'border-l-[6px] border-l-amber-500 [&>[data-icon]]:bg-amber-100/70 dark:[&>[data-icon]]:bg-amber-900/40 [&>[data-icon]]:text-amber-600 dark:[&>[data-icon]]:text-amber-400',
          info: 'border-l-[6px] border-l-blue-500 [&>[data-icon]]:bg-blue-100/70 dark:[&>[data-icon]]:bg-blue-900/40 [&>[data-icon]]:text-blue-600 dark:[&>[data-icon]]:text-blue-400',
          loader: 'border-l-[6px] border-l-primary-500 [&>[data-icon]]:bg-primary-100/70 dark:[&>[data-icon]]:bg-primary-900/40 [&>[data-icon]]:text-primary-600 dark:[&>[data-icon]]:text-primary-400',
          closeButton: 'opacity-0 group-hover:opacity-100 absolute right-2 top-2 rounded-lg p-1.5 text-app-muted hover:bg-app-hover hover:text-app-heading transition-all cursor-pointer z-10',
          actionButton: 'mt-3 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors',
          cancelButton: 'mt-3 rounded-lg bg-app-surface px-3 py-1.5 text-xs font-semibold text-app-text border border-app-subtle hover:bg-app-hover transition-colors',
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
      icon: <CheckCircle2 className="w-5 h-5" />,
    });
  },

  error: (message, description) => {
    toast.error(message, {
      description,
      icon: <XCircle className="w-5 h-5" />,
      duration: 6000,
    });
  },

  warning: (message, description) => {
    toast.warning(message, {
      description,
      icon: <AlertTriangle className="w-5 h-5" />,
    });
  },

  info: (message, description) => {
    toast.info(message, {
      description,
      icon: <Info className="w-5 h-5" />,
    });
  },

  loading: (message) => {
    return toast.loading(message, {
      icon: <Loader2 className="w-5 h-5 animate-spin" />,
    });
  },

  promise: (promise, messages) => {
    return toast.promise(promise, {
      loading: messages.loading || 'Processing...',
      success: messages.success || 'Successfully completed',
      error: messages.error || 'Operation failed',
    });
  },

  dismiss: (id) => {
    toast.dismiss(id);
  },

  dismissAll: () => {
    toast.dismiss();
  },
};



