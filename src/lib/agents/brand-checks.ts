/**
 * چک‌های قطعی برند — بدون LLM.
 *
 * همان اصلِ seo-checks.ts و social-checks.ts: قاعده‌ای که مکانیکی است را
 * با کد بسنج، نه با مدل. سه اجرای آزمایشی نشان داد مدل قواعد سختِ برندگاید
 * را قابل‌اعتماد رعایت نمی‌کند — و این‌ها دقیقاً قواعدی‌اند که «تقریباً
 * درست» برایشان معنی ندارد: یک «تضمینی» در متن، یک ادعای حقوقی است.
 *
 * ⚠️ مرزِ این فایل: فقط چیزی اینجا می‌آید که با تطبیق متنیِ بی‌ابهام قابل
 * تشخیص باشد. «آیا لحن توانمندساز است؟» یا «آیا برند قهرمان شده؟» قضاوت‌اند
 * و کار روبریک ویراستارند. چکِ قطعیِ غلط بدتر از نداشتن چک است: بازنویسی
 * بی‌دلیل راه می‌اندازد و به مدل می‌گوید چیزی را درست کند که خراب نیست.
 */

import { COMPANY_NAME, COMPANY_NAME_EN } from "@/lib/company";

/**
 * شدت یک چک — تعیین می‌کند شکستش بازنویسی کامل را اجباری می‌کند یا نه.
 *
 * ⚠️ این تفکیک از یک اندازه‌گیری واقعی درآمد: در یک اجرا، ویراستار همان
 * پاس اول تأیید کرد ولی یک چکِ **واژگانی** («مشتریان») دو دور بازنویسی
 * کامل را اجباری کرد — ۶۶ ثانیه از ۲۰۱ ثانیه‌ی کل اجرا. نویسنده هم در
 * دور اول اصلاحش نکرد و امتیاز ویراستار در دور آخر از ۸۸ به ۸۲ افت کرد.
 * یعنی یک‌سومِ زمان خرج شد تا یک واژه عوض شود و کیفیت کمی پایین بیاید.
 *
 * - `blocking`: ادعا، مرز حقوقی، و برندمحوری. این‌ها اگر منتشر شوند
 *   مسئله‌ی واقعی می‌سازند، پس ارزش یک دور بازنویسی را دارند.
 * - `advisory`: واژگان و نگارش. به ویراستار گزارش می‌شوند و جلوی انتشار
 *   خودکار را می‌گیرند، ولی به‌تنهایی بازنویسی راه نمی‌اندازند.
 */
export type CheckSeverity = "blocking" | "advisory";

export type BrandCheck = {
  name: string;
  pass: boolean;
  note: string;
  severity: CheckSeverity;
};

/** چک‌های ردشده‌ای که باید بازنویسی را اجباری کنند */
export function blockingFailures(checks: BrandCheck[]): BrandCheck[] {
  return checks.filter((c) => !c.pass && c.severity === "blocking");
}

/**
 * نام‌های برند، از company.ts نه hardcode.
 *
 * (بقیه‌ی این فایل هنوز «فومنت» را در چند جا مستقیم نوشته — آن‌ها فهرست
 * املاهای غلط‌اند و ربطی به نام جاری ندارند. این یکی باید از منبع بیاید،
 * چون اگر نام برند عوض شود این چک بی‌صدا از کار می‌افتد.)
 */
const BRAND_NAMES = [COMPANY_NAME, COMPANY_NAME_EN];

/* ── کمکی‌ها ─────────────────────────────────────────────── */

/**
 * حذف قطعه‌هایی از مارک‌داون که نباید سنجیده شوند.
 *
 * لازم است چون متن ورودی مارک‌داونِ مقاله است: URL، کدبلاک و کد درون‌خطی
 * پر از رقم و واژه‌ی لاتین‌اند و اگر پاکشان نکنیم، چکِ «ارقام لاتین» روی
 * هر مقاله‌ای که یک لینک دارد رد می‌شود.
 */
function stripNonProse(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/\]\([^)]*\)/g, "] ")
    .replace(/https?:\/\/\S+/g, " ");
}

/** ساخت الگوی «کلمه‌ی کامل» فارسی — جلوی تطبیق داخل کلمه را می‌گیرد */
const BOUNDARY = `[\\s،.!?؟:؛«»()"'\\-–—\\n]`;
function wholeWord(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|${BOUNDARY})${escaped}($|${BOUNDARY})`);
}

/** کدام موارد فهرست در متن آمده‌اند */
function findTerms(text: string, terms: string[]): string[] {
  return terms.filter((t) => wholeWord(t).test(text));
}

/**
 * مثل wholeWord، اما پسوندهای رایج فارسی را هم می‌پذیرد.
 *
 * ⚠️ لازم است چون فارسی پسوند را می‌چسباند: «فوق‌العاده‌ای»، «بی‌نظیری»،
 * «بهترین‌ها»، «بهترینِ». تطبیقِ کلمه‌کامل روی این‌ها شکست می‌خورد چون
 * کاراکتر بعدی حرف است نه مرز — و چکی که «نتایج فوق‌العاده‌ای گرفته‌ایم»
 * را نگیرد، عملاً وجود ندارد.
 *
 * برای صفت‌ها استفاده می‌شود، نه برای فهرست‌هایی مثل واژگان برند که
 * تطبیق دقیق‌شان عمدی است.
 */
const PERSIAN_SUFFIX = "(?:\\u200c?(?:های|ها|ای|یی|ی|ترین|تر|اش|شان|تان|مان))?[\\u064B-\\u0652]?";
function wordWithSuffix(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|${BOUNDARY})${escaped}${PERSIAN_SUFFIX}($|${BOUNDARY})`);
}

/* ── کمک‌کننده‌های انگلیسی ────────────────────────────────── */

/**
 * مرز کلمه‌ی انگلیسی. \b استاندارد کافی نیست چون عبارت‌های ما چنداژه‌ای‌اند
 * و بعضی‌شان علامت دارند (#1، 100%).
 */

/** `cs: true` یعنی تطبیق حساس به بزرگی و کوچکی حروف — برای املای نام برند */
type EnTerm = { term: string; why: string; cs?: boolean };

