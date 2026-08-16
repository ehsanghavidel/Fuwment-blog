import type { Source } from "./types";

/**
 * قالب‌بندی نهایی مقاله — تاریخ به‌روزرسانی و فهرست منابع.
 *
 * چرا کد و نه مدل؟ همان دلیلی که چسباندن سه بخش اسکریپت ریلز کارِ ناشر
 * است: هر دوی این‌ها داده‌ی قطعی‌اند، نه تصمیم خلاقانه.
 *
 * - تاریخ: مدل تقویم ندارد. در اجراهای واقعی یا تاریخ جعلی می‌ساخت یا
 *   اصلاً نمی‌گذاشت. تاریخِ درست از رکورد پست می‌آید، نه از حدس مدل.
 * - منابع: URL از پاسخ Tavily می‌آید. اگر رونویسی‌اش را به مدل بسپاریم،
 *   تنها چیزی که اضافه کرده‌ایم احتمال URL جعلی است.
 *
 * هر دو **بعد از** چک‌های برند و ویراستار اعمال می‌شوند. این عمدی است:
 * تاریخ میلادی ارقام لاتین دارد و لینک‌ها پر از کاراکترند؛ اگر داخل
 * پیش‌نویس بودند، چکِ «ارقام فارسی» بی‌دلیل رد می‌شد و یک دور بازنویسی
 * گران راه می‌افتاد برای چیزی که خودِ کد نوشته است.
 */

/** ماه‌های شمسی — Intl نام ماه را می‌دهد ولی وابسته به نسخه‌ی ICU است */
const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

const GREGORIAN_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** ارقام لاتین → فارسی */
function toPersianDigits(n: number | string): string {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

/**
 * تاریخ شمسی، با ارقام فارسی.
 *
 * از `en-US-u-ca-persian` استفاده می‌کنیم و نه `fa-IR`: خروجی لاتین را
 * خودمان پارس می‌کنیم و نام ماه را از فهرست بالا برمی‌داریم، تا نتیجه
 * به تفاوت‌های ICU بین محیط‌ها (لوکال در برابر Vercel) وابسته نباشد.
 */
function formatJalali(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: "Asia/Tehran",
  }).formatToParts(d);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const month = JALALI_MONTHS[Number(get("month")) - 1] ?? "";
  // سال شمسی گاهی با پسوند دوره می‌آید؛ فقط رقم‌ها را می‌خواهیم
  const year = get("year").replace(/\D/g, "");
  return `${toPersianDigits(get("day"))} ${month} ${toPersianDigits(year)}`;
}

/**
 * تاریخ میلادی با ارقام لاتین — طبق شیوه‌نامه‌ی برند، تاریخ میلادی
 * (مثل قیمت و کد) لاتین می‌ماند و فارسی نمی‌شود.
 */
function formatGregorian(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: "Asia/Tehran",
  }).formatToParts(d);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")} ${GREGORIAN_MONTHS[Number(get("month")) - 1]} ${get("year")}`;
}

/** «آخرین به‌روزرسانی: ۲۵ مرداد ۱۴۰۵ (16 August 2026)» */
export function updatedAtLine(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `_آخرین به‌روزرسانی: ${formatJalali(d)} (${formatGregorian(d)})_`;
}

/** بخش «منابع» — عنوان‌ها به‌صورت لینک مارک‌داون */
export function sourcesSection(sources: Source[]): string {
  if (sources.length === 0) return "";
  const items = sources
    // پرانتز داخل عنوان، نحو لینک مارک‌داون را می‌شکند
    .map((s) => `- [${s.title.replace(/[[\]]/g, "")}](${s.url})`)
    .join("\n");
  return `## منابع\n\n${items}`;
}

/**
 * ترکیب نهایی: تاریخ بلافاصله بعد از H1، منابع در انتها.
 *
 * اگر مقاله H1 نداشت (که چکِ سئو جداگانه می‌گیردش)، تاریخ می‌رود بالای
 * متن — بهتر از انداختنش وسط پاراگراف اول.
 */
export function finalizeArticle(input: {
  contentMd: string;
  sources: Source[];
  updatedAt: string;
}): string {
  const body = input.contentMd.trim();
  const dateLine = updatedAtLine(input.updatedAt);
  const sources = sourcesSection(input.sources);

  let out = body;

  if (dateLine) {
    const h1 = body.match(/^# .*$/m);
    // خط خالی بین تاریخ و پاراگراف بعدی الزامی است: بدون آن، مارک‌داون
    // هر دو را یک پاراگراف می‌بیند و تاریخ به جمله‌ی اول مقاله می‌چسبد.
    out =
      h1 && body.startsWith(h1[0])
        ? `${h1[0]}\n\n${dateLine}\n\n${body.slice(h1[0].length).trimStart()}`
        : `${dateLine}\n\n${body}`;
  }

  return sources ? `${out.trimEnd()}\n\n${sources}\n` : `${out.trimEnd()}\n`;
}
