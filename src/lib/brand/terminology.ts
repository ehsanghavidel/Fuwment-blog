import { COMPANY_NAME, COMPANY_NAME_EN } from "./core";
import type { EnTerm } from "./claims";

/**
 * واژگان، شیوه‌نامه و مرزِ «زبان داخلی ↔ زبان مخاطب» — بخش ۰۴ v3.7.
 *
 * ⚠️ مهم‌ترین تغییر v3.7 همین مرز است: «استراتژی، پیام و موضع برند را از
 * Brand Guide بگیرید؛ اما زبان داخلی Brand Guide را مستقیماً وارد محتوای
 * مخاطب نکنید.» فهرست‌های این فایل هم پرامپت را می‌سازند و هم چک قطعی
 * `agents/brand-checks.ts` را — یک منبع.
 */

/* ── واژگان نادرست ───────────────────────────────────────── */

export const WRONG_TERMS_FA: { term: string; why: string }[] = [
  { term: "فیومنت", why: `املای غلط نام برند — درستش «${COMPANY_NAME}» است` },
  { term: "فوومنت", why: `املای غلط نام برند — درستش «${COMPANY_NAME}» است` },
  { term: "ویزای نخبگان", why: "نام غلط مسیر — درستش «ویزای گلوبال تلنت» است" },
  { term: "تاییدیه نخبگی", why: "ترجمه‌ی غلط — «اندورسمنت» درست است، بار اول با توضیح کوتاه فارسی" },
  { term: "تأییدیه نخبگی", why: "ترجمه‌ی غلط — «اندورسمنت» درست است، بار اول با توضیح کوتاه فارسی" },
  {
    term: "وکیل",
    why: "مرز حقوقی — مشاور ثبت‌شده در IAA لزوماً وکیل نیست و این دو نظام صنفی جدا هستند. همه‌جا «مشاور مهاجرتی ثبت‌شده»",
  },
  { term: "مشتری", why: "در محتوای عمومی «متقاضی» یا «همراه» درست است — «مشتری» فاصله می‌سازد" },
  { term: "مشتریان", why: "در محتوای عمومی «متقاضیان» یا «همراهان» درست است" },
  { term: "مشاوره رایگان", why: "این خدمت وجود ندارد — نام درستش «ارزیابی اولیه» است" },
  { term: "مشاوره‌ی رایگان", why: "این خدمت وجود ندارد — نام درستش «ارزیابی اولیه» است" },
  { term: "مشاورهٔ رایگان", why: "این خدمت وجود ندارد — نام درستش «ارزیابی اولیه» است" },
];

export const WRONG_TERMS_EN: EnTerm[] = [
  { term: "Fuwement", why: `brand-name misspelling — it is «${COMPANY_NAME_EN}»` },
  { term: "Fuwmnet", why: `brand-name misspelling — it is «${COMPANY_NAME_EN}»` },
  { term: "Fuvment", why: `brand-name misspelling — it is «${COMPANY_NAME_EN}»` },
  { term: "FUWMENT", why: `all-caps is for the logo only — «${COMPANY_NAME_EN}»`, cs: true },
  { term: "FuWment", why: `capitalisation — «${COMPANY_NAME_EN}»`, cs: true },
  { term: "Elite visa", why: "wrong route name — «Global Talent visa»" },
  { term: "Genius visa", why: "wrong route name — «Global Talent visa»" },
  { term: "Exceptional Talent visa", why: "former route name — «Global Talent visa»" },
  { term: "client", why: "«applicant» in public content (the metric label is Consultations, never Clients)" },
  { term: "clients", why: "«applicants» in public content (the metric label is Consultations, never Clients)" },
  { term: "free consultation", why: "this service does not exist — it is «initial assessment»" },
  { term: "permanent residency", why: "non-UK concept — «Indefinite Leave to Remain (ILR)»" },
  { term: "green card", why: "non-UK concept" },
  { term: "sponsorship", why: "Global Talent needs no sponsor — check this is not a Skilled Worker mix-up" },
  { term: "expert", why: "expertise claim without a verifiable title — prefer «mentor»" },
];

/* ── واژگان داخلی — هرگز در متن مخاطب ───────────────────── */

