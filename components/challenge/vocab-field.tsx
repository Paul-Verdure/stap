"use client";

import { useState } from "react";

import { CloseIcon, PlusIcon } from "@/components/ui/icons";
import { Nl } from "@/components/ui/typography";

/* ===========================================================================
   VocabField (G5) — free-text "words you heard" entry: removable chips plus an
   add input. The words are Dutch (heard in real life), so chips carry lang=nl.
   Personal and free-text — distinct from catalog VocabularyCards.
=========================================================================== */
export function VocabField({
  value,
  onChange,
  addLabel,
  placeholder,
  removeLabel,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  addLabel: string;
  placeholder: string;
  removeLabel: string;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const word = draft.trim();
    if (word && !value.includes(word)) onChange([...value, word]);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-3">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((word) => (
            <li key={word}>
              <span className="inline-flex items-center gap-2 rounded-md border-structural bg-surface py-1.5 pr-2 pl-3 text-body">
                <Nl>{word}</Nl>
                <button
                  type="button"
                  aria-label={`${removeLabel}: ${word}`}
                  onClick={() => onChange(value.filter((w) => w !== word))}
                  className="grid h-5 w-5 place-items-center rounded-full text-muted hover:text-foreground"
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          aria-label={addLabel}
          className="flex-1 rounded-md border-structural bg-surface px-4 py-2.5 text-body text-foreground placeholder:text-muted"
        />
        <button
          type="button"
          onClick={add}
          aria-label={addLabel}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-md border-structural bg-surface text-foreground"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
