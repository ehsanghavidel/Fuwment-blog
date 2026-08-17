import { NextRequest } from "next/server";
import { isStudioAuthorized, unauthorized } from "@/lib/auth";
import { syncPostToWordPress } from "@/lib/wordpress";

/**
 * POST /api/posts/[id]/wordpress — ارسال (یا تلاش مجدد) انتقال به وردپرس.
 *
 * چرا مسیر جدا و نه یک فیلد روی PATCH؟ چون «تغییر وضعیت پست» و «ارسال به
 * یک سیستم بیرونی» دو کار متفاوت‌اند با دو حالت شکست متفاوت. قاطی‌کردنشان
 * یعنی یک PATCH که گاهی به‌خاطر شبکه‌ی وردپرس شکست می‌خورد، در حالی که
 * تغییر وضعیت خودش موفق بوده.
 *
 * ایمنی تکرار با syncPostToWordPress است: اگر پست از قبل رفته باشد،
 * «already-sent» برمی‌گردد و پست دومی در وردپرس ساخته نمی‌شود.
 */

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isStudioAuthorized(req)) return unauthorized();

  const result = await syncPostToWordPress(params.id);

  // شکست انتقال خطای ۵۰۰ نیست — درخواست درست پردازش شد و نتیجه‌اش
  // «ناموفق» بود. کلاینت با خواندن status تصمیم می‌گیرد چه نشان دهد.
  return Response.json({ ok: result.status !== "failed", wordpress: result });
}
