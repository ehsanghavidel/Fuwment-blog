/**
 * لایه‌ی رندر دعوت‌به‌اقدام برای پرامپت‌ها.
 *
 * ⚠️ فهرست CTAها اینجا زندگی نمی‌کند — در company.ts (BRAND_CTAS) است.
 * دلیلش: CTA یک «قاعده‌ی کسب‌وکار» است، نه بخشی از هنر نویسندگی، و هر
 * کانالی (بلاگ، اینستاگرام، لینکدین، ریلز) باید از یک منبع واحد بخواند.
 * دو فهرست موازی یعنی دو برند.
 *
 * این فایل فقط سه کار می‌کند:
 * ۱. فهرست را برای تزریق به پرامپت رندر می‌کند.
 * ۲. شناسه‌های مجاز را برای چک قطعی بیرون می‌دهد.
 * ۳. تفکیک direct/transitional را به شکل قابل‌بررسی در کد نگه می‌دارد.
 *
 * دو قاعده‌ی برند که اینجا اعمال می‌شوند:
 * - در هر محتوا حداکثر **یک** دعوت مستقیم (direct). دعوت واسط
 *   (transitional) می‌تواند کنارش بیاید.
 * - هر دعوت واسط قفلِ یک مسیر است. «تست خوانایی» در محتوای سطح برند یا
 *   کارآفرینی ممنوع است — مخاطب کارآفرین از همان اولین کلیک احساس می‌کند
 *   اینجا جای او نیست.
 *
 * همه‌ی توابع یک `route` اختیاری می‌گیرند:
 * - با مسیر → فیلتر قطعی با ctasForRoute(). CTAی خارج از مسیر حتی به
 *   پرامپت هم نمی‌رسد، و چک قطعی هم ردش می‌کند.
 * - بدون مسیر → همه را نشان می‌دهیم و محدوده‌ی هرکدام را در متن می‌نویسیم؛
 *   رعایتش با مدل است، نه با کد.
 *
 * بریف بلاگ حالا `route` دارد. پایپ‌لاین ریلز استراتژیست ندارد و بریفش
 * دستی ساخته می‌شود، پس مسیرش اختیاری است و از ورودی اجرا می‌آید.
 */

import {
  BRAND_CTAS,
  ctasForRoute,
  type BrandCta,
  type BrandRoute,
  type CtaKind,
} from "@/lib/company";

export type { BrandCta, BrandRoute, CtaKind };

/**
 * برچسب فارسی هر مسیر، برای متن پرامپت.
 *
 * Record روی BrandRoute عمدی است: اگر مسیر جدیدی به union اضافه شود،
 * همین‌جا خطای کامپایل می‌گیریم به‌جای اینکه بی‌صدا از پرامپت جا بماند.
 */
const ROUTE_LABELS: Record<BrandRoute, string> = {
  brand: "سطح برند",
  "global-talent": "Global Talent",
  "innovator-founder": "Innovator Founder",
};

const ALL_ROUTES = Object.keys(ROUTE_LABELS) as BrandRoute[];

/** فهرست CTAهای مجاز — با مسیر فیلتر می‌شود، بدون مسیر همه. */
export function availableCtas(route?: BrandRoute): BrandCta[] {
  return route ? ctasForRoute(route) : BRAND_CTAS;
}

/** شناسه‌های مجاز — ورودی چک قطعی */
export function allowedCtaIds(route?: BrandRoute): string[] {
  return availableCtas(route).map((c) => c.id);
}

/** شناسه‌های دعوت مستقیم — برای اعمال قاعده‌ی «حداکثر یکی» */
export function directCtaIds(route?: BrandRoute): string[] {
  return availableCtas(route)
    .filter((c) => c.kind === "direct")
    .map((c) => c.id);
}

/** نوع یک CTA؛ اگر شناسه ناشناس باشد null */
export function ctaKindOf(id: string): CtaKind | null {
  return availableCtas().find((c) => c.id === id)?.kind ?? null;
}

/** محدوده‌ی مسیر یک CTA، به زبان آدمیزاد */
function routeScope(cta: BrandCta): string {
  if (cta.routes.length >= ALL_ROUTES.length) return "در همه‌ی مسیرها";
  const names = cta.routes.map((r) => ROUTE_LABELS[r]).join(" و ");
  return `فقط در محتوای ${names}`;
}

/** رندر فهرست برای تزریق به پرامپت */
export function ctaListBlock(route?: BrandRoute): string {
  const list = availableCtas(route);

  const render = (c: BrandCta, i: number) =>
    [
      `${i + 1}. ${c.label} (id: ${c.id})`,
      // وقتی مسیر معلوم است، «محدوده» حرف اضافه است — همه‌ی موارد فهرست
      // از قبل فیلتر شده‌اند و تکرارش فقط پرامپت را شلوغ می‌کند.
      route ? null : `   محدوده: ${routeScope(c)}`,
      c.note ? `   توضیح: ${c.note}` : null,
    ]
      .filter(Boolean)
      .join("\n");

  const direct = list.filter((c) => c.kind === "direct");
  const transitional = list.filter((c) => c.kind === "transitional");

  const header = route
    ? `مسیر این محتوا: ${ROUTE_LABELS[route]}. فهرست زیر از قبل به همین مسیر محدود شده — فقط از این‌ها انتخاب کن.\n\n`
    : "";

  const footer = route
    ? ""
    : `\n\n⚠️ «محدوده» را جدی بگیر: دعوتی را انتخاب کن که با مسیرِ همین محتوا هم‌خوان
باشد. اگر محتوا درباره‌ی Global Talent نیست، «تست خوانایی» را نیاور؛ اگر
درباره‌ی کسب‌وکار و بنیان‌گذاری نیست، «ارزیابی کسب‌وکار» را نیاور. وقتی مسیرِ
محتوا روشن نیست، سراغ دعوتی برو که در همه‌ی مسیرها مجاز است.`;

  return `${header}— دعوت مستقیم (direct) — در هر محتوا **حداکثر یکی** از این‌ها:
${direct.map(render).join("\n")}

— دعوت واسط (transitional) — می‌تواند کنار دعوت مستقیم بیاید:
${transitional.map(render).join("\n")}${footer}`;
}
