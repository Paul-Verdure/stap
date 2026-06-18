import { NextResponse, type NextRequest } from "next/server";

import { sendDueReminders } from "@/lib/push-sender";

// Daily-reminder cron endpoint. The proxy matcher excludes /api, so there is
// no locale rewrite or auth gate here — it is protected by CRON_SECRET. Vercel
// Cron (see vercel.json) calls it hourly with `Authorization: Bearer
// ${CRON_SECRET}`; sendDueReminders no-ops if the VAPID keys are unset.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const result = await sendDueReminders();
  return NextResponse.json(result);
}