/**
 * عبارت‌های داخلیِ چندواژه‌ای که تطبیقشان روی متن مخاطب خطای کاذب
 * نمی‌دهد. همه از v3.7 آمده‌اند («فقط داخلی — هرگز در محتوای مخاطب» و
 * «واژگان داخلی برند، به‌طور پیش‌فرض متن مخاطب نیست»).
 *
 * ⚠️ واژه‌های تکی «قهرمان»، «راهنما»، «دشمن» و «المان» عمداً اینجا
 * **نیستند**، با اینکه v3.7 هم ممنوعشان کرده: در فارسی روزمره بی‌نهایت
 * رایج‌اند («راهنمای رسمی Home Office»، «قهرمان المپیک») و تطبیقشان متن
 * سالم را رد می‌کرد (قاعده‌ی ۲ پروژه). این‌ها به روبریک ویراستار سپرده
 * شده‌اند. همین‌طور «خوانا/خوانایی» تکی — «تست خوانایی» نام رسمی یک
 * پیشنهاد است و به‌عنوان برچسب لینک مجاز.
 *
 * «پرونده‌ی قابل دفاع» فقط وقتی بخشی از تگ‌لاین رسمی است مجاز است؛ چک
 * قطعی پیش از سنجیدن، تگ‌لاین را از متن کنار می‌گذارد.
 */
export const INTERNAL_TERMS_FA: { term: string; plain: string }[] = [
  { term: "شکاف خوانایی", plain: "«دستاورد دارید، ولی معلوم نیست کدامش برای پرونده‌تان ارزش دارد»" },
  { term: "شکافِ خوانایی", plain: "«دستاورد دارید، ولی معلوم نیست کدامش برای پرونده‌تان ارزش دارد»" },
  { term: "مسیر خوانا", plain: "«شش قدم روشن، از ارزیابی تا ثبت درخواست»" },
  { term: "پیمان فومنت", plain: "«اگر مسیر به شما نخورد، همان اول می‌گوییم»" },
  { term: "ارزیابی ساختاریافته", plain: "«با هم می‌بینیم سابقه‌تان چقدر برای این مسیر آماده است»" },
  { term: "پرونده‌ی قابل دفاع", plain: "«پرونده‌ای که هر ادعایش مدرک دارد»" },
  { term: "پرونده قابل دفاع", plain: "«پرونده‌ای که هر ادعایش مدرک دارد»" },
  { term: "پرونده‌ای قابل دفاع", plain: "«پرونده‌ای که هر ادعایش مدرک دارد»" },
  { term: "سفر مخاطب", plain: "(واژه‌ی داخلی — از تجربه‌ی خودِ مخاطب حرف بزن)" },
  { term: "سطح درونی مشکل", plain: "(واژه‌ی داخلی — حال مخاطب را بنویس، نه نامش را)" },
  { term: "زیراسکریپت", plain: "(واژه‌ی داخلی)" },
  { term: "زیر‌اسکریپت", plain: "(واژه‌ی داخلی)" },
  { term: "لید مگنت", plain: "(واژه‌ی داخلی — نام خودِ پیشنهاد را بگو، مثل «ارزیابی مسیر»)" },
  { term: "قیف فروش", plain: "(واژه‌ی داخلی)" },
];

/**
 * واژه‌های داخلیِ لاتین — در متن فارسی و انگلیسیِ مخاطب، هر دو.
 *
 * «CTA» حساس به حروف بزرگ است تا با «cta» در شناسه‌ها قاطی نشود؛ بقیه
 * بی‌حساس. «funnel» و «customer journey» در انگلیسیِ روزمره کاربرد دیگری
 * هم دارند، ولی در محتوای عمومیِ یک خدمت مهاجرتی تقریباً همیشه همان
 * زبان بازاریابی‌اند که v3.7 ممنوع کرده.
 */
export const INTERNAL_TERMS_LATIN: EnTerm[] = [
  { term: "BrandScript", why: "internal StoryBrand term" },
  { term: "SB7", why: "internal StoryBrand term" },
  { term: "StoryBrand", why: "internal method name" },
  { term: "sub-script", why: "internal StoryBrand term" },
  { term: "CTA", why: "internal marketing term", cs: true },
  { term: "lead magnet", why: "internal marketing term — name the offer itself (route assessment)" },
  { term: "sales funnel", why: "internal marketing term" },
  { term: "funnel", why: "internal marketing term" },
  { term: "customer journey", why: "internal term" },
  { term: "legibility gap", why: "internal concept name — describe the reader's situation instead" },
  { term: "Fuwment Pact", why: "internal name — state the promise itself" },
];

/** تگ‌لاین رسمی — تنها جای مجازِ عبارت «پرونده‌ی قابل دفاع» در متن مخاطب */
export const MAIN_TAGLINE_FA = "مسیر درست، پرونده‌ی قابل دفاع.";

/* ── لاتین در اینستاگرام فارسی ───────────────────────────── */

