import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { SocialPost } from "@/lib/store";

/**
 * دانلودِ یک PNGِ رندرشده از استودیو — فقط خواندن.
 *
 * ⚠️ چرا فایل جدا و نه یک export در `storage.ts`: آن فایل رندرکننده و
 * تولید تصویر را import می‌کند. این مسیر فقط بایت می‌خواند و نباید آن
 * وابستگی‌های سنگین را به باندلِ خودش بکشد. رندر و مسیرهای ذخیره‌سازی
 * همچنان فقط در `storage.ts` تعریف می‌شوند؛ اینجا هیچ مسیری ساخته نمی‌شود.
 *
 * ⚠️ مسیر هرگز از مرورگر نمی‌آید. کلاینت فقط شناسه‌ی پست و شماره‌ی
 * اسلاید را می‌فرستد؛ مسیر از `post.imagePaths[index]`ِ ذخیره‌شده برداشته
 * می‌شود. اگر مسیر از URL می‌آمد، هر فایلی در bucket — از جمله
 * `bg-cover.png`ها یا فایلِ پست‌های دیگر — قابل‌درخواست بود.
 */

/** همان bucketِ `storage.ts`. */
const BUCKET = "social-assets";

/**
 * شماره‌ی اسلاید از URL — فقط عدد صحیحِ نامنفیِ ده‌دهی.
 *
 * `Number("1e1")`، `Number(" 1")` و `Number("0x1")` همه عدد می‌دهند؛ پس
 * اول با regex شکلِ رشته را قفل می‌کنیم، بعد تبدیل.
 */
export function parseAssetIndex(raw: string): number | null {
  if (!/^\d{1,3}$/.test(raw)) return null;
  return Number(raw);
}

/**
 * مسیرِ ذخیره‌شده‌ی یک اسلاید، یا null.
 *
 * محافظ دوم: مسیر باید زیرِ پوشه‌ی **همین** پست باشد. همه‌ی مسیرهای فعلی
 * از `slidePath` می‌آیند و این شرط را دارند؛ اگر روزی داده‌ی خراب یا
 * دست‌کاری‌شده به ستون برسد، این مسیر فایل پست دیگری را برنمی‌گرداند.
 */
export function resolveAssetPath(
  post: Pick<SocialPost, "id" | "imagePaths">,
  index: number
): string | null {
  const path = post.imagePaths[index];
  if (!path) return null;
  if (!path.startsWith(`${post.id}/`) || path.includes("..") || !path.endsWith(".png")) {
    return null;
  }
  return path;
}

/**
 * نام فایلِ دانلود — قطعی و قابل‌مرتب‌سازی.
 *
 * `instagram-e2241e08-01.png` / `story-271926c3-03.png`. شماره یک‌پایه و
 * دو رقمی است تا در پوشه‌ی دانلودها به ترتیبِ اسلاید مرتب شود و با
 * برچسبِ «۱، ۲، ۳»ِ استودیو بخواند. فقط ASCII — نامِ فارسی در
 * Content-Disposition به کدگذاری RFC 5987 نیاز دارد و ارزشش را ندارد.
 */
export function assetFilename(
  post: Pick<SocialPost, "id" | "format">,
  index: number
): string {
  const prefix = post.format === "story" ? "story" : "instagram";
  const shortId = post.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "post";
  return `${prefix}-${shortId}-${String(index + 1).padStart(2, "0")}.png`;
}

export type AssetReadResult =
  | { status: "ok"; bytes: ArrayBuffer }
  | { status: "not-configured" }
  | { status: "failed"; error: string };

/** خواندنِ بایت‌های یک شیء از bucket. هیچ‌وقت throw نمی‌کند. */
export async function readSocialAsset(path: string): Promise<AssetReadResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { status: "not-configured" };

  try {
    const sb = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await sb.storage.from(BUCKET).download(path);
    if (error || !data) {
      return { status: "failed", error: error?.message ?? "بدون داده" };
    }
    return { status: "ok", bytes: await data.arrayBuffer() };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
}
