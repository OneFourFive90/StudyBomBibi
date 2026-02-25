import { useCallback, useEffect, useRef, useState } from "react";

export type ToastVariant = "success" | "error" | "loading";

export interface ToastMessage {
  message: string;
  variant: ToastVariant;
}

interface UseToastMessageOptions {
  durationMs?: number;
}

export function useToastMessage(options?: UseToastMessageOptions) {
  const durationMs = options?.durationMs ?? 3000;
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
    (message: string, variant: ToastVariant) => {
      setToast({ message, variant });
      clearExistingTimeout();

      if (variant !== "loading") {
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
