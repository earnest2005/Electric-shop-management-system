import React, { createContext, useContext, useState, useCallback } from 'react';
import { 
  CheckCircle2, XCircle, AlertTriangle, Info, X, AlertCircle 
} from 'lucide-react';

const AlertContext = createContext(null);

export function AlertProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Add a toast notification
  const addToast = useCallback((message, type = 'info', title = '') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    const newToast = { id, message, type, title };

    setToasts(prev => [newToast, ...prev].slice(0, 5)); // Keep max 5 toasts

    // Auto dismiss after 3.5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 3500);

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Helper shortcuts
  const toast = useCallback((message, type = 'info', title = '') => {
    return addToast(message, type, title);
  }, [addToast]);

  toast.success = (msg, title = 'Success') => addToast(msg, 'success', title);
  toast.error = (msg, title = 'Error') => addToast(msg, 'error', title);
  toast.warning = (msg, title = 'Warning') => addToast(msg, 'warning', title);
  toast.info = (msg, title = 'Notification') => addToast(msg, 'info', title);

  // Custom stylish confirmation dialog
  const confirm = useCallback(({ 
    title = 'Confirm Action', 
    message = 'Are you sure you want to proceed?', 
    confirmText = 'Confirm', 
    cancelText = 'Cancel', 
    variant = 'danger' 
  }) => {
    return new Promise((resolve) => {
      setConfirmDialog({
        title,
        message,
        confirmText,
        cancelText,
        variant,
        resolve: (val) => {
          setConfirmDialog(null);
          resolve(val);
        }
      });
    });
  }, []);

  return (
    <AlertContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Floating Glassmorphic Toast Notifications Container */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-2xl backdrop-blur-md border transition-all duration-300 transform translate-x-0 animate-in slide-in-from-right-5 flex items-start space-x-3 text-slate-100 ${
              t.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/40 shadow-emerald-500/10'
                : t.type === 'error'
                ? 'bg-rose-950/80 border-rose-500/40 shadow-rose-500/10'
                : t.type === 'warning'
                ? 'bg-amber-950/80 border-amber-500/40 shadow-amber-500/10'
                : 'bg-slate-900/90 border-slate-700/60 shadow-slate-900/50'
            }`}
          >
            {/* Toast Icon */}
            <div className="shrink-0 mt-0.5">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {t.type === 'error' && <XCircle className="w-5 h-5 text-rose-400" />}
              {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-sky-400" />}
            </div>

            {/* Toast Content */}
            <div className="flex-1 pr-2">
              <h5 className={`font-bold text-xs capitalize ${
                t.type === 'success' ? 'text-emerald-400' :
                t.type === 'error' ? 'text-rose-400' :
                t.type === 'warning' ? 'text-amber-400' : 'text-sky-400'
              }`}>
                {t.title || t.type}
              </h5>
              <p className="text-xs text-slate-200 mt-0.5 leading-relaxed font-sans">{t.message}</p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Stylish Confirmation Dialog Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-dark-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-xl shrink-0 ${
                confirmDialog.variant === 'danger'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : confirmDialog.variant === 'warning'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
              }`}>
                {confirmDialog.variant === 'danger' ? (
                  <AlertCircle className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white font-sans">{confirmDialog.title}</h3>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{confirmDialog.message}</p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => confirmDialog.resolve(false)}
                className="px-4 py-2 bg-dark-800 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                {confirmDialog.cancelText}
              </button>
              <button
                type="button"
                onClick={() => confirmDialog.resolve(true)}
                className={`px-4 py-2 font-bold text-xs rounded-xl shadow-lg transition ${
                  confirmDialog.variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                    : confirmDialog.variant === 'warning'
                    ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
                    : 'bg-sky-500 hover:bg-sky-400 text-black shadow-sky-500/20'
                }`}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}
