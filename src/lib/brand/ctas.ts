import type { BrandRoute } from "./core";

/**
 * دعوت‌به‌اقدام‌ها — المان ۵ و «CTA بر اساس هدف پست» در v3.7.
 *
 * دو لایه‌ی جدا، عمداً:
 *
 * ۱. **CTAهای برند** (`BRAND_CTAS`) — دعوت مستقیم و واسط‌ها، قفل به مسیر.
 *    مالِ بلاگ/سایت و هر جایی که دکمه یا لینک دارد.
 *    - دعوت مستقیم: یک متن ثابت، بدون تغییر واژه، در همه‌ی مسیرها.
 *    - دعوت واسط: سه نسخه، هرکدام قفل به یک مسیر. «تست خوانایی» در
 *      محتوای سطح برند یا کارآفرینی ممنوع است.
 *
 * ۲. **CTAی اینستاگرام بر اساس هدف پست** (`INSTAGRAM_GOAL_CTAS`) — v3.7
 *    برای اینستاگرام (کاروسل، استوری، ریلز) قاعده‌ی جدا دارد: پست آموزشی
 *    «ذخیره کن» / «برای کسی بفرست»، فقط پست فروش «لینک ارزیابی مسیر در
 *    بایو است». هیچ پستی دو CTA ندارد.
 *
 * ⚠️ خطِ کلیدواژه‌ی دایرکت (`dm-keyword.ts`) استثنای تأییدشده‌ی مالک است
 * و اینجا تعریف نمی‌شود — رشته‌اش ثابت و تغییرناپذیر است.
 */

export type CtaKind = "direct" | "transitional";

export interface BrandCta {
  id: string;
  label: string;
  kind: CtaKind;
  /** در کدام مسیرها مجاز است */
  routes: BrandRoute[];
  /** این CTA چه چیزی را می‌سنجد یا وعده می‌دهد */
  note?: string;
}

export const BRAND_CTAS: BrandCta[] = [
  {
    id: "initial-assessment",
    label: "ارزیابی اولیه‌تان را شروع کنید",
    kind: "direct",
    routes: ["brand", "global-talent", "innovator-founder"],
    note: "تنها دعوت مستقیم برند. متن ثابت است و تغییر نمی‌کند.",
  },
  {
    id: "route-assessment",
    label: "ارزیابی مسیر — بدانید کجا ایستاده‌اید",
    kind: "transitional",
    routes: ["brand"],
    note: "درِ ورودی. کدام مسیر با این پروفایل هم‌خوان است — یا اینکه هیچ‌کدام.",
  },
  {
    id: "legibility-test",
    label: "تست خوانایی — دستاوردهای شما چقدر قابل اثبات‌اند؟",
    kind: "transitional",
    routes: ["global-talent"],
    note: "فقط Global Talent. هرگز به‌عنوان درِ ورودی سطح برند استفاده نشود.",
  },
  {
    // ⚠️ شناسه عوض نشد (داده‌ی قدیمی و چک‌ها به آن وابسته‌اند)؛ فقط برچسب
    // به نام v3.7 رسید.
    id: "business-assessment",
    label: "ارزیابی اختصاصی کسب‌وکار",
    kind: "transitional",
    routes: ["innovator-founder"],
    note: "سه معیار رسمی: نوآورانه · قابل‌اجرا · مقیاس‌پذیر.",
  },
];

/** CTAهای مجاز برای یک مسیر مشخص. */
export function ctasForRoute(route: BrandRoute): BrandCta[] {
  return BRAND_CTAS.filter((cta) => cta.routes.includes(route));
}

/* ── اینستاگرام: CTA بر اساس هدف پست ─────────────────────── */

/**
 * هدف پست. v3.7 دو ردیف دارد: «آموزشی» و «فروش یا تبدیل» — و «پستی که
 * هدفش فروش یا تبدیل نیست، تابع ردیف آموزشی است». پس «اثبات» (۲۰٪
 * نسبت محتوا) هم آموزشی حساب می‌شود.
 */
export type ContentGoal = "educational" | "sales";

/** نوع محتوای شبکه‌ی هفتگی → هدف پست. فقط «فروش مستقیم» CTAی فروش دارد. */
export function contentGoalFor(contentType: string | null | undefined): ContentGoal {
  return contentType === "sales" ? "sales" : "educational";
}

export type GoalCta = { id: string; fa: string; en: string };

/**
 * ⚠️ «بدون CTA» که v3.7 برای پست آموزشی مجاز کرده، اینجا گزینه نیست:
 * اسلاید/فریم آخرِ کاروسل و استوری ساختاراً «قدم بعدی» است و رندرکننده
 * آن را با رنگ اقدام می‌کشد (`roleFor`/`storyRoleFor`). نارنجی روی
 * اسلایدی که از مخاطب کاری نمی‌خواهد خودش نقض قاعده‌ی رنگ است. پس پست
 * آموزشی همیشه یکی از دو قدم نرمِ مجاز را می‌گیرد — هرگز CTAی فروش.
 */
export const INSTAGRAM_GOAL_CTAS: Record<ContentGoal, GoalCta[]> = {
  educational: [
    { id: "save", fa: "ذخیره‌اش کن", en: "Save this" },
    { id: "share", fa: "برای کسی بفرست", en: "Send this to someone" },
  ],
  sales: [
    {
      id: "bio-route-assessment",
      fa: "لینک ارزیابی مسیر در بایو است.",
      en: "The route assessment link is in our bio.",
    },
  ],
};

export function goalCtaIds(goal: ContentGoal): string[] {
  return INSTAGRAM_GOAL_CTAS[goal].map((c) => c.id);
}

/** بلوک پرامپتِ CTA بر اساس هدف — فارسی («تو») */
export function instagramCtaBlockFa(goal: ContentGoal): string {
  if (goal === "sales") {
    return `— قدم بعدی (پست فروش/تبدیل) —
فقط CTA اصلی، یک بار: «${INSTAGRAM_GOAL_CTAS.sales[0].fa}» — یا همین را با کلماتی خیلی نزدیک و «تو». CTAی دیگری کنارش نگذار.`;
  }
  return `— قدم بعدی (پست آموزشی) —
این پست نباید بفروشد. CTA فقط یکی از این دو، هماهنگ با همین پست: «${INSTAGRAM_GOAL_CTAS.educational[0].fa}» یا «${INSTAGRAM_GOAL_CTAS.educational[1].fa}» — مثلاً «ذخیره‌اش کن تا قبل از شروع، این سه سؤال را از خودت بپرسی.»
⚠️ «لینک ارزیابی مسیر در بایو است»، «ارزیابی اولیه‌تان را شروع کنید» یا هر دعوت به خرید/رزرو اینجا ممنوع است. هیچ پستی دو CTA ندارد.`;
}

/** بلوک پرامپتِ CTA بر اساس هدف — انگلیسی */
export function instagramCtaBlockEn(goal: ContentGoal): string {
  if (goal === "sales") {
    return `— Next step (sales/conversion post) —
Only the main call to action, once: "${INSTAGRAM_GOAL_CTAS.sales[0].en}" (or very close wording). No second call to action.`;
  }
  return `— Next step (educational post) —
This post must not sell. The call to action is one of: "${INSTAGRAM_GOAL_CTAS.educational[0].en}" or "${INSTAGRAM_GOAL_CTAS.educational[1].en}", tied to this post — e.g. "Save this so you can ask yourself these three questions before you start."
Never "the link is in our bio", "start your initial assessment" or any booking/buying prompt here. One call to action per post, never two.`;
}
