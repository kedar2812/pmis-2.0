// Toast provider wrapper for Sonner
import { Toaster } from 'sonner';

export const ToastProvider = () => {
  return (
    <Toaster
      position="top-right"
      expand={true}
      richColors
      closeButton
      toastOptions={{
        style: {
          background: '#fff',
          color: '#1f2937',
          border: '1px solid #e5e7eb',
        },
      }}
    />
  );
};






