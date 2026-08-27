/**
 * متادیتای نمایشیِ هر قالبِ محتوای اجتماعی — منبع مشترک استودیو (کلاینت)
 * و مسیر بازخورد (سرور).
 *
 * ⚠️ عمداً `server-only` ندارد. `SocialPostCard.tsx` در مرورگر می‌خواندش
 * و `api/feedback/route.ts` روی سرور — هر دو باید از یک منبع بخوانند،
 * وگرنه دقیقاً همان چیزی تکرار می‌شود که این فایل برای رفعش ساخته شد:
 * یک نسخه‌ی بی‌صدا-عقب‌مانده‌ی برچسبِ قالب در فایل دیگر.
 *
 * `Record<SocialFormat, FormatMeta>` باعث می‌شود جاافتادنِ یک قالب هنگام
 * افزودنِ عضو جدید به `SocialFormat` خطای کامپایل بدهد، نه سکوت.
 */

import type { SocialFormat } from "@/lib/store/types";

export type FormatMeta = {
  /** برچسبِ فارسیِ قالب — روی چیپِ کارت و در پرامپتِ منتقد */
  label: string;
  /** این جعبه چیست — «کپشن» برای کاروسل، «خلاصه‌ی داخلی» برای استوری */
  bodyLabel: string;
  /** برچسبِ دکمه‌ی کپی */
  copyLabel: string;
  /** آیا این قالب اسلاید دارد */
  hasSlides: boolean;
  /**
   * آیا دکمه‌ی رندر نمایش داده شود.
   * ⚠️ استوری تا پایانِ Stage 1 همچنان `false` است — رندرکننده‌اش
   * در Stage 2 ساخته می‌شود.
   */
  canRender: boolean;
};

export const FORMAT_META: Record<SocialFormat, FormatMeta> = {
  carousel: {
    label: "کاروسل اینستاگرام",
    bodyLabel: "کپشن",
    copyLabel: "کپی متن و هشتگ‌ها",
    hasSlides: true,
    canRender: true,
  },
  post: {
    label: "پست لینکدین",
    bodyLabel: "متن پست",
    copyLabel: "کپی متن و هشتگ‌ها",
    hasSlides: false,
    canRender: false,
  },
  reels: {
    label: "اسکریپت ریلز",
    bodyLabel: "اسکریپت",
    copyLabel: "کپی اسکریپت",
    hasSlides: false,
    canRender: false,
  },
  story: {
    label: "ستِ استوری اینستاگرام",
    bodyLabel: "خلاصه‌ی داخلیِ ست — منتشر نمی‌شود",
    copyLabel: "کپی متنِ فریم‌ها و استیکرها",
    hasSlides: true,
    canRender: false,
  },
};
