"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { IconButton } from "./button";
import { CloseIcon } from "./icons";

/* ===========================================================================
   Modals (G1.7) — two primitives on Radix Dialog, which provides the hard
   a11y for free: focus trap, focus restoration to the trigger on close, ESC
   to dismiss, scroll lock, click-outside dismiss, role="dialog" +
   aria-modal, and aria-labelledby/df wired from Title/Description.

   - BottomSheet: bottom-anchored, slides up (Journal filters).
   - CenteredModal: centered + scrim (Profile language / delete).

   Both are configured (title/description/children/footer slots) so every
   modal is consistent and correctly labelled. `ModalClose` is re-exported so
   footer "Cancel"/"Done" actions can dismiss via <ModalClose asChild>.
=========================================================================== */

/** Wrap an action that should dismiss the modal: <ModalClose asChild>…</ModalClose>. */
export const ModalClose = Dialog.Close;

type ModalProps = {
  /** The element that opens the modal (rendered as the Dialog trigger). */
  trigger?: ReactNode;
  /** Accessible name — also the visible header title. */
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Optional action row pinned at the bottom (e.g. Reset / Apply). */
  footer?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

function Chrome({
  title,
  description,
  children,
  footer,
  dragHandle = false,
}: Pick<ModalProps, "title" | "description" | "children" | "footer"> & {
  dragHandle?: boolean;
}) {
  return (
    <>
      <div className={cn("shrink-0 px-5", dragHandle ? "pt-3" : "pt-5")}>
        {dragHandle ? (
          <span
            aria-hidden
            className="mx-auto mb-3 block h-1 w-9 rounded-full bg-hairline"
          />
        ) : null}
        <header className="flex items-start justify-between gap-4 pb-3">
          <div className="flex flex-col gap-1">
            <Dialog.Title className="font-display text-greeting">
              {title}
            </Dialog.Title>
            {description ? (
              <Dialog.Description className="text-helper text-muted">
                {description}
              </Dialog.Description>
            ) : null}
          </div>
          <Dialog.Close asChild>
            <IconButton label="Close" size="sm">
              <CloseIcon className="h-4 w-4" />
            </IconButton>
          </Dialog.Close>
        </header>
      </div>
      <div className="min-h-0 overflow-y-auto px-5 py-1">{children}</div>
      {footer ? (
        <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-hairline p-5 pt-4">
          {footer}
        </footer>
      ) : null}
    </>
  );
}

// Plain helper (not a hook) — forwards only the Dialog.Root state props.
function rootProps({ open, defaultOpen, onOpenChange }: ModalProps) {
  return { open, defaultOpen, onOpenChange };
}

const OVERLAY_CLASS =
  "fixed inset-0 z-50 bg-scrim motion-safe:animate-[stap-fade-in_150ms_ease-out]";

export function CenteredModal(props: ModalProps) {
  const { trigger, title, description, children, footer, className } = props;
  return (
    <Dialog.Root {...rootProps(props)}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Overlay className={OVERLAY_CLASS} />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border-structural bg-surface",
            "motion-safe:animate-[stap-zoom-in_150ms_ease-out]",
            className,
          )}
        >
          <Chrome
            title={title}
            description={description}
            footer={footer}
          >
            {children}
          </Chrome>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function BottomSheet(props: ModalProps) {
  const { trigger, title, description, children, footer, className } = props;
  return (
    <Dialog.Root {...rootProps(props)}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Overlay className={OVERLAY_CLASS} />
        <Dialog.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85vh] w-full max-w-xl flex-col rounded-t-xl border-structural border-b-0 bg-surface",
            "motion-safe:animate-[stap-slide-up_200ms_ease-out]",
            className,
          )}
        >
          <Chrome
            title={title}
            description={description}
            footer={footer}
            dragHandle
          >
            {children}
          </Chrome>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
