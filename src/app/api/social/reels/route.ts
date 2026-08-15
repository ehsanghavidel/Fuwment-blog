import { NextRequest } from "next/server";
import { z } from "zod";
import { runReelsPipeline } from "@/lib/agents/reels-orchestrator";
import { isConfigured } from "@/lib/ai";
import { isStudioAuthorized, unauthorized } from "@/lib/auth";
import { BRAND_ROUTES } from "@/lib/agents/types";

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
     * مسیر برند این محتوا. اگر داده شود، فهرست CTA به همان مسیر فیلتر
     * می‌شود و چک قطعی هم بر همان مبنا می‌سنجد. اگر نه، همه‌ی CTAها
     * نشان داده می‌شوند و رعایت محدوده با مدل است.
     */
    route: z.enum(BRAND_ROUTES).optional(),
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
  });

  return Response.json({ run });
}
