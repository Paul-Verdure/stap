"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Cta } from "@/components/ui/button";
import { ChevronIcon } from "@/components/ui/icons";
import { CenteredModal, ModalClose } from "@/components/ui/modal";
import { StatusPill } from "@/components/ui/surface";
import { TextInput } from "@/components/ui/text-field";
import { cn } from "@/lib/cn";
import { deleteAccount } from "@/lib/account-actions";

/* ===========================================================================
   DeleteAccountRow — the destructive "Delete my account" entry + its confirm
   modal. Palette-clean (amber + ink, never red). The confirm input requires
   the localized word (DELETE / SUPPRIMER); the safe path (Cancel) is the loud,
   solid-ink button while "Delete permanently" stays a quiet, dashed control
   until the word matches exactly.

   The action behind it is a real, irreversible hard delete (ADR 0003). On
   success it never returns — the server action redirects to the login screen —
   so the only state to render here is the failure path.
=========================================================================== */

const DELETE_BTN =
  "inline-flex min-h-11 items-center justify-center rounded-md px-5 font-display font-semibold select-none";

export function DeleteAccountRow() {
  const t = useTranslations("Profile.account.delete");
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  const word = t("word");
  const matches = typed.trim() === word;

  const reset = () => {
    setTyped("");
    setFailed(false);
  };

  const handleDelete = () => {
    if (!matches) return;
    startTransition(async () => {
      // A successful delete redirects, so reaching the next line at all means
      // the account is still there.
      const res = await deleteAccount();
      setFailed(res.status === "error");
    });
  };

  return (
    <CenteredModal
      open={open}
      onOpenChange={(o) => {
        if (o) reset();
        setOpen(o);
      }}
      trigger={
        // Amber left edge marks the destructive entry (amber as a shape, not
        // text); the label stays ink.
        <button
          type="button"
          className="border-structural flex w-full items-center justify-between gap-4 rounded-md border-l-2 border-l-accent bg-surface px-4 py-3 text-left text-foreground"
        >
          <span className="text-body font-medium">{t("row")}</span>
          <ChevronIcon className="h-5 w-5 shrink-0 text-muted" />
        </button>
      }
      title={t("title")}
      description={t("subtitle")}
      footer={
        <>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!matches || pending}
            className={cn(
              DELETE_BTN,
              matches
                ? "border-structural bg-transparent text-foreground"
                : "border-dashed-ink cursor-not-allowed bg-transparent text-muted",
            )}
          >
            {pending ? t("deleting") : t("confirm")}
          </button>
          <ModalClose asChild>
            <Cta variant="ink">{t("cancel")}</Cta>
          </ModalClose>
        </>
      }
    >
      <div className="flex flex-col gap-4 pb-1">
        <StatusPill className="self-start">{t("pill")}</StatusPill>

        <div className="flex flex-col gap-2">
          <p className="text-body text-foreground">{t("lossIntro")}</p>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-helper text-muted">
            <li>{t("loss1")}</li>
            <li>{t("loss2")}</li>
            <li>{t("loss3")}</li>
          </ul>
        </div>

        <TextInput
          label={t("confirmLabel", { word })}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
        />

        {failed ? (
          // Error copy stays muted ink on beige — no semantic red in the
          // palette.
          <p role="alert" className="text-helper text-muted">
            {t("error")}
          </p>
        ) : null}
      </div>
    </CenteredModal>
  );
}
