/**
 * هسته‌ی برند — نام، نسخه‌ی راهنما، مسیرها.
 *
 * ⚠️ منبع حقیقتِ انسانی این لایه `docs/brand/Fuwment_Brand_Guide_v3.7.pdf`
 * است و نسخه‌ی ماشین‌خوانش `docs/brand/Fuwment_Brand_Guide_v3.7.md`. هرچه
 * در `src/lib/brand/` هست برداشتِ اجرایی همان سند است، نه سندی موازی. اگر
 * راهنما عوض شد، اول این‌جا را با سند تطبیق بده، بعد بقیه را.
 *
 * ⚠️ این فایل و بقیه‌ی `src/lib/brand/` عمداً `server-only` ندارند: هم
 * پرامپت‌های سرور می‌خوانندشان، هم `tailwind.config.ts` و پیش‌نمایش
 * استودیو (توکن‌های بصری). هیچ وابستگی به store یا شبکه ندارند.
 */

export const BRAND_GUIDE = {
  version: "3.7",
  /** سند اصلی و تصویری */
  canonicalPdf: "docs/brand/Fuwment_Brand_Guide_v3.7.pdf",
  /** نسخه‌ی ماشین‌خوان رسمی — مرجعِ ترجیحیِ کد */
  machineReadable: "docs/brand/Fuwment_Brand_Guide_v3.7.md",
} as const;

export const BRAND_GUIDE_VERSION = BRAND_GUIDE.version;

/** در متن فارسی «فومنت»، در متن انگلیسی Fuwment — همیشه با حرف اول بزرگ */
export const COMPANY_NAME = "فومنت";
export const COMPANY_NAME_EN = "Fuwment";

/** مسیرهای فومنت. هر محتوا باید دقیقاً به یکی از این‌ها تعلق داشته باشد. */
export type BrandRoute = "brand" | "global-talent" | "innovator-founder";

export type ContentLanguage = "fa" | "en";
