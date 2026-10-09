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

import {
  BLOG_BUREAUCRATIC_FA,
  BLOG_COLLOQUIAL_FA,
  EVIDENCE_OVERCLAIM_FA,
  EVIDENCE_TAG_LEAK,
  DESCRIPTIVE_FRAME,
  STAT_TO_RULE,
  descriptiveFacts,
  officialFacts,
  type OverclaimPattern,
  sourceAuthority,
  COMPANY_NAME,
  COMPANY_NAME_EN,
  COMPETITOR_COMPARISON_EN,
  FEAR_PATTERNS_EN,
  FEAR_PATTERNS_FA,
  FEAR_PATTERNS_SPOKEN_FA,
  CERTAINTY_PATTERNS_SPOKEN_FA,
  FORBIDDEN_CLAIMS_EN,
  FORBIDDEN_CLAIMS_FA,
  INTERNAL_TERMS_FA,
  INTERNAL_TERMS_LATIN,
  LATIN_ALLOWED_IN_FA_INSTAGRAM,
  MAIN_TAGLINE_FA,
  REGULATED_STATUS_EN,
  SUPERLATIVES_EN,
  WRONG_TERMS_EN,
  WRONG_TERMS_FA,
  stripGuaranteeNegationsEn,
  stripGuaranteeNegationsFa,
  stripGuaranteeNegationsSpokenFa,
  isSpokenRegisterChannel,
  type BrandChannel,
  type EnTerm,
} from "@/lib/brand";

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

/**
 * واژه + فعل ربطیِ گفتاری: «تضمینیه»، «قطعیه»، «تضمین‌شده‌ست». تطبیق
 * کلمه‌کامل این‌ها را نمی‌گرفت — در متن محاوره‌ی نرم (کاروسل و استوری از
 * ۲۰۲۶-۱۰-۰۹) یعنی ادعای تضمینی که **بی‌صدا** از چک رد می‌شد.
 */
