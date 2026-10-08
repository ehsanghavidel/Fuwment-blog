import { NextRequest } from "next/server";
import { z } from "zod";
import { runReelsPipeline } from "@/lib/agents/reels-orchestrator";
import { isConfigured } from "@/lib/ai";
import { isStudioAuthorized, unauthorized } from "@/lib/auth";
import { BRAND_ROUTES } from "@/lib/agents/types";
import { AUDIENCE_GROUPS, JOURNEY_STAGES } from "@/lib/brand";

/**
 * POST /api/social/reels — ساخت اسکریپت ریلز از یک لینک یا یک متن.
 *
 * همان قرارداد بقیه‌ی اجراها: کلاینت runId می‌سازد و با
 * GET /api/pipeline/runs/[id] پیشرفت را poll می‌کند.
 */

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const BodySchema = z
  .object({
    runId: z.string().uuid(),
    sourceUrl: z.string().url().optional(),
    sourceText: z.string().max(20000).optional(),
    /** منبع رایگان اختیاری — فقط به‌عنوان زمینه به پرامپت می‌رود */
    leadMagnet: z.string().max(200).optional(),
    /**
     * مسیر برند این محتوا — زمینه‌ی محتوایی نویسنده. (v3.7: CTAی ریلز از
     * هدف ویدیو می‌آید، نه از مسیر.)
     */
    route: z.enum(BRAND_ROUTES).optional(),
    /**
     * گروه مخاطب و مرحله‌ی سفر — اجباری، بدون پیش‌فرض (v3.7: «اگر پاسخ
     * هرکدام همه بود، محتوا آماده نیست»). ریلز استراتژیست ندارد، پس
     * اپراتور انتخاب می‌کند. فهرست‌ها از لایه‌ی برند می‌آیند.
     */
    audienceGroup: z.enum(AUDIENCE_GROUPS, {
      errorMap: () => ({ message: "گروه مخاطب ریلز را انتخاب کنید." }),
    }),
    journeyStage: z.enum(JOURNEY_STAGES, {
      errorMap: () => ({ message: "مرحله‌ی سفر مخاطب ریلز را انتخاب کنید." }),
    }),
  })
  // دقیقاً یکی از دو ورودی. هر دو با هم یعنی کاربر نمی‌داند کدام مبناست.
  .refine((b) => Boolean(b.sourceUrl) !== Boolean(b.sourceText?.trim()), {
    message: "دقیقاً یکی از «لینک» یا «متن» را بدهید.",
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
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "بدنه‌ی درخواست نامعتبر است." },
      { status: 400 }
    );
  }

  const run = await runReelsPipeline({
    runId: parsed.data.runId,
    sourceUrl: parsed.data.sourceUrl ?? null,
    sourceText: parsed.data.sourceText ?? null,
    leadMagnet: parsed.data.leadMagnet ?? null,
    route: parsed.data.route,
    audienceGroup: parsed.data.audienceGroup,
    journeyStage: parsed.data.journeyStage,
  });

  return Response.json({ run });
}
