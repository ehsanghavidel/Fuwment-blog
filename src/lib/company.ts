/**
 * هویت برند فومنت — رابطِ سازگاری برای importهای موجود.
 *
 * ⚠️ از v3.7 این فایل دیگر منبع حقیقت برند نیست. منبع اجرایی
 * `src/lib/brand/` است و مرجع انسانی آن
 * `docs/brand/Fuwment_Brand_Guide_v3.7.pdf` (نسخه‌ی ماشین‌خوان:
 * `docs/brand/Fuwment_Brand_Guide_v3.7.md`). این‌جا فقط نام‌های قدیمی
 * بازصادر می‌شوند تا هیچ import موجودی نشکند.
 *
 * دو چیز هنوز واقعاً مال همین فایل است، چون تصمیم کسب‌وکاری‌اند نه برندگاید:
 * `BLOCKED_SOURCE_DOMAINS` و `siteUrl()`.
 *
 * ⚠️ `BRAND_VOICE` عمداً **بدون قواعد کانال** است (نه «شما»، نه «تو»، نه
 * قاعده‌ی خط). نویسنده‌ها و ویراستارها از `brandContext(channel)` می‌خوانند،
 * نه از این. پیش از v3.7 یک «شما»ی سراسری در BRAND_VOICE بود که به
 * اینستاگرام هم نشت می‌کرد.
 */

import { POSITIONING_FA, SHARED_BRAND_RULES_FA } from "@/lib/brand";

export {
  COMPANY_NAME,
  COMPANY_NAME_EN,
  BRAND_CTAS,
  ctasForRoute,
  type BrandRoute,
  type BrandCta,
  type CtaKind,
} from "@/lib/brand";

/** زمینه‌ی داخلی جایگاه‌یابی (v3.7) — برای ایجنت‌های برنامه‌ریزی */
export const COMPANY_PROFILE = POSITIONING_FA;

/** صدا + ادعا + واژگان + مرز زبان داخلی (v3.7) — بدون قواعد کانال */
export const BRAND_VOICE = SHARED_BRAND_RULES_FA;

/**
 * دامنه‌هایی که هرگز نباید در فهرست منابع مقاله بیایند.
 *
 * اینجا جای رقباست — سایت‌هایی که نمی‌خواهید مقاله‌ی شما به آن‌ها لینک بدهد.
 *
 * فرمت: فقط دامنه، بدون پروتکل و بدون www —
 *   "example.com"  ✓
 *   "https://www.example.com/"  ✗
 * زیردامنه‌ها خودکار پوشش داده می‌شوند: "example.com" شامل
 * "blog.example.com" هم می‌شود.
 *
 * توجه: شبکه‌های اجتماعی و انجمن‌ها از قبل در researcher.ts فیلتر می‌شوند
 * و لازم نیست اینجا تکرار شوند — آن یک قاعده‌ی ساختاری است، این یکی
 * تصمیم کسب‌وکاری.
 */
export const BLOCKED_SOURCE_DOMAINS: string[] = [
   "uklifeinfo.co.uk",
   "homamigration.org",
   "go2tr.com",
   // "competitor-example.com",
];

export function siteUrl(): string {
   return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