/**
 * v3.7: «حروف لاتین — فقط این دو جا: امضای Fuwment · شماره ثبت و
 * راستی‌آزمایی IAA.» هر چیز دیگری در اینستاگرام فارسی با حروف فارسی.
 */
export const LATIN_ALLOWED_IN_FA_INSTAGRAM: RegExp[] = [
  new RegExp(`\\b${COMPANY_NAME_EN}\\b`, "g"),
  /\bF202639410\b/g,
  /\bIAA\b/g,
  /\bImmigration Advice Authority\b/g,
];

/** نام‌های رسمی که در اینستاگرام فارسی **همیشه** با حروف فارسی می‌آیند */
export const PERSIAN_SCRIPT_TERMS = [
  "گلوبال تلنت",
  "اینوویتور فاندر",
  "اندورسمنت",
  "منتور",
  "ویزا",
  "لینکدین",
  "هوم آفیس",
];

/* ── متن پرامپت ──────────────────────────────────────────── */

/** واژگان و شیوه‌نامه‌ی فارسی — مشترک همه‌ی کانال‌های فارسی */
export const TERMINOLOGY_FA = `واژگان — درست در برابر نادرست:
- ${COMPANY_NAME} ✓ | فیومنت، فوومنت ✗ · ${COMPANY_NAME_EN} ✓ | FUWMENT، FuWment ✗ (تمام‌بزرگ فقط در لوگو)
- منتور ✓ | مشاور، وکیل ✗ (تفکیک نقش حقوقی حیاتی است؛ «مشاور» فقط در «مشاور مهاجرتی ثبت‌شده»)
- متقاضی / همراه ✓ | مشتری ✗ (در محتوای عمومی). «همراه» فقط یعنی متقاضی، نه همکار.
- ویزای گلوبال تلنت ✓ | ویزای نخبگان ✗
- اندورسمنت ✓ | تاییدیه نخبگی ✗ — ترجمه نمی‌شود؛ بار اول با توضیح کوتاه فارسی: «تأییدیه‌ای که پیش از ویزا لازم است».
- ارزیابی اولیه ✓ | مشاوره‌ی رایگان ✗
- «دستاورد» واژه‌ی رسمی برند است؛ در لحن گرم می‌شود گفت «آنچه ساخته‌ای/ساخته‌اید».
- «مسیر» برای روت ویزا و برای مراحل کار. «پرونده» بیشتر در گفت‌وگوی فنی.
واژه‌ی انگلیسی فقط وقتی معادل فارسی طبیعی ندارد. به‌جای Evidence «مدارک»، Pathway/Route «مسیر»، Eligibility «واجد شرایط بودن»، Case «پرونده»، Deadline «مهلت»، Assessment «ارزیابی»، Impact «تأثیر»، Roadmap «نقشه‌ی راه»، Application «درخواست»، Mentoring session «جلسه با منتور».`;

/** مرز زبان داخلی و زبان مخاطب — مشترک همه‌ی کانال‌ها و زبان‌ها */
export const INTERNAL_LANGUAGE_RULE_FA = `⚠️ زبان داخلی برند هرگز متن مخاطب نیست.
پیام و موضع را از برند بگیر، ولی این واژه‌ها را در متنی که مخاطب می‌بیند نیاور — مفهومشان را با زبان خود مخاطب بگو:
${INTERNAL_TERMS_FA.filter((t, i, all) => all.findIndex((x) => x.plain === t.plain) === i)
  .map((t) => `- «${t.term}» → ${t.plain}`)
  .join("\n")}
- همچنین: قهرمان، راهنما، دشمن، المان، BrandScript، SB7، CTA، Positioning، قیف — همه فقط داخلی‌اند.
استثناها: تگ‌لاین رسمی «${MAIN_TAGLINE_FA}» فقط در جای امضا (پایان ویدیو، فوتر، بایو، اسلاید آخر) — هرگز به‌جای کاور یا قلاب؛ و نام پیشنهادها به‌عنوان برچسب دکمه/لینک (مثل «ارزیابی مسیر»، «تست خوانایی»).`;

export const INTERNAL_LANGUAGE_RULE_EN = `⚠️ Internal brand language is never audience copy.
Take the position and message from the brand, but never surface its internal vocabulary: no "BrandScript", "SB7", "StoryBrand", "CTA", "funnel", "lead magnet", "customer journey", "legibility gap", "Fuwment Pact", "hero", "guide", "villain". Say the idea in the reader's own words instead. Offer names may appear as a button or link label (e.g. "route assessment").`;
