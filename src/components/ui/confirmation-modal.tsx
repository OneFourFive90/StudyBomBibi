"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface ConfirmationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: "info" | "destructive"; // Style variant
  type?: "alert" | "confirm"; // Alert has only OK button
}

export function ConfirmationModal({
  isOpen,
  onOpenChange,
  title = "Notification",
  message,
  confirmText = "OK",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  variant = "info",
  type = "confirm",
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="bg-background border rounded-lg shadow-lg w-full max-w-sm p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex flex-col gap-2">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          <p className="text-muted-foreground text-sm">{message}</p>
        </div>
        
        <div className="flex justify-end gap-2 mt-2">
          {type === "confirm" && (
            <Button variant="outline" onClick={handleCancel}>
              {cancelText}
            </Button>
          )}
          <Button 
            variant={variant === "destructive" ? "destructive" : "default"} 
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
