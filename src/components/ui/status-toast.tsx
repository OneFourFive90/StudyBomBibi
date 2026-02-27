"use client";

import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { ToastMessage } from "@/hooks/use-toast-message";
import { Button } from "@/components/ui/button";

interface StatusToastProps {
  toast: ToastMessage | null;
  onClose?: () => void;
}

export function StatusToast({ toast, onClose }: StatusToastProps) {
  if (!toast || typeof window === "undefined") return null;

  const hasActions = Boolean(toast.actions?.length);

  return createPortal(
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[min(92vw,560px)] pointer-events-none">
      <div
        className={`px-4 py-2 rounded-md border shadow-md text-sm flex items-center gap-2 pointer-events-auto transition-all ${
          toast.variant === "success"
            ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-900 dark:text-green-300"
            : toast.variant === "loading"
              ? "bg-primary border-primary text-primary-foreground"
              : toast.variant === "info"
                ? "bg-background border-border text-foreground"
              : "bg-destructive border-destructive text-destructive-foreground"
        }`}
      >
        {toast.variant === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
        <span className="flex-1 min-w-0 pr-1">{toast.message}</span>

        {hasActions && (
          <div className="flex items-center gap-2">
            {toast.actions?.map((action) => (
              <Button
                key={action.label}
                type="button"
                size="sm"
                variant={action.variant ?? "default"}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}

        {onClose && toast.variant !== "loading" && !hasActions && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notification"
            className="ml-auto inline-flex items-center justify-center rounded-sm opacity-80 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}