function wholeWordEn(term: string, caseSensitive = false): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(^|[^A-Za-z0-9])${escaped}(?![A-Za-z0-9])`,
    caseSensitive ? "" : "i"
  );
}

function findTermsEn(text: string, list: EnTerm[]): EnTerm[] {
  return list.filter((t) => wholeWordEn(t.term, t.cs).test(text));
}

/* ── الف) ادعاهای ممنوع ──────────────────────────────────── */

/**
 * این‌ها ادعای حقوقی‌اند، نه سلیقه‌ی نگارشی. قواعد ادعا در BRAND_VOICE بر
 * همه‌ی قواعد دیگر اولویت دارند و در تبلیغات بریتانیا قابل شکایت‌اند.
 */
const FORBIDDEN_CLAIMS: { term: string; why: string }[] = [
  { term: "تضمینی", why: "تضمین نتیجه — هیچ نتیجه‌ای در این مسیرها تضمین نمی‌شود" },
  { term: "تضمین", why: "تضمین نتیجه — هیچ نتیجه‌ای در این مسیرها تضمین نمی‌شود" },
  { term: "۱۰۰٪", why: "ادعای قطعیت مطلق" },
  { term: "۱۰۰ درصد", why: "ادعای قطعیت مطلق" },
  { term: "100٪", why: "ادعای قطعیت مطلق" },
  { term: "100%", why: "ادعای قطعیت مطلق" },
  { term: "قطعی", why: "ادعای قطعیت — قوانین این مسیرها تغییر می‌کنند" },
  { term: "بدون ریسک", why: "ادعای قطعیت مطلق" },
  { term: "تا دیر نشده", why: "ادبیات ترس — قهرمان ما از موضع جاه‌طلبی می‌آید، نه اضطرار" },
  { term: "آخرین فرصت", why: "ادبیات ترس" },
  { term: "نرخ موفقیت بالا", why: "ادعای نرخ موفقیت — حتی بدون عدد هم ادعای عددی است" },
  { term: "نرخ موفقیت", why: "ادعای نرخ موفقیت — نه عدد، نه معادل کیفی‌اش منتشر نمی‌شود" },
  { term: "اکثر قریب‌به‌اتفاق", why: "ادعای نرخ موفقیت با بیان جایگزین" },
  { term: "اکثر قریب به اتفاق", why: "ادعای نرخ موفقیت با بیان جایگزین" },
];

function checkForbiddenClaims(text: string): BrandCheck {
  const hits = FORBIDDEN_CLAIMS.filter((c) => wholeWord(c.term).test(text));
  return {
    name: "ادعاهای ممنوع",
    severity: "blocking",
    pass: hits.length === 0,
    note:
      hits.length === 0
        ? "هیچ ادعای تضمینی یا نرخ موفقیت در متن نیست"
        : hits.map((h) => `«${h.term}» — ${h.why}`).join(" | ") +
        " | جایگزین مجاز: «کاری می‌کنیم پرونده در بهترین شکل ممکن ارائه شود.»",
  };
}

/* ── ب) واژگان نادرست ────────────────────────────────────── */

const WRONG_TERMS: { term: string; why: string }[] = [
  { term: "فیومنت", why: "املای غلط نام برند — درستش «فومنت» است" },
  { term: "فوومنت", why: "املای غلط نام برند — درستش «فومنت» است" },
  { term: "ویزای نخبگان", why: "نام غلط مسیر — درستش «ویزای گلوبال تلنت (Global Talent)» است" },
  { term: "تاییدیه نخبگی", why: "ترجمه‌ی غلط — «اندورسمنت (Endorsement)» ترجمه نمی‌شود" },
  { term: "تأییدیه نخبگی", why: "ترجمه‌ی غلط — «اندورسمنت (Endorsement)» ترجمه نمی‌شود" },
  {
    term: "وکیل",
    why: "مرز حقوقی — مشاور ثبت‌شده در IAA لزوماً وکیل نیست و این دو نظام صنفی جدا هستند. همه‌جا «مشاور مهاجرتی ثبت‌شده»",
  },
  { term: "مشتری", why: "در محتوای عمومی «متقاضی» یا «همراه» درست است" },
  { term: "مشتریان", why: "در محتوای عمومی «متقاضیان» یا «همراهان» درست است" },
  { term: "مشاوره رایگان", why: "این خدمت وجود ندارد — نام درستش «ارزیابی اولیه» است" },
  { term: "مشاوره‌ی رایگان", why: "این خدمت وجود ندارد — نام درستش «ارزیابی اولیه» است" },
  { term: "مشاورهٔ رایگان", why: "این خدمت وجود ندارد — نام درستش «ارزیابی اولیه» است" },
];

/**
 * «مشاور» جدا سنجیده می‌شود.
 *
 * چرا؟ چون این واژه فقط وقتی غلط است که به نقش فومنت اشاره کند؛ در
 * «مشاور مهاجرتی ثبت‌شده» و «مشاور authorised» — که خودِ برندگاید الزامشان
 * کرده — کاملاً درست است. تطبیق سرراستِ «مشاور» هر دو را با هم می‌گرفت و
 * متنِ سالم را رد می‌کرد. پس فقط ترکیب‌هایی را می‌گیریم که نقش فومنت را
 * «مشاور» می‌نامند، و شکل‌های مجاز را صریح استثنا می‌کنیم.
 */
const ALLOWED_MOSHAVER = /مشاور(ان)?\s+(مهاجرتی|authorised|ثبت‌شده|رسمی)/;
const ROLE_MOSHAVER = /(مشاورانِ?|مشاوران|مشاورِ?)\s+(ما|فومنت)|فومنت\s+مشاور/;

function checkWrongTerms(text: string): BrandCheck {
  const hits = WRONG_TERMS.filter((t) => wholeWord(t.term).test(text)).map(
    (h) => `«${h.term}» — ${h.why}`
  );

  // «مشاور» در نقش فومنت، فقط وقتی شکل مجازش در همان جمله نباشد
  if (ROLE_MOSHAVER.test(text) && !ALLOWED_MOSHAVER.test(text)) {
    hits.push(
      "«مشاور» در اشاره به نقش فومنت — واژه‌ی درست «منتور» است. «مشاور» فقط در «مشاور مهاجرتی ثبت‌شده» مجاز است"
    );
  }

  return {
    name: "واژگان برند",
    severity: "advisory",
    pass: hits.length === 0,
    note: hits.length === 0 ? "واژگان با راهنمای برند هم‌خوان است" : hits.join(" | "),
  };
}

/* ── ج) روایت ممنوع درباره‌ی دشمن ────────────────────────── */

/**
 * ⚠️ محدوده‌ی این چک را دست‌کم نگیرید.
 *
 * «آیا این متن القا می‌کند معیارها پنهان‌اند؟» یک قضاوت معنایی است و با
 * تطبیق متنی قابل تشخیص نیست. این چک فقط **فرمول‌بندی‌های صریحی** را
 * می‌گیرد که خودِ برندگاید نام برده. نسخه‌ی معنایی‌اش کار روبریک ویراستار
 * است، نه این فایل — همان درسی که در social-checks.ts سرِ «آیا دعوت به
 * اقدام دارد؟» گرفتیم.
 *
 * چرا اصلاً ممنوع است: این جمله‌ها القا می‌کنند هر کسی واجد شرایط است و
 * فقط بلد نیست خودش را بفروشد. معیارها منتشر شده‌اند؛ کار سخت، تطبیق یک
 * تجربه‌ی واقعی با آن‌هاست.
 */
const FORBIDDEN_NARRATIVE: RegExp[] = [
  /معیارها(ی[\s\S]{0,20})?\s*(نامرئی|پنهان|مخفی|نامعلوم)/,
  /(نامرئی|پنهان|مخفی)\s*(بودنِ?|است)?\s*معیار/,
  /سیستم\s*(خوانا نیست|ناخوانا)/,
  /قواعد\s*(بازی\s*)?(پنهان|نامرئی)/,
  /فقط\s*(باید\s*)?(کافی است\s*)?دستاوردت?ان?\s*را\s*ترجمه/,
  /فقط\s*(یک\s*)?مسئله‌?ی?\s*(ترجمه|ارائه|روایت)\s*است/,
  /مسئله\s*فقط\s*(ترجمه|ارائه|نحوه‌ی ارائه)\s*است/,
];

/**
 * «ترجمه» وقتی موضوعش دستاورد است، نه سند.
 *
 * چرا جدا از FORBIDDEN_NARRATIVE: آن فهرست دنبال جمله‌ی کاملِ «فقط باید
 * دستاوردت را ترجمه کنی» بود. ولی در یک اجرای واقعی، مقاله سه بار از
 * همین واژه استفاده کرد — یک بار به‌عنوان تیتر بخش — بدون اینکه آن جمله‌ی
 * دقیق را بسازد. خودِ قاب‌بندی مسئله است: «ترجمه» یعنی محتوا حاضر است و
 * فقط زبانش غلط است، که همان القای «هر کسی واجد شرایط است» را می‌کند.
 *
 * ⚠️ ترجمه‌ی واقعی نباید رد شود. «ترجمه‌ی مدارک»، «ترجمه‌ی رسمی» و
 * «مترجم» کاربردهای مشروع‌اند و در مسیر مهاجرت واقعاً لازم می‌شوند. پس
 * به‌جای گرفتنِ خودِ واژه، فقط جایی را می‌گیریم که مفعولش از واژگان
 * «دستاورد» برند باشد.
 */
const ACHIEVEMENT_WORDS = "(?:دستاورد|تجربه|سابقه|تاثیر|تأثیر|توانایی)";

/**
 * واژه‌های سند. اگر داخل عبارتِ گیرافتاده باشند، یعنی حرف از ترجمه‌ی
 * واقعی است نه قاب‌بندی دستاورد — و نباید رد شود.
 * نمونه‌ای که بدون این استثنا رد می‌شد: «تجربه‌تان را بنویسید و مدارک را
 * برای ترجمه بفرستید».
 */
const DOCUMENT_WORDS = /مدرک|مدارک|سند|اسناد|مترجم|رسمی|متن|مقاله/;

const TRANSLATION_FRAMING: RegExp[] = [
  // «ترجمه‌ی دستاورد»، «ترجمهٔ تجربه» — شامل حالت تیتر بخش
  new RegExp(`ترجمه[\\s\\u200cیٔ‌]*${ACHIEVEMENT_WORDS}`),
  // «دستاوردتان را ترجمه کنید» و «تجربه‌تان را به زبان معیارها ترجمه کنید».
  // فاصله‌ی بعد از «را» عمداً باز است، چون در جمله‌ی واقعی معمولاً یک
  // قید وسطش می‌آید؛ مرز جمله نگه داشته می‌شود تا از جمله‌ی بعدی نپرد.
  new RegExp(`${ACHIEVEMENT_WORDS}[^.!?؟\\n]{0,60}را[^.!?؟\\n]{0,40}ترجمه`),
];

function checkTranslationFraming(text: string): BrandCheck {
  const hits = TRANSLATION_FRAMING.map((re) => text.match(re)?.[0]?.trim())
    .filter((m): m is string => Boolean(m))
    .filter((m) => !DOCUMENT_WORDS.test(m));

  return {
    name: "قاب‌بندی «ترجمه»",
    severity: "blocking",
    pass: hits.length === 0,
    note:
      hits.length === 0
        ? "«ترجمه» در بافت دستاورد استفاده نشده"
        : `${hits.map((h) => `«${h}»`).join("، ")} — دستاورد «ترجمه» نمی‌شود. این قاب‌بندی القا می‌کند محتوا حاضر است و فقط زبانش غلط است، یعنی هر کسی واجد شرایط است. کار سخت، تطبیق یک تجربه‌ی واقعی با معیارهاست، نه برگرداندن آن. (ترجمه‌ی مدارک و ترجمه‌ی رسمی مشکلی ندارند.)`,
  };
}

function checkForbiddenNarrative(text: string): BrandCheck {
  const hits = FORBIDDEN_NARRATIVE.map((re) => text.match(re)?.[0]?.trim()).filter(
    (m): m is string => Boolean(m)
  );

  return {
    name: "روایت دشمن داستان",
    severity: "blocking",
    pass: hits.length === 0,
    note:
      hits.length === 0
        ? "متن ادعا نمی‌کند معیارها نامرئی‌اند یا مسئله فقط ارائه است"
        : `${hits.map((h) => `«${h}»`).join("، ")} — این روایت ممنوع است: القا می‌کند هر کسی واجد شرایط است و فقط بلد نیست خودش را ارائه کند. جمله‌ی درست: «گاهی مشکل نحوه‌ی ارائه است؛ گاهی مسیر مناسب نیست. کار ما این است که این تفاوت را زود مشخص کنیم.»`,
  };
}

/* ── د) ارقام لاتین در متن فارسی ─────────────────────────── */

/**
 * قاعده: متن فارسی ارقام فارسی. استثناها (قیمت، کد، تاریخ میلادی) عمداً
 * سخاوتمندانه گرفته شده‌اند — رد کردنِ اشتباهِ یک مقاله‌ی سالم گران‌تر از
 * ردنکردنِ یک رقم لاتینِ جامانده است.
 */
function checkLatinDigits(md: string): BrandCheck {
  const text = stripNonProse(md)
    // قیمت: £2,400 / $1,200 / €900
    .replace(/[£$€]\s?[\d,.]+/g, " ")
    // کد: رقم چسبیده به حرف لاتین، مثل F202639410 یا IAA2024
    .replace(/[A-Za-z]+[\d][\w-]*/g, " ")
    .replace(/[\d][\w-]*[A-Za-z]+/g, " ")
    // سال میلادی چهاررقمی
    .replace(/\b(19|20)\d{2}\b/g, " ")
    // شماره‌گذاری خودِ مارک‌داون در ابتدای خط
    .replace(/^\s*\d+[.)]\s/gm, " ");

  const found = [...new Set(text.match(/\d+/g) ?? [])];
  return {
    name: "ارقام فارسی",
    severity: "advisory",
    pass: found.length === 0,
    note:
      found.length === 0
        ? "ارقام متن فارسی‌اند"
        : `رقم لاتین در متن فارسی: ${found.slice(0, 8).join("، ")} — متن فارسی ارقام فارسی می‌گیرد (۳ تا ۵ سال). فقط قیمت، کد و تاریخ میلادی لاتین می‌مانند`,
  };
}

/* ── ز) صفت‌های تبلیغاتی مطلق ────────────────────────────── */

/**
 * برندگاید: «ادعای برتری مطلق نیازمند مدرک است و در تبلیغات بریتانیا
 * قابل شکایت.» جایگزین امن: «تمام تمرکز ما روی مسیرهای استعداد و
 * کارآفرینی بریتانیاست.»
 */
const SUPERLATIVES = ["بی‌نظیر", "بی نظیر", "بی‌همتا", "بی همتا", "فوق‌العاده", "فوق العاده"];

/**
 * «بهترین» یک استثنای حیاتی دارد.
 *
 * ⚠️ عبارت «در بهترین شکل ممکن» خودش جایگزینِ **مجازِ** برندگاید برای
 * ادعای تضمین است («کاری می‌کنیم پرونده در بهترین شکل ممکن ارائه شود»).
 * تطبیق سرراستِ «بهترین» همان جمله‌ای را رد می‌کرد که برند توصیه‌اش کرده —
 * چکی که متن درست را جریمه کند، مدل را به سمت نوشتن بدتر هل می‌دهد.
 */
const BEST_ALLOWED = /بهترین\s+(شکل|حالت|نسخه)\s+ممکن/;

/**
 * «تنها» فقط در بافت ادعای برتری غلط است.
 *
 * ⚠️ این واژه در فارسی روزمره بی‌نهایت رایج است: «تنها کاری که باید
 * بکنید»، «او تنها بود»، «تنها در صورتی که». گرفتنِ خودِ واژه یعنی رد
 * کردن هر مقاله‌ی سالم. پس فقط ترکیب‌هایی را می‌گیریم که «تنها» را به یک
 * نهاد یا ارائه‌دهنده می‌چسبانند — همان‌جا که ادعای انحصار ساخته می‌شود.
 */
const ONLY_CLAIM =
  /تنها\s+(شرکت|مؤسسه|موسسه|تیم|مرجع|نهاد|برند|مجموعه|سازمان|ارائه‌دهنده|منتور|جایی|جای)/;

function checkSuperlatives(text: string): BrandCheck {
  const hits = SUPERLATIVES.filter((t) => wordWithSuffix(t).test(text)).map((t) => `«${t}»`);

  if (wordWithSuffix("بهترین").test(text) && !BEST_ALLOWED.test(text)) {
    hits.push("«بهترین»");
  }

  const only = text.match(ONLY_CLAIM);
  if (only) hits.push(`«${only[0]}»`);

  return {
    name: "صفت تبلیغاتی مطلق",
    severity: "blocking",
    pass: hits.length === 0,
    note:
      hits.length === 0
        ? "ادعای برتری مطلق در متن نیست"
        : `${hits.join("، ")} — ادعای برتری مطلق نیازمند مدرک است و در تبلیغات بریتانیا قابل شکایت. جایگزین امن: «تمام تمرکز ما روی مسیرهای استعداد و کارآفرینی بریتانیاست»`,
  };
}

/* ── ح) برند در تیتر بخش ─────────────────────────────────── */

/**
 * نام برند در تیتر یک بخش یعنی آن بخش درباره‌ی ماست، نه درباره‌ی مخاطب.
 *
 * راهنمای برند می‌گوید قهرمان مخاطب است و برند راهنما. تشخیص کاملِ
 * «برند قهرمان شده» معنایی است و کار روبریک ویراستار — ولی **این یک
 * حالت** قطعی و بدون ابهام است: تیتری مثل «چرا نه گفتنِ فومنت،
 * بزرگ‌ترین سرمایه‌ی شماست» بدون هیچ قضاوتی غلط است.
 *
 * فقط H2 و H3 سنجیده می‌شوند، نه H1: عنوان مقاله از بریف می‌آید و اگر
 * مشکلی داشته باشد جای اصلاحش استراتژیست است، نه بازنویسی نویسنده.
 */
function checkBrandInHeading(md: string): BrandCheck {
  const headings = md.match(/^#{2,3} .*$/gm) ?? [];
  const hits = headings.filter((h) => BRAND_NAMES.some((n) => h.includes(n)));

  return {
    name: "برند در تیتر بخش",
    severity: "blocking",
    pass: hits.length === 0,
    note:
      hits.length === 0
        ? "هیچ تیتر بخشی نام برند را ندارد"
        : `${hits.map((h) => `«${h.replace(/^#+\s*/, "")}»`).join("، ")} — تیتر بخش باید درباره‌ی مسئله‌ی مخاطب باشد، نه درباره‌ی برند. قهرمان مخاطب است و برند راهنما؛ نام برند حداکثر در بخش پایانی می‌آید`,
  };
}

/* ── ی) برند به‌عنوان فاعلِ ابتدای پاراگراف ──────────────── */

/**
 * کلاس «ادامه‌ی واژه» — حرف فارسی/عربی، نیم‌فاصله، یا حرف لاتین.
 *
 * ⚠️ کل درستیِ چکِ پایین به همین بند است. در جاوااسکریپت `\b` روی فارسی
 * کار نمی‌کند، پس مرز واژه را باید دستی ساخت: «ما» فقط وقتی واژه‌ی مستقل
 * است که چیزی از این کلاس بعدش نیامده باشد. بدون این، «مالیات»، «مانند»
 * و «ماه» در ابتدای پاراگراف رد می‌شدند.
 */
const WORD_CONTINUATION = "[\\u0600-\\u06FF\\u200CA-Za-z]";

/** واژه‌هایی که در ابتدای پاراگراف یعنی «برند فاعل جمله است» */
const BRAND_SUBJECT_STARTERS = ["ما", ...BRAND_NAMES];

/**
 * پاراگرافی که با «ما» یا نام برند شروع شود.
 *
 * راهنمای برند این را در «نبایدها» صریح نام برده: «شروع با ما در فومنت…».
 * چون خودِ راهنما این حالت را مشخص کرده، برشش قطعی است — برخلاف «آیا کل
 * متن برندمحور است؟» که قضاوت است و کار روبریک ویراستار.
 *
 * فقط **ابتدای** پاراگراف سنجیده می‌شود. «ما» وسط جمله کاملاً مشروع است
 * («تجربه‌ای که ما دیده‌ایم…») و گرفتنش هر مقاله‌ی سالمی را رد می‌کرد.
 *
 * تیترها اینجا نادیده گرفته می‌شوند چون چک جداگانه‌ی خودشان را دارند.
 */
function checkBrandAsSubject(md: string): BrandCheck {
  const blocks = md
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .filter((b) => !b.startsWith("#"))
    // نشانه‌ی فهرست و نقل‌قول برداشته می‌شود تا «- ما در فومنت…» هم دیده شود
    .map((b) => b.replace(/^\s*(?:[-*+>]|\d+[.)])\s+/, ""))
    // تأکید مارک‌داون هم همین‌طور: «**ما در فومنت…**»
    .map((b) => b.replace(/^[*_]{1,3}/, "").trim());

  const hits = blocks.filter((b) =>
    BRAND_SUBJECT_STARTERS.some((term) =>
      new RegExp(`^${term}(?!${WORD_CONTINUATION})`).test(b)
    )
  );

  return {
    name: "برند فاعل پاراگراف",
    severity: "blocking",
    pass: hits.length === 0,
    note:
      hits.length === 0
        ? "هیچ پاراگرافی با «ما» یا نام برند شروع نمی‌شود"
        : `${hits.map((h) => `«${h.slice(0, 45)}…»`).join("، ")} — پاراگراف با «ما» یا نام برند شروع شده. فاعل باید «شما» باشد: به‌جای «ما بررسی می‌کنیم که…» بنویس «شما باید بدانید که…»`,
  };
}

/* ── ط) مقایسه‌ی ضمنی با رقبا ────────────────────────────── */

/**
 * راهنمای برند: «درباره‌ی رقیب حرف نمی‌زنیم؛ درباره‌ی خودمان حرف می‌زنیم.»
 *
 * ⚠️ الگوی اول عمداً وجود «با» را الزام می‌کند، و این تصادفی نیست:
 * جمله‌ی **مجازِ** خودِ برندگاید «کار ما این است که این تفاوت را زود مشخص
 * کنیم» است. بدون الزامِ ساختار «با … متفاوت»، همین جمله رد می‌شد — یعنی
 * چک، متنی را جریمه می‌کرد که برند توصیه‌اش کرده.
 *
 * عبارت «هر ویزایی، هر طور شده» در پروفایل توضیح چیزی است که فومنت
 * نمی‌فروشد، نه ابزار مقایسه. ظاهرشدنش در مقاله یعنی از آن برای
 * متمایزکردن خودمان استفاده شده.
 */
const COMPETITOR_COMPARISON: RegExp[] = [
  new RegExp(
    `(رویکرد|روش|کار|نگاه|مسیر|خدمات|کیفیت)\\s*(ما|${COMPANY_NAME})[^.!?؟\\n]{0,50}\\s+با\\s+[^.!?؟\\n]{0,60}(متفاوت|فرق)`
  ),
  /هر\s*ویزایی\s*[،,]?\s*هر\s*طور\s*شده/,
];

function checkCompetitorComparison(text: string): BrandCheck {
  const hits = COMPETITOR_COMPARISON.map((re) => text.match(re)?.[0]?.trim()).filter(
    (m): m is string => Boolean(m)
  );

  return {
    name: "مقایسه با رقبا",
    severity: "blocking",
    pass: hits.length === 0,
    note:
      hits.length === 0
        ? "متن خودش را با رقبا مقایسه نمی‌کند"
        : `${hits.map((h) => `«${h}»`).join("، ")} — مقایسه‌ی ضمنی با رقباست و ممنوع است. درباره‌ی رقیب حرف نمی‌زنیم؛ درباره‌ی خودمان حرف می‌زنیم. جایگزین امن: «تمام تمرکز ما روی مسیرهای استعداد و کارآفرینی بریتانیاست»`,
  };
}

/* ── و) گیومه‌ی لاتین ────────────────────────────────────── */

/**
 * برندگاید «گیومه‌ی فارسی» را الزام کرده: «…» نه "…" و نه '…'.
 *
 * دو استثنا که عمداً رد نمی‌شوند، وگرنه چک روی متن سالم می‌افتد:
 * ۱. کد، لینک و کدبلاک — آنجا گیومه‌ی لاتین نحو است، نه سلیقه.
 * ۲. آپاستروف داخل واژه‌ی لاتین (don't, Talent's). برندگاید خودش واژه‌ی
 *    انگلیسی را با حروف لاتین می‌خواهد، پس این شکل مشروع است.
 */
function checkLatinQuotes(md: string): BrandCheck {
  const text = stripNonProse(md)
    // آپاستروف بین دو حرف لاتین: don't, Talent's
    .replace(/(?<=[A-Za-z])['’](?=[A-Za-z])/g, "");

  const found = [...new Set(text.match(/["'“”‘’]/g) ?? [])];
  return {
    name: "گیومه‌ی فارسی",
    severity: "advisory",
    pass: found.length === 0,
    note:
      found.length === 0
        ? "گیومه‌ها فارسی‌اند"
        : `گیومه‌ی لاتین در متن: ${found.join(" ")} — برندگاید «گیومه‌ی فارسی» را الزام کرده. به‌جای "متن" یا 'متن' بنویس «متن»`,
  };
}

/* ── ه) نیم‌فاصله ────────────────────────────────────────── */

/**
 * الگوها عمداً محدودند: فقط ترکیب‌هایی که در فارسی هیچ شکل درستِ
 * بافاصله‌ای ندارند. «می» و «نمی» به‌تنهایی واژه نیستند، پس فاصله بعدشان
 * قطعاً غلط است.
 */
const HALF_SPACE_PATTERNS: { re: RegExp; label: string }[] = [
  // گروه ۱ عمداً کلمه‌ی کامل را می‌گیرد تا نمونه‌ی خطا خوانا باشد
  // («می کند» به‌جای «می ک») — پیامی که نویسنده نتواند جایش را پیدا کند بی‌فایده است.
  { re: /(?:^|\s)(ن?می [آ-ی]+)/, label: "«می …» یا «نمی …» با فاصله‌ی کامل" },
  { re: /([آ-ی]+ ها(?:ی|یی)?)(?=\s|$)/, label: "«… ها» / «… های» با فاصله‌ی کامل" },
  { re: /([آ-ی]+ تر(?:ین)?)(?=\s|$)/, label: "«… تر» / «… ترین» با فاصله‌ی کامل" },
];

function checkHalfSpace(text: string): BrandCheck {
  const hits = HALF_SPACE_PATTERNS.filter((p) => p.re.test(text));
  const samples = hits
    .map((p) => text.match(p.re)?.[1]?.trim())
    .filter((s): s is string => Boolean(s));

  return {
    name: "نیم‌فاصله",
    severity: "advisory",
    pass: hits.length === 0,
    note:
      hits.length === 0
        ? "نیم‌فاصله‌ها رعایت شده‌اند"
        : `${hits.map((h) => h.label).join("، ")}${samples.length ? ` (نمونه: «${samples.join("»، «")}»)` : ""} — برندگاید نیم‌فاصله را همیشه الزام کرده: می‌شود، نمی‌دانم، شبکه‌های`,
  };
}

/* ── اصلاح خودکار واژگان ─────────────────────────────────── */

/**
 * جایگزینی‌های قطعی و بدون ابهام.
 *
 * ⚠️ مرزِ این فهرست سخت‌گیرانه است و باید بماند: فقط چیزی اینجا می‌آید
 * که **در هر بافتی** جایگزینی‌اش درست باشد. اگر ذره‌ای به جمله وابسته
 * است، جایش اینجا نیست و باید به ویراستار و بازنویسی برود.
 *
 * دو موردی که عمداً بیرون‌اند و نباید اضافه شوند:
 * - «مشتری / مشتریان» → در «مشتریان استارتاپ شما» کاملاً درست است و
 *   جایگزینی خودکار جمله را خراب می‌کند.
 * - «وکیل» → ممکن است در جمله‌ای بیاید که دارد تفاوت وکیل و مشاور
 *   ثبت‌شده را توضیح می‌دهد؛ آنجا حذفش معنا را وارونه می‌کند.
 *
 * `firstOnly` برای واژه‌هایی است که راهنمای برند می‌گوید «بار اول با
 * معادل انگلیسی، بعد فقط فارسی». بدون آن، تکرارِ پرانتز انگلیسی در کل
 * مقاله پخش می‌شد.
 */
type SafeFix = {
  find: RegExp;
  /** جایگزین بار اول (معمولاً با معادل انگلیسی) */
  first: string;
  /** جایگزین دفعات بعد؛ اگر نبود، همان `first` */
  rest?: string;
};

const SAFE_FIXES: SafeFix[] = [
  { find: /فیومنت|فوومنت/g, first: COMPANY_NAME },
  {
    find: /ویزای نخبگان/g,
    first: "ویزای گلوبال تلنت (Global Talent)",
    rest: "ویزای گلوبال تلنت",
  },
  {
    find: /تأییدیه نخبگی|تاییدیه نخبگی/g,
    first: "اندورسمنت (Endorsement)",
    rest: "اندورسمنت",
  },
  { find: /مشاوره‌ی رایگان|مشاورهٔ رایگان|مشاوره رایگان/g, first: "ارزیابی اولیه" },
];

/**
 * اعمال جایگزینی‌های قطعی روی متن.
 *
 * چرا اصلاً در کد و نه با بازنویسی مدل: یک دور بازنویسی کامل حدود ۳۰
 * ثانیه و یک فراخوانی مدل هزینه دارد. عوض‌کردن «فیومنت» به «فومنت»
 * ارزش آن را ندارد و اصلاً قضاوت لازم ندارد.
 *
 * فهرست اعمال‌شده‌ها برگردانده می‌شود تا در لاگ دیده شود چه چیزی بی‌سر‌وصدا
 * عوض شده — اصلاح خاموشِ متن، همان‌قدر بد است که خطای خاموش.
 */
export function applySafeBrandFixes(text: string): {
  text: string;
  applied: string[];
} {
  let out = text;
  const applied: string[] = [];

  for (const fix of SAFE_FIXES) {
    const matches = out.match(fix.find);
    if (!matches) continue;

    let seen = 0;
    out = out.replace(fix.find, () => {
      seen++;
      return seen === 1 ? fix.first : (fix.rest ?? fix.first);
    });
    applied.push(`${matches.length}× «${matches[0]}» → «${fix.first}»`);
  }

  return { text: out, applied };
}

/* ── چک بریف: هدف‌گیری مبهم ──────────────────────────────── */

/**
 * بریفِ «برای همه» یعنی بریفِ هیچ‌کس.
 *
 * ⚠️ چرا این چک روی فیلدهای متنی است و نه روی route/audienceGroup؟
 * چون آن سه فیلد z.enum هستند و «همه» را همان موقع پارس رد می‌کند — چک
 * هیچ‌وقت نمی‌بیندشان. سوراخ واقعی `audience` است که متن آزاد است و مدل
 * راحت می‌تواند «همه‌ی متخصصان ایرانی» بنویسد و از enum هم سالم رد شود.
 */
const VAGUE_AUDIENCE = [
  "همه",
  "همه‌ی",
  "همگان",
  "عموم",
  "عمومی",
  "هرکسی",
  "هر کسی",
  "هر فردی",
];

export function runBriefChecks(input: {
  audience: string;
  title: string;
  ctaId: string;
  /**
   * شناسه‌های مجاز برای مسیرِ این بریف — از allowedCtaIds(route).
   *
   * پارامتر است و نه import، به همان دلیلی که runReelsChecks هم همین کار
   * را می‌کند: این فایل باید خالص و بی‌وابستگی بماند تا بشود مستقیم
   * تستش کرد. تصمیمِ «کدام مسیر» جای ارکستریتور است، نه چک.
   */
  allowedCtaIds: string[];
}): BrandCheck[] {
  const vague = findTerms(input.audience, VAGUE_AUDIENCE);
  const ctaOk = input.allowedCtaIds.includes(input.ctaId);

  return [
    {
      name: "مخاطب مشخص",
      severity: "blocking",
      pass: vague.length === 0,
      note:
        vague.length === 0
          ? `مخاطب مشخص است: ${input.audience.slice(0, 60)}`
          : `«${vague.join("، ")}» در توصیف مخاطب — بریف باید یکی از پنج گروه را هدف بگیرد، نه «همه». محتوایی که برای همه نوشته می‌شود برای هیچ‌کس قلاب ندارد`,
    },
    {
      name: "دعوت به اقدام از فهرست مجاز",
      severity: "blocking",
      pass: ctaOk,
      note: ctaOk
        ? `CTA انتخاب‌شده: ${input.ctaId}`
        : `«${input.ctaId}» در فهرست مجازِ این مسیر نیست (${input.allowedCtaIds.join("، ")}) — دعوتی که خارج از مسیر محتوا باشد، مخاطب را به دری می‌فرستد که جای او نیست`,
    },
  ];
}

/* ── اجرای همه ───────────────────────────────────────────── */

/* ══ چک‌های انگلیسی ═══════════════════════════════════════════
 *
 * ⚠️ این‌ها ترجمه‌ی فهرست‌های فارسی نیستند و نباید بشوند.
 *
 * سه تفاوت ساختاری:
 * ۱. «lawyer» در فارسی توصیه‌ای بود؛ اینجا مسدودکننده است، چون عنوان
 *    حفاظت‌شده است و استفاده‌ی نادرستش تخلف قانونی است نه نگارشی.
 * ۲. فهرست جایگاه نظارتی (REGULATED_STATUS_EN) معادل فارسی ندارد.
 *    سطح مجوز فومنت «Level 1 — Advice and Assistance» است؛ ادعای
 *    نمایندگی فراتر از آن، فراتر از اختیار است.
 * ۳. مخاطب انگلیسی نهاد و شریک بریتانیایی است، نه متقاضی. ریسک بیشتر
 *    است، نه کمتر.
 *
 * چهار چک نگارشی فارسی (ارقام، گیومه، نیم‌فاصله، اصلاح خودکار) اینجا
 * اجرا نمی‌شوند. اگر می‌شدند، هر عدد و هر گیومه‌ی انگلیسی رد می‌شد و
 * هیچ پست انگلیسی هرگز «تمیز» نمی‌ماند.
 */

const FORBIDDEN_CLAIMS_EN: EnTerm[] = [
  { term: "guarantee", why: "outcome guarantee — no outcome is guaranteed on these routes" },
  { term: "guaranteed", why: "outcome guarantee" },
  { term: "100%", why: "absolute certainty claim" },
  { term: "100 percent", why: "absolute certainty claim" },
  { term: "risk-free", why: "absolute certainty claim" },
  { term: "no risk", why: "absolute certainty claim" },
  { term: "success rate", why: "success-rate claim — not published, in figures or in words" },
  { term: "approval rate", why: "success-rate claim in different wording" },
  { term: "acceptance rate", why: "success-rate claim in different wording" },
  { term: "proven results", why: "proven-outcome claim without published data" },
  { term: "proven track record", why: "proven-outcome claim without published data" },
  { term: "will be approved", why: "certainty claim — the rules on these routes change" },
  { term: "last chance", why: "fear framing — the hero comes from ambition, not urgency" },
  { term: "final opportunity", why: "fear framing" },
  { term: "before it's too late", why: "fear framing" },
  { term: "don't miss out", why: "fear framing" },
  { term: "hassle-free", why: "understates the real difficulty of the route" },
  { term: "effortless", why: "understates the real difficulty of the route" },
  { term: "fast-track", why: "implies preferential processing that does not exist" },
];

/**
 * ادعاهای جایگاه نظارتی.
 *
 * «immigration advice» و «immigration adviser» عمداً اینجا نیستند —
 * فومنت واقعاً تحت نظارت IAA ثبت شده (F202639410) و حق دارد این را
 * بگوید. چیزی که ممنوع است «legal» است.
 */
const REGULATED_STATUS_EN: EnTerm[] = [
  { term: "lawyer", why: "protected title — an IAA-registered adviser is not a lawyer" },
  { term: "lawyers", why: "protected title" },
  { term: "solicitor", why: "protected title under UK legal services law" },
  { term: "solicitors", why: "protected title" },
  { term: "barrister", why: "protected title" },
  { term: "attorney", why: "protected title (and a non-UK term)" },
  { term: "law firm", why: "Fuwment is not a law firm" },
  { term: "legal advice", why: "outside the licence — use «immigration advice»" },
  { term: "legal representation", why: "outside the licence" },
  { term: "represent you at appeal", why: "IAA Level 1 is Advice and Assistance only" },
  { term: "Home Office approved", why: "false authority — IAA regulates, it does not approve services" },
  { term: "government approved", why: "false authority claim" },
  { term: "official partner", why: "false authority claim" },
  { term: "OISC", why: "former regulator name — the correct name is IAA" },
];

const WRONG_TERMS_EN: EnTerm[] = [
  { term: "Fuwement", why: "brand-name misspelling — it is «Fuwment»" },
  { term: "Fuwmnet", why: "brand-name misspelling — it is «Fuwment»" },
  { term: "Fuvment", why: "brand-name misspelling — it is «Fuwment»" },
  { term: "FUWMENT", why: "all-caps is for the logo only — «Fuwment»", cs: true },
  { term: "FuWment", why: "capitalisation — «Fuwment»", cs: true },
  { term: "Elite visa", why: "wrong route name — «Global Talent visa»" },
  { term: "Genius visa", why: "wrong route name — «Global Talent visa»" },
  { term: "Exceptional Talent visa", why: "former route name — «Global Talent visa»" },
  { term: "client", why: "«applicant» or «candidate» in public content" },
  { term: "clients", why: "«applicants» or «candidates» in public content" },
  { term: "free consultation", why: "this service does not exist — it is «initial assessment»" },
  { term: "permanent residency", why: "non-UK concept — «Indefinite Leave to Remain (ILR)»" },
  { term: "green card", why: "non-UK concept" },
  { term: "sponsorship", why: "Global Talent needs no sponsor — check this is not a Skilled Worker mix-up" },
  { term: "expert", why: "expertise claim without a verifiable title — prefer «mentor»" },
];

const SUPERLATIVES_EN = [
  "best", "#1", "number one", "leading", "top-rated", "unrivalled", "unrivaled",
  "unmatched", "unparalleled", "world-class", "premier", "most trusted",
  "most experienced", "industry-leading", "gold standard",
];

const COMPETITOR_COMPARISON_EN = [
  "unlike other agencies", "unlike other consultants", "better than",
  "cheaper than", "most agencies fail", "typical consultants",
];

const FORBIDDEN_NARRATIVE_EN: RegExp[] = [
  /\b(hidden|invisible|secret)\s+criteria\b/i,
  /\bcriteria\s+are\s+(hidden|invisible|unclear|unknowable)\b/i,
  /\bthe\s+system\s+is\s+(unreadable|illegible|opaque)\b/i,
  /\b(hidden|unwritten)\s+rules\b/i,
  /\byou'?re\s+already\s+qualified,?\s+you\s+just\b/i,
  /\bit'?s\s+(just|only)\s+a\s+matter\s+of\s+(presentation|framing|storytelling)\b/i,
  /\byou\s+just\s+need\s+to\s+(present|frame|tell)\s+it\b/i,
];

/**
 * قاب‌بندی «translate».
 * استثنا مثل نسخه‌ی فارسی: ترجمه‌ی مدارک کاربرد مشروع است.
 */
const TRANSLATION_FRAMING_EN =
  /\btranslat\w*\s+(your\s+|their\s+)?(achievements?|experience|impact|track record|expertise)\b/i;
const DOCUMENT_WORDS_EN = /\b(document|documents|certified|official|translator)\b/i;

function listCheckEn(
  name: string,
  severity: "blocking" | "advisory",
  text: string,
  list: { term: string; why: string }[],
  okNote: string
): BrandCheck {
  const hits = findTermsEn(text, list);
  return {
    name,
    severity,
    pass: hits.length === 0,
    note:
      hits.length === 0
        ? okNote
        : hits.map((h) => `«${h.term}» — ${h.why}`).join(" | "),
  };
}

function runBrandChecksEn(text: string): BrandCheck[] {
  const superlativeHits = SUPERLATIVES_EN.filter((t) => wholeWordEn(t).test(text));
  const competitorHits = COMPETITOR_COMPARISON_EN.filter((t) => wholeWordEn(t).test(text));
  const narrativeHits = FORBIDDEN_NARRATIVE_EN.map((re) => text.match(re)?.[0]?.trim()).filter(
    (m): m is string => Boolean(m)
  );
  const translationHit = text.match(TRANSLATION_FRAMING_EN)?.[0]?.trim();
  const translationBad = Boolean(translationHit) && !DOCUMENT_WORDS_EN.test(translationHit!);

  return [
    listCheckEn(
      "ادعاهای ممنوع (انگلیسی)",
      "blocking",
      text,
      FORBIDDEN_CLAIMS_EN,
      "no guarantee or success-rate claim in the text"
    ),
    listCheckEn(
      "جایگاه نظارتی (انگلیسی)",
      "blocking",
      text,
      REGULATED_STATUS_EN,
      "no protected title or false authority claim"
    ),
    listCheckEn(
      "واژگان برند (انگلیسی)",
      "advisory",
      text,
      WRONG_TERMS_EN,
      "vocabulary matches the brand guide"
    ),
    {
      name: "صفت تبلیغاتی مطلق (انگلیسی)",
      severity: "blocking",
      pass: superlativeHits.length === 0,
      note:
        superlativeHits.length === 0
          ? "no absolute superiority claim"
          : superlativeHits.map((t) => `«${t}»`).join("، "),
    },
    {
      name: "مقایسه با رقبا (انگلیسی)",
      severity: "blocking",
      pass: competitorHits.length === 0,
      note:
        competitorHits.length === 0
          ? "the text does not compare itself to competitors"
          : competitorHits.map((t) => `«${t}»`).join("، "),
    },
    {
      name: "روایت دشمن داستان (انگلیسی)",
      severity: "blocking",
      pass: narrativeHits.length === 0,
      note:
        narrativeHits.length === 0
          ? "the text does not claim the criteria are hidden"
          : `${narrativeHits.map((h) => `«${h}»`).join("، ")} — این روایت القا می‌کند هر کسی واجد شرایط است و فقط بلد نیست خودش را ارائه کند.`,
    },
    {
      name: "قاب‌بندی «translate» (انگلیسی)",
      severity: "blocking",
      pass: !translationBad,
      note: translationBad
        ? `«${translationHit}» — دستاورد «ترجمه» نمی‌شود. (ترجمه‌ی مدارک مشکلی ندارد.)`
        : "«translate» در بافت دستاورد استفاده نشده",
    },
    checkBrandInHeading(text),
  ];
}

/**
 * ورودی `text` می‌تواند مارک‌داون مقاله یا متن پیوسته‌ی محتوای اجتماعی باشد.
 * چکِ ارقام خودش مارک‌داون را تمیز می‌کند؛ بقیه روی متن خام کار می‌کنند.
 */
export function runBrandChecks(input: {
  text: string;
  /** پیش‌فرض «fa» تا هیچ فراخوانی موجود بلاگ نشکند */
  language?: "fa" | "en";
}): BrandCheck[] {
  const { text, language = "fa" } = input;

  if (language === "en") return runBrandChecksEn(text);

  return [
    checkForbiddenClaims(text),
    checkWrongTerms(text),
    checkForbiddenNarrative(text),
    checkTranslationFraming(text),
    checkBrandInHeading(text),
    checkBrandAsSubject(text),
    checkCompetitorComparison(text),
    checkSuperlatives(text),
    checkLatinDigits(text),
    checkLatinQuotes(text),
    checkHalfSpace(text),
  ];
}
