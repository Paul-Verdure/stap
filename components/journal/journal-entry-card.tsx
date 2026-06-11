import { useFormatter, useTranslations } from "next-intl";

import { FEELING_MESSAGE_KEY } from "@/components/journal/feeling-keys";
import { ChevronIcon } from "@/components/ui/icons";
import { RhythmUnit } from "@/components/ui/rhythm";
import { Tag } from "@/components/ui/surface";
import { DateLine, Nl } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";
import { isoDate } from "@/lib/date";
import type { JournalEntryView } from "@/lib/journal";

/* ===========================================================================
   JournalEntryCard (G6) — one remembered step in the journal list.
   ---------------------------------------------------------------------------
   An ink-bordered cell (VocItem list pattern — cells separated by gap, never
   hairline rows). The feel shape reuses the rhythm vocabulary; the optional
   excerpt carries a 3px amber left rule — the user's own voice (amber as a
   SHAPE on beige, never as text). The whole cell links to the entry detail;
   its accessible name is the cell's content (feeling label included via the
   labelled RhythmUnit).
=========================================================================== */

export function JournalEntryCard({ entry }: { entry: JournalEntryView }) {
  const t = useTranslations("Journal");
  const format = useFormatter();

  return (
    <Link
      href={`/journal/${entry.id}`}
      className="flex flex-col gap-3 rounded-md border-structural bg-surface px-4 py-3"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-3">
          <RhythmUnit
            state={entry.feeling}
            size="lg"
            label={t(FEELING_MESSAGE_KEY[entry.feeling])}
          />
          <span className="flex flex-col">
            <DateLine dateTime={isoDate(entry.date)}>
              {format.dateTime(entry.date, "short")}
            </DateLine>
            <span className="font-display text-body font-semibold">
              <Nl>{entry.textNl}</Nl>
            </span>
          </span>
        </span>
        <ChevronIcon className="h-5 w-5 shrink-0 text-muted" />
      </span>

      {entry.contexts.length > 0 ? (
        <span className="flex flex-wrap gap-1.5">
          {entry.contexts.map((name) => (
            <Tag key={name}>{name}</Tag>
          ))}
        </span>
      ) : null}

      {entry.body ? (
        <span className="line-clamp-2 border-l-[3px] border-accent pl-3 text-helper text-muted">
          {entry.body}
        </span>
      ) : null}
    </Link>
  );
}
