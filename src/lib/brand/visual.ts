/**
 * توکن‌های بصری — بخش ۰۵ راهنمای v3.7 (پالت، گرادیان‌ها، تایپوگرافی).
 *
 * ⚠️ تنها منبع hexهای برند. `tailwind.config.ts` (استودیو) و
 * `slide-spec.ts` (رندر PNG) هر دو از همین‌جا می‌خوانند. پیش از v3.7 این
 * عددها در دو فایل جدا تکرار شده بودند با یک کامنتِ «اگر پالت عوض شد، این
 * هم باید عوض شود» — یعنی هماهنگیِ دستی.
 *
 * ⚠️ بدون import و بدون `server-only` — Tailwind این فایل را موقع بیلد با
 * jiti بارگذاری می‌کند و مسیرِ مستعار `@/` آنجا کار نمی‌کند.
 */

export const PALETTE = {
  /** سرمه‌ای فومنت — رنگ پایه، پس‌زمینه‌ی اصلی (۶۰٪) */
  navy: "#0E394A",
  /** سرمه‌ای تیره — بخش‌بندی متناوب */
  navyDeep: "#072A38",
  /** سطح کارت — خنثیِ تیره */
  navyCard: "#123F52",
  /** نارنجی فومنت — فقط اقدام (۵٪). حداکثر یک عنصر در هر طرح */
  orange: "#F5941F",
  /** نارنجی روشن — تیتر و هایلایت روی تیره (کنتراست ۷٫۱) */
  orangeLight: "#FFB74D",
  /** فیروزه‌ای فومنت — مسیر و موفقیت (۱۰٪). روی سرمه‌ای فقط برای متن درشت (۴٫۱) */
  teal: "#1FA795",
  /** فیروزه‌ای روشن — نسخه‌ی مجاز فیروزه‌ای برای متن ریز روی تیره (۴٫۹، AA) */
  tealLight: "#23B7A5",
  /** خاکستری‌آبی — متن فرعی روی تیره (۵٫۶) */
  slate: "#9DB3BD",
  /** مه — متن بدنه روی زمینه‌ی تیره (۱۰٫۵) */
  mist: "#E6EEF2",
  /** جوهر — متن روی دکمه‌ی نارنجی (۷٫۴). سفید روی نارنجی ممنوع (۲٫۳) */
  ink: "#0B1F28",
  /** خطای فرم */
  error: "#FF8A6B",
} as const;

/** گرادیان‌های رسمی — گرادیان برند فقط نوار باریک، هرگز پس‌زمینه‌ی متن */
export const GRADIENTS = {
  orange: [PALETTE.orangeLight, "#EF8817"],
  teal: [PALETTE.tealLight, "#197064"],
  brand: [PALETTE.orange, PALETTE.teal],
} as const;

/** دو فونت، بیشتر نه: وزیرمتن برای فارسی، Inter برای همه‌ی محتوای انگلیسی */
export const FONT_FILES = {
  fa: {
    400: "Vazirmatn-Regular.woff2",
    500: "Vazirmatn-Medium.woff2",
    700: "Vazirmatn-Bold.woff2",
  },
  en: {
    400: "Inter-Regular.woff2",
    500: "Inter-Medium.woff2",
    700: "Inter-Bold.woff2",
  },
} as const;

/**
 * مقدار قراردادیِ `imageSubject` برای دسته‌ی سوم تصویر v3.7: «انتزاعی برند»
 * (فرم‌های ایزومتریک، گرادیان نارنجی-فیروزه‌ای — «برای کاورها، وقتی عکس
 * واقعی نداریم»).
 *
 * ⚠️ فقط برابریِ دقیق این رشته سبک ۳D/ایزومتریک را روشن می‌کند. هر
 * `imageSubject` دیگری همان عکاسی ادیتوریال می‌ماند — یعنی هیچ صحنه‌ی
 * عکاسی بی‌صدا به ۳D تبدیل نمی‌شود (تصمیم مالک).
 */
export const ABSTRACT_BRAND_SUBJECT = "abstract-brand";

/** حداقل ارتفاع خط متن بدنه‌ی فارسی */
export const MIN_BODY_LINE_HEIGHT_FA = 1.8;

/* ── کنتراست WCAG 2.1 ───────────────────────────────────── */

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
}

/** نسبت کنتراست دو رنگ توپر — فرمول WCAG 2.1 */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
