import { NextRequest } from "next/server";
import { getStore } from "@/lib/store";
import { isStudioAuthorized, unauthorized } from "@/lib/auth";
import {
  assetFilename,
  parseAssetIndex,
  readSocialAsset,
  resolveAssetPath,
} from "@/lib/social-asset-download";

/**
 * GET /api/social/posts/[id]/assets/[index] — دانلودِ یک PNGِ رندرشده.
 *
 * ⚠️ چرا از خودِ دامنه و نه لینکِ مستقیم Supabase: ویژگیِ `download`ِ
 * تگ `<a>` روی آدرسِ cross-origin را مرورگرها نادیده می‌گیرند و فایل را
 * باز می‌کنند به‌جای ذخیره. این مسیر بایت‌ها را با `Content-Disposition:
 * attachment` از همان مبدأِ استودیو برمی‌گرداند، پس دانلود قابل‌اتکاست.
 *
 * `index` صفرپایه است، دقیقاً همان جایگاه در `imagePaths`. نام فایل
 * یک‌پایه است (برای انسان).
 *
 * قرارداد خطا:
 * - index بدشکل (غیرعدد، منفی، اعشاری) → ۴۰۰
 * - پست نیست، یا index بیرون از بازه، یا مسیر نامعتبر → ۴۰۴
 * - Storage تنظیم نشده → ۵۰۳؛ خواندن از Storage شکست → ۵۰۲
 * متن خطا هیچ‌وقت مسیر یا پیام خامِ Storage را لو نمی‌دهد — آن فقط در
 * لاگِ سرور با پیشوند `[asset-download]` می‌آید.
 */

export const dynamic = "force-dynamic";

function fail(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; index: string } }
) {
  if (!isStudioAuthorized(req)) return unauthorized();

  const index = parseAssetIndex(params.index);
  if (index === null) return fail(400, "شماره‌ی اسلاید نامعتبر است.");

  const post = await getStore().getSocialPost(params.id);
  if (!post) return fail(404, "محتوا پیدا نشد.");

  const path = resolveAssetPath(post, index);
  if (!path) return fail(404, "تصویرِ این اسلاید وجود ندارد.");

  const read = await readSocialAsset(path);
  if (read.status === "not-configured") {
    return fail(503, "ذخیره‌سازی تصویر روی این سرور تنظیم نشده است.");
  }
  if (read.status === "failed") {
    console.error(`[asset-download] خواندن ${path} شکست: ${read.error}`);
    return fail(502, "خواندن تصویر از ذخیره‌سازی ناموفق بود. دوباره تلاش کنید.");
  }

  return new Response(read.bytes, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${assetFilename(post, index)}"`,
      "Content-Length": String(read.bytes.byteLength),
      // پشت رمز است؛ هیچ کشِ مشترکی نباید نگهش دارد
      "Cache-Control": "private, no-store",
    },
  });
}
