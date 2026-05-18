import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

// Locale-aware navigation APIs. Always import Link/redirect/usePathname/
// useRouter from here (not from next/navigation) so the locale prefix is
// handled automatically.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
