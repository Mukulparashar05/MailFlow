import { useState, useCallback, useEffect, useRef } from 'react';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
}

let globalAddToast: ((toast: Omit<ToastMessage, 'id'>) => void) | null = null;

export function useToastSystem() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    globalAddToast = addToast;
    return () => {
      globalAddToast = null;
    };
  }, [addToast]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, removeToast };
}

export function toast(options: Omit<ToastMessage, 'id'>) {
  if (globalAddToast) {
    globalAddToast(options);
  }
}

export function useToast() {
  return {
    success: (title: string, description?: string) =>
      toast({ type: 'success', title, description }),
    error: (title: string, description?: string) =>
      toast({ type: 'error', title, description }),
    info: (title: string, description?: string) =>
      toast({ type: 'info', title, description }),
    warning: (title: string, description?: string) =>
      toast({ type: 'warning', title, description }),
  };
}

export type { ToastMessage };
