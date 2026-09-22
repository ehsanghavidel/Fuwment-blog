/**
 * مشخصات هندسیِ فریمِ استوری — منبع مشترکِ لنگرِ عمودیِ Stage ۲
 * (رندرکننده و پیش‌نمایش).
 *
 * ⚠️ فقط هندسه — هیچ کدِ رندری اینجا نیست. توکن‌های تایپوگرافی و رنگ از
 * `slide-spec.ts` می‌آیند و آن فایل **دست‌نخورده** می‌ماند؛ استوری بومِ
 * جدا دارد (۱۰۸۰×۱۹۲۰ در برابر ۱۰۸۰×۱۳۵۰ کاروسل)، پس نمی‌تواند از
 * `CANVAS`/`PAD`/`blockTopPx` کاروسل استفاده کند.
 *
 * ⚠️ عمداً `server-only` ندارد — کاروسل هم همین قاعده را دارد، چون
 * Stage ۲ همین فایل را هم در رندرکننده (Node) و هم در پیش‌نمایشِ استودیو
 * (مرورگر) می‌خواند.
 */

import { OPTICAL_TOP_SHARE, PAD } from "@/lib/slide-spec";

/* ── بوم و حاشیه‌ی امن ───────────────────────────────────── */

/** نسبت ۹:۱۶ — بومِ استوری اینستاگرام */
export const STORY_CANVAS = { width: 1080, height: 1920 } as const;

/**
 * حاشیه‌ی امنِ بالا و پایین — تصمیمِ محصولیِ قفل‌شده. بالا برای نوارِ
 * پروفایل/پیشرفتِ استوری، پایین برای نوارِ پاسخِ اینستاگرام (ورودیِ پیام).
 */
export const STORY_SAFE = { top: 250, bottom: 250 } as const;

/** پدینگِ افقی — همان مقدارِ کاروسل، برای انسجامِ بصری */
export const STORY_PAD = { x: PAD.x } as const;

export const STORY_CONTENT_WIDTH = STORY_CANVAS.width - STORY_PAD.x * 2;

/**
 * ارتفاعِ رزروِ استیکرِ تعاملی، بالای حاشیه‌ی امنِ پایین.
 *
 * وجودِ استیکر روی یک فریم، فقط کفِ ناحیه‌ی مجازِ متن را بالا می‌آورد —
 * هیچ جعبه یا خط‌چینی رسم نمی‌شود (بخشِ ۴ طرح).
 */
export const STICKER_ZONE = 260;

/* ── نقشِ فریم ────────────────────────────────────────────── */

export type StoryRole = "hook" | "body" | "cta";

/**
 * نقشِ هر فریم — از جایگاهش مشتق می‌شود، نه از مدل (همان قاعده‌ی
 * `roleFor` در `slide-spec.ts`).
 *
 * ۲ فریم: hook → cta. ۳ فریم: hook → body → cta.
 */
export function storyRoleFor(index: number, total: number): StoryRole {
  if (index === total - 1) return "cta";
  return index === 0 ? "hook" : "body";
}

/* ── ناحیه‌ی مجاز و لنگرِ عمودی ──────────────────────────── */

/**
 * گامِ ۱ — ناحیه‌ی مجازِ عمودی. استیکر فقط کفِ ناحیه را بالا می‌آورد؛
 * سقف و لنگرها دست‌نخورده می‌مانند.
 */
export function storyRegion(hasSticker: boolean): { top: number; bottom: number } {
  return {
    top: STORY_SAFE.top,
    bottom: STORY_CANVAS.height - STORY_SAFE.bottom - (hasSticker ? STICKER_ZONE : 0),
  };
}

export type StoryBlockAlign = "top" | "center" | "bottom";

/**
 * لنگرِ بلوکِ محتوا — فقط از نقش، `hasSticker` اینجا اثری ندارد.
 *
 * hook بالا (تصویرِ سوژه در نیمه‌ی پایین است، متن نباید با آن رقابت
 * کند)، body وسط، cta پایین (همان استدلالِ کاروسل: آخرین چیزی که دیده
 * می‌شود، دعوت به اقدام است).
 */
export function storyBlockAlignFor(role: StoryRole): StoryBlockAlign {
  if (role === "hook") return "top";
  if (role === "cta") return "bottom";
  return "center";
}

/**
 * گامِ ۲ — مختصاتِ بالای بلوکِ محتوا، داخلِ ناحیه‌ی (احتمالاً کوتاه‌شده‌ی)
 * `storyRegion`.
 *
 * لنگرِ `bottom` به کفِ ناحیه می‌چسبد، نه به لبه‌ی بوم — به همین دلیل
 * فریمِ CTA با استیکرِ لینک هرگز با رزروِ استیکر تصادف نمی‌کند (بخشِ ۶
 * طرح، اصلاحِ ۸).
 */
export function storyBlockTopPx(
  role: StoryRole,
  blockHeight: number,
  hasSticker: boolean
): number {
  const region = storyRegion(hasSticker);
  if (role === "cta") return region.bottom - blockHeight;
  if (role === "hook") return region.top;

  const free = region.bottom - region.top - blockHeight;
  return region.top + Math.max(0, free * OPTICAL_TOP_SHARE);
}

/**
 * آیا این بلوک، در بدترین حالتِ ارتفاع، داخلِ ناحیه‌ی مجاز می‌ماند؟
 *
 * Stage ۲ این را روی بدترین حالتِ محتوایی (سه‌بندِ `list` با سقفِ کامل +
 * تیترِ سقف) با تستِ منطقِ خالص اثبات می‌کند.
 */
export function isInsideStoryRegion(top: number, height: number, hasSticker: boolean): boolean {
  const region = storyRegion(hasSticker);
  return top >= region.top && top + height <= region.bottom;
}
