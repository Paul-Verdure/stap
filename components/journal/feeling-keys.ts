import type { JournalFeeling } from "@/lib/journal-filters";

// Message keys (Journal namespace) for the three feel values — shared by the
// entry card, the quick chips and the filter sheet so wording never diverges.
export const FEELING_MESSAGE_KEY: Record<
  JournalFeeling,
  "feelingAtEase" | "feelingHesitant" | "feelingMissed"
> = {
  "at-ease": "feelingAtEase",
  hesitant: "feelingHesitant",
  missed: "feelingMissed",
};
