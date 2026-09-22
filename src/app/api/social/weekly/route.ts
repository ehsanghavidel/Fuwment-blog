import { NextRequest } from "next/server";
import { z } from "zod";
import { planWeek, runWeek } from "@/lib/agents/weekly-orchestrator";
import { weekStart } from "@/lib/week";
import { getStore, type PipelineRun } from "@/lib/store";
import { isConfigured } from "@/lib/ai";
import { isStudioAuthorized, unauthorized } from "@/lib/auth";

/**
 * هفته‌ی محتوایی اینستاگرام — دو فعل، نه یکی.
 *
 * POST { mode: "plan" }            → فقط برنامه‌ریزی. یک فراخوانی مدل.
 * POST { mode: "run", weekId }     → اجرای هفت اسلاتِ برنامه‌ی موجود.
 * GET                              → هفته‌ی جاری + وضعیت زنده‌ی اجراهایش.
 *
 * ⚠️ چرا دو فعل: اجرای هفته حدود ۳۵ فراخوانی مدل است. اگر برنامه بد
 * باشد باید **پیش از** سوزاندنشان معلوم شود. همان الگوی human-in-the-loop
 * که ناشر بلاگ و انتقال وردپرس دارند.
 *
 * ⚠️ برخلاف بقیه‌ی مسیرهای اجرا، کلاینت `runId` نمی‌سازد: هفت شناسه در
 * ارکستریتور ساخته می‌شوند و پیش از شروع در `content_weeks.run_ids`
 * ذخیره می‌شوند. کلاینت با GET همین مسیر آن‌ها را می‌گیرد و poll می‌کند.
 */

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const BodySchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("plan"), force: z.boolean().optional() }),
  z.object({
    mode: z.literal("run"),
    weekId: z.string().uuid(),
    force: z.boolean().optional(),
  }),
]);

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

  try {
    const week =
      parsed.data.mode === "plan"
        ? await planWeek({ force: parsed.data.force })
        : await runWeek({ weekId: parsed.data.weekId, force: parsed.data.force });

    return Response.json({ week });
  } catch (err) {
    // ⚠️ برخلاف ارکستریتورهای دیگر که خطا را در رکورد اجرا می‌نشانند و
    // اجرای «error» برمی‌گردانند، محافظ‌های runWeek (بدون برنامه، هفته‌ی
    // ناموجود) پیش از ساختِ هر چیزی throw می‌کنند. آن‌ها خطای کاربرند،
    // نه شکست پایپ‌لاین — پس ۴۰۰ می‌گیرند، نه ۵۰۰.
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[weekly-api] ${message}`);
    return Response.json({ error: message }, { status: 400 });
  }
}

/**
 * هفته‌ی جاری و وضعیت زنده‌ی اجراهایش.
 *
 * ⚠️ «جاری» سمت سرور با `weekStart()` حساب می‌شود، نه سمت کلاینت:
 * مرز هفته به وقت تهران است و مرورگر کاربر (بریتانیا) تا ۳٫۵ ساعت در
 * روز جواب دیگری می‌دهد.
 */
export async function GET(req: NextRequest) {
  if (!isStudioAuthorized(req)) return unauthorized();

  const store = getStore();
  const week = await store.getWeekByStart(weekStart());

  if (!week) return Response.json({ week: null, runs: [] });

  // وضعیت هر اجرا از رکورد خودش خوانده می‌شود، نه از run_ids هفته:
  // آن آرایه فقط در پایان اجرا به‌روز می‌شود، ولی این مسیر باید در
  // **حین** کار هم درست جواب بدهد.
  const runs = await Promise.all(week.runIds.map((r) => store.getRun(r.runId)));

  return Response.json({
    week,
    runs: runs.filter((r): r is PipelineRun => r !== null),
  });
}
