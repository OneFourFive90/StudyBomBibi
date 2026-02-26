import { useCallback, useEffect, useRef, useState } from "react";

export type ToastVariant = "success" | "error" | "loading" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline";
}

export interface ToastMessage {
  message: string;
  variant: ToastVariant;
  actions?: ToastAction[];
}

interface UseToastMessageOptions {
  durationMs?: number;
}

interface ShowToastOptions {
  actions?: ToastAction[];
}

export function useToastMessage(options?: UseToastMessageOptions) {
  const durationMs = options?.durationMs ?? 5000;
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearExistingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const clearToast = useCallback(() => {
    setToast(null);
    clearExistingTimeout();
  }, [clearExistingTimeout]);

  const showToast = useCallback(
    (message: string, variant: ToastVariant, options?: ShowToastOptions) => {
      setToast({ message, variant, actions: options?.actions });
      clearExistingTimeout();

      if (variant !== "loading" && !options?.actions?.length) {
        timeoutRef.current = setTimeout(() => {
          setToast(null);
          timeoutRef.current = null;
        }, durationMs);
      }
    },
    [clearExistingTimeout, durationMs]
  );

  const showLoading = useCallback((message: string) => {
    showToast(message, "loading");
  }, [showToast]);

  useEffect(() => {
    return () => {
      clearExistingTimeout();
    };
  }, [clearExistingTimeout]);

  return {
    toast,
    showToast,
    showLoading,
    clearToast,
  };
}
