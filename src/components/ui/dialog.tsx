"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;
const DialogTitle = DialogPrimitive.Title;
const DialogDescription = DialogPrimitive.Description;

function DialogOverlay(
  props: React.ComponentProps<typeof DialogPrimitive.Overlay>,
) {
  const reduceMotion = useReducedMotion();
  return (
    <DialogPrimitive.Overlay asChild {...props}>
      <motion.div
        className="fixed inset-0 z-[60] bg-[color-mix(in_srgb,var(--ink)_48%,transparent)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0.01 : 0.2 }}
      />
    </DialogPrimitive.Overlay>
  );
}

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  const reduceMotion = useReducedMotion();
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content asChild {...props}>
        <motion.div
          dir="rtl"
          className={cx(
            "fixed left-1/2 top-1/2 z-[70] w-[min(32rem,calc(100vw-48px))] max-h-[min(90vh,40rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[20px] border border-[var(--line)] bg-[var(--white)] p-6 text-[var(--ink)] shadow-[var(--shadow)]",
            className,
          )}
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.98 }}
          transition={{ duration: reduceMotion ? 0.01 : 0.22 }}
        >
          {children}
          <DialogPrimitive.Close
            className="icon-button absolute top-4 end-4"
            aria-label="إغلاق النافذة"
          >
            <X size={18} />
          </DialogPrimitive.Close>
        </motion.div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx("mb-4 flex flex-col gap-2 pe-10", className)}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "mt-6 flex flex-wrap items-center justify-end gap-3",
        className,
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
