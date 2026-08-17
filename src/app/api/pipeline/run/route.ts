import { NextRequest } from "next/server";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { runPipeline } from "@/lib/agents/orchestrator";
import { isConfigured } from "@/lib/ai";
import { isStudioAuthorized, unauthorized } from "@/lib/auth";
import { BRAND_ROUTES } from "@/lib/agents/types";

/**
 * POST /api/pipeline/run — شروع پایپ‌لاین. **بلافاصله برمی‌گردد.**
 *
 * قبلاً این درخواست تا پایان اجرا (چند دقیقه) باز می‌ماند و روی Vercel با
 * ۵۰۴ می‌شکست. حالا کار در پس‌زمینه با `waitUntil` ادامه پیدا می‌کند و
 * کلاینت مثل قبل با GET /api/pipeline/runs/[id] پیشرفت را poll می‌کند —
 * که از قبل هم کار می‌کرد، چون ارکستریتور هر گام را در store آینه می‌کند.
 *
 * ⚠️ آنچه این کار **نمی‌کند**: سقف زمان را برنمی‌دارد. طبق مستندات Vercel،
 * «promiseهای داده‌شده به waitUntil همان timeout تابع را دارند» و مهلت
 * «شامل پردازش درخواست و کارهای ناهمگام waitUntil» است. پس اجرای بیش از
 * maxDuration همچنان کشته می‌شود — ولی حالا:
 * ۱. کلاینت اتصال چنددقیقه‌ای باز نگه نمی‌دارد (که خودِ مستندات هشدار
 *    می‌دهد واسطه‌های HTTP/1.1 می‌بندندش)،
 * ۲. به‌جای یک ۵۰۴ خالی، پیشرفت واقعی در تایم‌لاین دیده می‌شود،
 * ۳. محافظ مهلت در run-steps.ts پیش از کشته‌شدن، اجرا را تمیز می‌بندد.
 */

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  runId: z.string().uuid(),
  topicHint: z.string().max(300).optional(),
  /** مسیر برند — تعیین‌کننده‌ی CTAهای مجاز و زاویه‌ی محتوا */
  route: z.enum(BRAND_ROUTES),
});

export async function POST(req: NextRequest) {
  if (!isStudioAuthorized(req)) return unauthorized();

  if (!isConfigured()) {
    return Response.json(
      { error: "OPENROUTER_API_KEY تنظیم نشده است. فایل .env.local را بسازید." },
      { status: 500 }
    );
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "بدنه‌ی درخواست نامعتبر است." }, { status: 400 });
  }

  // بدون await: اجرا در پس‌زمینه ادامه می‌یابد و waitUntil نگهش می‌دارد.
  // runPipeline خودش خطاها را می‌گیرد و در رکورد اجرا ثبت می‌کند، ولی
  // یک catch اینجا هم می‌گذاریم تا هیچ rejectionی بی‌صاحب نماند.
  const work = runPipeline({
    runId: parsed.data.runId,
    topicHint: parsed.data.topicHint ?? null,
    route: parsed.data.route,
  }).catch((err) => {
    console.error(`[pipeline] اجرای ${parsed.data.runId} شکست خورد:`, err);
  });

  waitUntil(work);

  // فقط شناسه برمی‌گردد؛ وضعیت را کلاینت poll می‌کند.
  return Response.json({ runId: parsed.data.runId, status: "running" }, { status: 202 });
}