function wordWithSpokenCopula(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|${BOUNDARY})${escaped}\u200C?(?:ه|ست|ئه)($|${BOUNDARY})`);
}

/* ── کمک‌کننده‌های انگلیسی ────────────────────────────────── */

/**
 * مرز کلمه‌ی انگلیسی. \b استاندارد کافی نیست چون عبارت‌های ما چنداژه‌ای‌اند
 * و بعضی‌شان علامت دارند (#1، 100%).
 */

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
 * این‌ها ادعای حقوقی‌اند، نه سلیقه‌ی نگارشی. قواعد ادعا در راهنمای برند بر
 * همه‌ی قواعد دیگر اولویت دارند و در تبلیغات بریتانیا قابل شکایت‌اند.
 *
 * فهرست‌ها در `@/lib/brand/claims.ts` زندگی می‌کنند — همان‌جا که متن
 * پرامپت هم از رویشان ساخته می‌شود.
 *
 * ⚠️ نفیِ صادقانه («بدون تضمین»، «هیچ نتیجه‌ای را تضمین نمی‌کنیم») پیش
 * از سنجش از متن کنار گذاشته می‌شود — خودِ v3.7 این جمله‌ها را می‌گوید.
 * هر «تضمین»ِ دیگری در همان متن همچنان مسدود است.
 */
function checkForbiddenClaims(text: string, spoken = false): BrandCheck {
  // spoken: کاروسل/استوریِ محاوره‌ی نرم — نفی و ترسِ گفتاری هم شناخته می‌شوند
  const scan = spoken ? stripGuaranteeNegationsSpokenFa(text) : stripGuaranteeNegationsFa(text);
  const hits = FORBIDDEN_CLAIMS_FA.filter(
    (c) => wholeWord(c.term).test(scan) || (spoken && wordWithSpokenCopula(c.term).test(scan))
  ).map(
    (h) => `«${h.term}» — ${h.why}`
  );
  const patterns = spoken
    ? [...FEAR_PATTERNS_FA, ...FEAR_PATTERNS_SPOKEN_FA, ...CERTAINTY_PATTERNS_SPOKEN_FA]
    : FEAR_PATTERNS_FA;
  for (const f of patterns) {
    const m = text.match(f.re);
    if (m) hits.push(`«${m[0].trim()}» — ${f.why}`);
  }
  return {
    name: "ادعاهای ممنوع",
    severity: "blocking",
    pass: hits.length === 0,
    note:
      hits.length === 0
        ? "هیچ ادعای تضمینی، نرخ موفقیت یا ادبیات ترس در متن نیست"
        : hits.join(" | ") +
        " | جایگزین مجاز: «کاری می‌کنیم پرونده در بهترین شکل ممکن ارائه شود.» (گفتنِ «هیچ نتیجه‌ای را تضمین نمی‌کنیم» مجاز است)",
  };
}

/* ── ب) واژگان نادرست ────────────────────────────────────── */


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
  const hits = WRONG_TERMS_FA.filter((t) => wholeWord(t.term).test(text)).map(
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
 * صورت گفتاریِ همان فرمول‌ها — فقط کاروسل و استوریِ محاوره‌ی نرم
 * (۲۰۲۶-۱۰-۰۹). بدون این، «فقط باید دستاوردت رو ترجمه کنی» و «مسئله
 * فقط ارائه‌ست» بی‌صدا رد می‌شدند. بلاگ و ریلز همان فهرست بالا را دارند.
 */
const FORBIDDEN_NARRATIVE_SPOKEN: RegExp[] = [
  // ⚠️ نه `دستاوردت?ان?` مثل فهرست نوشتاری — آن فقط «دستاوردتان» را می‌گیرد
  // و «دستاوردت» را نه (در نوشتاری قاب ترجمه جبرانش می‌کند).
  /فقط\s*(باید\s*)?دستاورد(?:‌?ها)?(?:ت|تان|ات)?\s*رو\s*ترجمه/,
  /فقط\s*(یه|یک)?\s*مسئله‌?ی?\s*(ترجمه|ارائه|روایت)‌?(ست|ه)(?![\u0600-\u06FF])/,
  /مسئله\s*فقط\s*(ترجمه|ارائه|نحوه‌ی ارائه)‌?(ست|ه)(?![\u0600-\u06FF])/,
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

/**
 * صورت گفتاری: «تجربه‌ات رو … ترجمه کن» — فقط کاروسل و استوری. «رو» با
 * مرز واژه سنجیده می‌شود تا «روی»، «روشن» و «روند» نگیرند.
 */
const TRANSLATION_FRAMING_SPOKEN: RegExp[] = [
  new RegExp(
    `${ACHIEVEMENT_WORDS}[^.!?؟\\n]{0,60}(?<![\\u0600-\\u06FF\\u200C])رو(?![\\u0600-\\u06FF\\u200C])[^.!?؟\\n]{0,40}ترجمه`
  ),
];

function checkTranslationFraming(text: string, spoken = false): BrandCheck {
  const patterns = spoken ? [...TRANSLATION_FRAMING, ...TRANSLATION_FRAMING_SPOKEN] : TRANSLATION_FRAMING;
  const hits = patterns.map((re) => text.match(re)?.[0]?.trim())
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

function checkForbiddenNarrative(text: string, spoken = false): BrandCheck {
  const patterns = spoken ? [...FORBIDDEN_NARRATIVE, ...FORBIDDEN_NARRATIVE_SPOKEN] : FORBIDDEN_NARRATIVE;
  const hits = patterns.map((re) => text.match(re)?.[0]?.trim()).filter(
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
        : `${hits.map((h) => `«${h.slice(0, 45)}…»`).join("، ")} — پاراگراف با «ما» یا نام برند شروع شده. فاعل باید خودِ مخاطب باشد (در بلاگ «شما»، در اینستاگرام «تو»): به‌جای «ما بررسی می‌کنیم که…» از کار و موقعیت مخاطب شروع کن`,
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
 * ۳. از v3.7 مخاطب انگلیسی هم یکی از پنج گروه است (تصمیم مالک) — همان
 *    متخصص و بنیان‌گذار، به زبان مرجع برند. قواعد ادعا همان‌قدر سخت‌اند.
 *
 * سه چک نگارشی فارسی (ارقام، گیومه، نیم‌فاصله) و اصلاح خودکار اینجا
 * اجرا نمی‌شوند. اگر می‌شدند، هر عدد و هر گیومه‌ی انگلیسی رد می‌شد و
 * هیچ پست انگلیسی هرگز «تمیز» نمی‌ماند.
 */

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

  // نفیِ صادقانه («we don't guarantee outcomes») پیش از سنجش کنار می‌رود
  const claimHits = findTermsEn(stripGuaranteeNegationsEn(text), FORBIDDEN_CLAIMS_EN).map(
    (h) => `«${h.term}» — ${h.why}`
  );
  for (const f of FEAR_PATTERNS_EN) {
    const m = text.match(f.re);
    if (m) claimHits.push(`«${m[0].trim()}» — ${f.why}`);
  }

  return [
    {
      name: "ادعاهای ممنوع (انگلیسی)",
      severity: "blocking",
      pass: claimHits.length === 0,
      note:
        claimHits.length === 0
          ? "no guarantee, success-rate or fear claim in the text"
          : claimHits.join(" | "),
    },
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
    checkInternalJargonEn(text),
  ];
}

/* ══ v3.7: زبان داخلی ↔ زبان مخاطب ═══════════════════════════ */

/**
 * واژه‌ی داخلی برند در متن مخاطب — v3.7: «زبان داخلی Brand Guide را
 * مستقیماً وارد محتوای مخاطب نکنید.»
 *
 * فقط عبارت‌های چندواژه‌ایِ بی‌ابهام و اصطلاح‌های لاتینِ بازاریابی سنجیده
 * می‌شوند (فهرست و دلیلِ نبودِ «قهرمان/راهنما/دشمن» در terminology.ts).
 * تگ‌لاین رسمی پیش از سنجش کنار می‌رود: «پرونده‌ی قابل دفاع» فقط داخلِ
 * تگ‌لاین مجاز است.
 */
const APPROVED_TAGLINES_FA = [
  MAIN_TAGLINE_FA,
  MAIN_TAGLINE_FA.replace(/\.$/, ""),
  "از ابهام، به یک پرونده‌ی قابل دفاع",
];

function checkInternalJargon(text: string): BrandCheck {
  const scan = APPROVED_TAGLINES_FA.reduce((t, tag) => t.split(tag).join(" "), stripNonProse(text));
  const hits = INTERNAL_TERMS_FA.filter((t) => wholeWord(t.term).test(scan)).map(
    (t) => `«${t.term}» → ${t.plain}`
  );
  hits.push(...findTermsEn(scan, INTERNAL_TERMS_LATIN).map((t) => `«${t.term}» — ${t.why}`));

  return {
    name: "زبان داخلی برند",
    severity: "blocking",
    pass: hits.length === 0,
    note:
      hits.length === 0
        ? "هیچ واژه‌ی داخلی برند در متن مخاطب نیست"
        : `${hits.join(" | ")} — این‌ها ابزار فکر تیم‌اند، نه متن مخاطب. مفهوم را با زبان خود مخاطب بگو`,
  };
}

function checkInternalJargonEn(text: string): BrandCheck {
  const hits = findTermsEn(stripNonProse(text), INTERNAL_TERMS_LATIN);
  return {
    name: "زبان داخلی برند (انگلیسی)",
    severity: "blocking",
    pass: hits.length === 0,
    note:
      hits.length === 0
        ? "no internal brand vocabulary in audience copy"
        : `${hits.map((h) => `«${h.term}» — ${h.why}`).join(" | ")} — internal brand language never goes into audience copy; say it in the reader's words`,
  };
}

