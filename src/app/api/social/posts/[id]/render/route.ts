import { NextRequest } from "next/server";
import { renderSlidesForPost } from "@/lib/storage";
import { isStudioAuthorized, unauthorized } from "@/lib/auth";

/**
 * POST /api/social/posts/[id]/render — رندر (یا رندر دوباره) تصویر اسلایدها.
 *
 * چرا مسیر جدا و نه فیلدی روی PATCH؟ همان استدلال مسیر وردپرس: «تغییر
 * وضعیت محتوا» و «ساخت فایل در یک سرویس بیرونی» دو کار متفاوت‌اند با دو
 * حالت شکست متفاوت. قاطی‌کردنشان یعنی یک PATCH که گاهی به‌خاطر Storage
 * شکست می‌خورد، در حالی که تأیید محتوا خودش موفق بوده.
 *
 * ⚠️ برخلاف وردپرس، محافظ «قبلاً انجام شده» **ندارد**. آنجا ارسال دوم
 * یعنی پست تکراری در وردپرسِ عمومی؛ اینجا رندر دوباره روی همان مسیر
 * می‌نویسد و اصلاً هدفِ همین دکمه است.
 */

// رندر یک کاروسل هشت‌اسلایدی حدود ۳۰۰ میلی‌ثانیه است، ولی آپلود هشت
// فایل به Storage به شبکه وابسته است. سقف سخاوتمندانه، نه ۳۰۰.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isStudioAuthorized(req)) return unauthorized();

  const result = await renderSlidesForPost(params.id);

  // شکست رندر خطای ۵۰۰ نیست — درخواست درست پردازش شد و نتیجه‌اش
  // «ناموفق» بود. کلاینت با خواندن status تصمیم می‌گیرد چه نشان دهد.
  return Response.json({ ok: result.status !== "failed", render: result });
}
