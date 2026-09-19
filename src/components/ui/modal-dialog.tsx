"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { ReactNode } from "react";

export function ModalDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const y = reduceMotion ? 0 : 8;
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild>
              <motion.div
                className="admin-dialog-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild>
              <motion.div
                className="admin-dialog"
                initial={{ opacity: 0, y }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y }}
                transition={{ duration: 0.22 }}
              >
                <DialogPrimitive.Title className="admin-dialog-title">
                  {title}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description
                  className={description ? "admin-dialog-copy" : "sr-only"}
                >
                  {description || title}
                </DialogPrimitive.Description>
                {children}
                <DialogPrimitive.Close
                  className="icon-button admin-dialog-close"
                  aria-label="إغلاق"
                >
                  <X size={18} />
                </DialogPrimitive.Close>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