/* ══ v3.7: قواعد کانالِ فارسی ═════════════════════════════════ */

/**
 * اینستاگرام فارسی: «حروف لاتین — فقط این دو جا: امضای Fuwment · شماره
 * ثبت و راستی‌آزمایی IAA». کاروسل، استوری و ریلز (تصمیم مالک).
 *
 * مسدودکننده است چون قطعی و بی‌ابهام است و نویسنده دقیقاً می‌داند چه
 * کند: «Global Talent» → «گلوبال تلنت». خطِ کلیدواژه‌ی دایرکت (استثنای
 * تأییدشده) بعد از این حلقه اضافه می‌شود و هرگز به این چک نمی‌رسد.
 */
function checkNoLatinInPersianInstagram(text: string): BrandCheck {
  const scan = LATIN_ALLOWED_IN_FA_INSTAGRAM.reduce((t, re) => t.replace(re, " "), text);
  const words = [...new Set(scan.match(/[A-Za-z][A-Za-z'’.-]*/g) ?? [])];
  return {
    name: "بدون حروف لاتین (اینستاگرام فارسی)",
    severity: "blocking",
    pass: words.length === 0,
    note:
      words.length === 0
        ? "متن هیچ حرف لاتینی ندارد (جز امضای Fuwment و شماره‌ی IAA)"
        : `حروف لاتین در متن: ${words.slice(0, 8).map((w) => `«${w}»`).join("، ")} — در اینستاگرام فارسی همه‌چیز با حروف فارسی: «گلوبال تلنت»، «اینوویتور فاندر»، «اندورسمنت». لاتین فقط در امضای Fuwment و شماره‌ی ثبت IAA`,
  };
}

/**
 * ضمیر خطاب — قاعده‌ی کانال، نه قاعده‌ی برند.
 *
 * توصیه‌ای است، نه مسدودکننده: «شما» گاهی در نقل‌قول یا جمله‌ای درباره‌ی
 * دیگران مشروع است و «تو» در فارسی محاوره‌ای حرف اضافه هم هست («تو این
 * مسیر»). تشخیص قطعیِ خطاب از روی یک واژه ممکن نیست — پس این چک فقط
 * نشانه را به ویراستار گزارش می‌دهد و جلوی تأیید خودکار را می‌گیرد،
 * بازنویسی نمی‌سازد (قاعده‌ی ۲ و ۴ پروژه).
 */
function checkAddress(text: string, expected: "تو" | "شما"): BrandCheck {
  const wrong = expected === "تو" ? "شما" : "تو";
  const found = wordWithSuffix(wrong).test(stripNonProse(text));
  return {
    name: `خطاب «${expected}»`,
    severity: "advisory",
    pass: !found,
    note: found
      ? `«${wrong}» در متن آمده — خطاب این کانال «${expected}» است (${expected === "تو" ? "اینستاگرام فارسی" : "سایت و بلاگ"}). اگر منظور خودِ مخاطب است، با «${expected}» بنویس`
      : `خطاب با کانال هم‌خوان است («${expected}»)`,
  };
}

/* ── چک‌های فقط-بلاگ (v3.7) — فهرست‌ها در `@/lib/brand/blog.ts` ── */

/**
 * فارسی ساده: عبارت‌های اداری/آکادمیک/مشاوره‌ای که راهنما صریحاً منع کرده.
 * مسدودکننده، چون فهرست فقط عبارت‌هایی را دارد که در بلاگ **همیشه**
 * نادرست‌اند؛ اسم‌سازی و زنجیره‌ی اضافه قضاوت می‌خواهند و با ویراستارند.
 */
export function checkPlainPersianBlog(text: string): BrandCheck {
  const scan = stripNonProse(text);
  const hits = BLOG_BUREAUCRATIC_FA.filter((t) => t.re.test(scan)).map((t) => `«${t.label}» → ${t.plain}`);
  return {
    name: "فارسی ساده (نه اداری یا آکادمیک)",
    severity: "blocking",
    pass: hits.length === 0,
    note:
      hits.length === 0
        ? "عبارت اداری، آکادمیک یا مشاوره‌ای پیدا نشد"
        : `${hits.join(" | ")} — بلاگ فارسی نوشتاری ساده است: جمله را با فعل و واژه‌ی روزمره‌ی نوشتاری بازنویسی کن`,
  };
}

/** بلاگ نوشتاری است — فارسی شکسته‌ی اینستاگرامی به آن سرایت نکند */
export function checkWrittenPersianBlog(text: string): BrandCheck {
  const scan = stripNonProse(text);
  const hits = BLOG_COLLOQUIAL_FA.filter((t) => t.re.test(scan)).map((t) => `«${t.label}»`);
  return {
    name: "فارسی نوشتاری (نه محاوره‌ای)",
    severity: "blocking",
    pass: hits.length === 0,
    note:
      hits.length === 0
        ? "صورت محاوره‌ای/شکسته پیدا نشد"
        : `${hits.join("، ")} — بلاگ محاوره‌ای نیست؛ صورت نوشتاری بنویس («می‌شود»، «می‌توانید»، «آن»)`,
  };
}

/** همان بخشی از پژوهش که چک شواهد لازم دارد — فکت‌های برچسب‌دار و منابع نهایی مقاله */
export type EvidenceBundle = { keyFacts: string[]; sources: { url: string; title?: string }[] };

/**
 * وضعیت شواهد — دو چک، بر اساس پشتوانه‌ی رسمیِ **سنجیده‌شده با کد**.
 *
 * ⚠️ از دومین اجرای زنده: مقاله «طبق راهنمای رسمی…» و «شاخص معتبر برای
 * Commercial Recognition» نوشت در حالی که تنها منبع چاپ‌شده یک سایت وکالتی
 * بود. چک قبلی فقط متن را می‌دید و همیشه توصیه‌ای بود — پس ویراستار تأیید
 * کرد و مقاله رد شد.
 *
 * حالا:
 * - ادعای قطعی/رسمی که هیچ فکت رسمیِ مرتبطی پشتش نیست → **مسدودکننده**
 *   (بازنویسی به توصیه/تفسیر یا حذف). «فکت رسمی» یعنی برچسب [رسمی Sn] که
 *   Sn در فهرست منابع نهایی است و هاستش GOV.UK/قواعد مهاجرت.
 * - ادعایی که فکت رسمیِ مرتبط دارد → توصیه‌ای: کد نمی‌فهمد جمله «دقیقاً»
 *   همان را می‌گوید (قاعده‌ی ۲)؛ ویراستار و بازبین انسانی می‌سنجند.
 */
export function checkEvidenceGroundingBlog(text: string, research: EvidenceBundle): BrandCheck[] {
  const official = officialFacts(research.keyFacts, research.sources);
  const descriptive = descriptiveFacts(research.keyFacts, research.sources);

  /**
   * جمله‌به‌جمله، چون «آیا این توصیف آماری است یا شرط؟» به خودِ جمله
   * بستگی دارد (v3.7، سومین اجرا): «دارندگان این ویزا … ۱۰ درصد بالای …»
   * با فکتِ [آمار رسمی] توصیف مجاز است؛ همان عدد کنار «پذیرش» یا «لازم»
   * شرطِ ساختگی است. آمار رسمی هرگز پشتوانه‌ی «قاعده» نمی‌شود.
   */
  const unsupported = new Set<OverclaimPattern>();
  const supported = new Set<OverclaimPattern>();
  for (const sentence of stripNonProse(text).split(/[.؟?!؛\n]+/)) {
    for (const p of EVIDENCE_OVERCLAIM_FA) {
      if (!p.re.test(sentence)) continue;
      const describesStatistic =
        p.descriptiveOk === true &&
        descriptive.some((f) => /[0-9۰-۹]/.test(f)) &&
        DESCRIPTIVE_FRAME.test(sentence) &&
        !STAT_TO_RULE.test(sentence);
      if (describesStatistic) continue;
      if (official.some((f) => p.support.test(f))) supported.add(p);
      else unsupported.add(p);
    }
  }
  for (const p of unsupported) supported.delete(p);
  const hasOfficialSource = research.sources.some(
    (s) => sourceAuthority(s.url, s.title) === "official"
  );

  return [
    {
      name: "ادعای رسمی بدون پشتوانه‌ی رسمی",
      severity: "blocking",
      pass: unsupported.size === 0,
      note:
        unsupported.size === 0
          ? "هر ادعای رسمی یا قطعی، فکتِ رسمیِ مرتبط در پژوهش دارد"
          : `${[...unsupported].map((p) => `${p.label} → ${p.safer}`).join(" | ")} — ${
              hasOfficialSource
                ? "هیچ فکتِ [رسمی] پژوهش این را نمی‌گوید"
                : descriptive.length > 0
                  ? "فهرست منابع فقط آمار/ارزیابیِ رسمی دارد که وضعیت دارندگان ویزا را توصیف می‌کند و قاعده یا آستانه نمی‌سازد؛ هیچ راهنمای رسمیِ جاری در فهرست نیست"
                  : "فهرست منابع این مقاله هیچ منبع رسمی (GOV.UK / قواعد مهاجرت) ندارد"
            }؛ به توصیه یا تفسیر بازنویسی کن یا حذف کن. منبع غیررسمی هرگز ادعا را رسمی نمی‌کند`,
    },
    {
      name: "وضعیت شواهد (رسمی / شاهد ممکن / توصیه)",
      severity: "advisory",
      pass: supported.size === 0,
      note:
        supported.size === 0
          ? "ادعای رسمیِ پشتیبانی‌شده‌ای نیست که دقتش باید سنجیده شود"
          : `${[...supported].map((p) => p.label).join(" | ")} — فکت رسمیِ مرتبط هست؛ مطمئن شو جمله دقیقاً همان را می‌گوید، نه بیشتر`,
    },
  ];
}

/**
 * همه‌ی چک‌های قطعی مقاله‌ی بلاگ: چک‌های برند کانال بلاگ + وضعیت شواهد
 * (که پژوهش لازم دارد و برای همین در `runBrandChecks` نیست).
 */
export function runBlogChecks(input: { text: string; research: EvidenceBundle }): BrandCheck[] {
  return [
    ...runBrandChecks({ text: input.text, channel: "blog-fa" }),
    ...checkEvidenceGroundingBlog(input.text, input.research),
  ];
}

/** برچسب‌های داخلی پژوهش ([رسمی]، [تفسیر]، [پیشنهاد عملی]) نباید وارد مقاله شوند */
export function checkEvidenceTagLeak(text: string): BrandCheck {
  const m = stripNonProse(text).match(EVIDENCE_TAG_LEAK);
  return {
    name: "برچسب داخلی پژوهش در متن",
    severity: "blocking",
    pass: !m,
    note: m ? `«${m[0]}» در متن آمده — برچسب پژوهش داخلی است؛ حذفش کن و جمله را با لحن درست همان وضعیت بنویس` : "برچسب داخلی پژوهش در متن نیست",
  };
}

/** چک‌های مخصوص کانال فارسی — هیچ‌کدام به کانال دیگری سرایت نمی‌کند */
function channelChecksFa(text: string, channel: BrandChannel | undefined): BrandCheck[] {
  switch (channel) {
    case "instagram-fa":
    case "story-fa":
    case "reels-fa":
      return [checkNoLatinInPersianInstagram(text), checkAddress(text, "تو")];
    case "blog-fa":
      return [
        checkAddress(text, "شما"),
        checkPlainPersianBlog(text),
        checkWrittenPersianBlog(text),
        checkEvidenceTagLeak(text),
      ];
    default:
      return [];
  }
}

/**
 * ورودی `text` می‌تواند مارک‌داون مقاله یا متن پیوسته‌ی محتوای اجتماعی باشد.
 * چکِ ارقام خودش مارک‌داون را تمیز می‌کند؛ بقیه روی متن خام کار می‌کنند.
 *
 * `channel` (v3.7) قواعد کانال را روشن می‌کند — لاتین و «تو» برای
 * اینستاگرام فارسی، «شما» برای بلاگ. نبودش یعنی فقط قواعد مشترک برند
 * (رفتار قبلی، برای فراخوانی‌هایی که کانال نمی‌دانند).
 */
export function runBrandChecks(input: {
  text: string;
  /** پیش‌فرض «fa» تا هیچ فراخوانی موجود بلاگ نشکند */
  language?: "fa" | "en";
  channel?: BrandChannel;
}): BrandCheck[] {
  const { text, language = "fa", channel } = input;

  if (language === "en") return runBrandChecksEn(text);

  // کاروسل و استوریِ فارسی سرتاسر محاوره‌ی نرم‌اند (۲۰۲۶-۱۰-۰۹)
  const spoken = isSpokenRegisterChannel(channel);

  return [
    checkForbiddenClaims(text, spoken),
    checkWrongTerms(text),
    checkForbiddenNarrative(text, spoken),
    checkTranslationFraming(text, spoken),
    checkInternalJargon(text),
    checkBrandInHeading(text),
    checkBrandAsSubject(text),
    checkCompetitorComparison(text),
    checkSuperlatives(text),
    ...channelChecksFa(text, channel),
    checkLatinDigits(text),
    checkLatinQuotes(text),
    checkHalfSpace(text),
  ];
}
