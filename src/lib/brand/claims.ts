/**
 * قواعد ادعا و انطباق — بخش ۰۴ راهنمای برند v3.7 («این صفحه بر همه‌ی
 * قواعد دیگر اولویت دارد») + فرهنگ معیارها و اعتبارهای بخش ۰۳.
 *
 * ⚠️ این فایل تنها منبعِ فهرست‌های ادعاست. هم چک‌های قطعی
 * (`agents/brand-checks.ts`) از همین آرایه‌ها می‌خوانند و هم متن پرامپت از
 * همین‌ها ساخته می‌شود — پیش از v3.7 این دو جدا نوشته شده بودند و هر تغییر
 * یکی را جا می‌گذاشت.
 *
 * ⚠️ قواعد حقوقی (عنوان‌های حفاظت‌شده، سطح ۱ IAA، ادعای اقتدار کاذب) از
 * قانون می‌آیند نه از سلیقه‌ی برند — با هیچ نسخه‌ی راهنما شل نمی‌شوند.
 */

/* ── فارسی ───────────────────────────────────────────────── */

export type ClaimTerm = { term: string; why: string };

/**
 * واژه‌های ممنوعِ ادعا — کلمه‌کامل سنجیده می‌شوند.
 *
 * «تضمین‌شده» و «تضمین شده» در v3.7 اضافه شدند: تطبیق کلمه‌کاملِ «تضمین»
 * شکلِ چسبیده با نیم‌فاصله را نمی‌گرفت («نتیجه‌ی تضمین‌شده» بی‌صدا رد
 * می‌شد). این سخت‌ترکردن است، نه شل‌کردن.
 */
export const FORBIDDEN_CLAIMS_FA: ClaimTerm[] = [
  { term: "تضمینی", why: "تضمین نتیجه — هیچ نتیجه‌ای در این مسیرها تضمین نمی‌شود" },
  { term: "تضمین", why: "تضمین نتیجه — هیچ نتیجه‌ای در این مسیرها تضمین نمی‌شود" },
  { term: "تضمین‌شده", why: "تضمین نتیجه — هیچ نتیجه‌ای در این مسیرها تضمین نمی‌شود" },
  { term: "تضمین شده", why: "تضمین نتیجه — هیچ نتیجه‌ای در این مسیرها تضمین نمی‌شود" },
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

/**
 * ادبیات ترسِ v3.7 که با یک واژه‌ی ثابت گرفته نمی‌شود.
 *
 * راهنما سه نمونه را صریح ممنوع کرده: «تا دیر نشده»، «آخرین فرصت»
 * (هر دو در فهرست بالا) و «هر روز شانس‌تان کمتر می‌شود». سومی شکل‌های
 * زیادی دارد («هر روز که می‌گذرد شانست کمتر می‌شود»)، پس الگوست نه واژه.
 * مرز جمله نگه داشته می‌شود تا از جمله‌ی بعدی نپرد.
 */
export const FEAR_PATTERNS_FA: { re: RegExp; why: string }[] = [
  {
    re: /هر\s*روز[^.!?؟\n]{0,30}شانس[^.!?؟\n]{0,20}(کمتر|کم)\s*(می‌|می\s?)شود/,
    why: "ادبیات ترس — «هر روز شانس‌تان کمتر می‌شود» صریحاً در راهنمای برند ممنوع است",
  },
  {
    re: /وقت\s*(داره|دارد)\s*تموم\s*می‌?شه|زمان\s*(در\s*حال\s*)?(تمام|از\s*دست)\s*(شدن|رفتن)\s*است/,
    why: "ادبیات ترس — فوریت ساختگی",
  },
];

/**
 * جمله‌های **مجاز** که واژه‌ی «تضمین» را دارند.
 *
 * ⚠️ این‌ها از خودِ راهنمای v3.7 آمده‌اند: «هیچ نتیجه‌ای را تضمین
 * نمی‌کنیم — و هیچ چیزی را هم پنهان نمی‌کنیم» (پیمان فومنت، قول ۲) و
 * «بدون اغراق و بدون تضمین» (توضیح کانال تلگرام). چکِ ادعا که این‌ها را
 * رد کند، دقیقاً همان صداقتی را جریمه می‌کند که برند می‌خواهد (قاعده‌ی ۲
 * پروژه).
 *
 * الگوها **فقط نفی** را می‌گیرند و پیش از سنجیدن، از متن پاک می‌شوند. هر
 * «تضمین» دیگری در همان متن همچنان رد می‌شود — پس «تضمین نمی‌کنیم، ولی
 * با ما ویزای شما تضمینی است» هنوز مسدود است.
 */
const NEG_VERB = "(?:نمی‌|نمی\\s?)(?:کنیم|کند|کنند|شود|شوند|دهیم|دهد|دهند)";
export const GUARANTEE_NEGATIONS_FA: RegExp[] = [
  // «بدون تضمین»، «بدون هیچ تضمینی»
  /بدون\s+(?:هیچ\s+)?تضمین(?:ی)?/g,
  // «… را تضمین نمی‌کنیم»، «تضمین نمی‌شود»
  new RegExp(`تضمین\\s+${NEG_VERB}`, "g"),
  // «هیچ تضمینی نیست / وجود ندارد / نمی‌دهیم»
  /هیچ\s+تضمینی\s+(?:نیست|ندارد|وجود\s+ندارد|(?:نمی‌|نمی\s?)(?:دهیم|دهد|دهند))/g,
  // «تضمینی وجود ندارد / در کار نیست»
  /تضمینی\s+(?:وجود\s+ندارد|در\s+کار\s+نیست|نیست)/g,
  // «نمی‌توانیم … تضمین کنیم»
  /(?:نمی‌|نمی\s?)توان(?:یم|ند|د)?\s+[^.!?؟\n]{0,25}?تضمین\s+(?:کنیم|کند|کرد|بدهیم|بدهد)/g,
];

/** حذف جمله‌های نفیِ مجاز پیش از سنجیدن واژه‌های تضمین */
export function stripGuaranteeNegationsFa(text: string): string {
  return GUARANTEE_NEGATIONS_FA.reduce((t, re) => t.replace(re, " "), text);
}

/**
 * صورت‌های **گفتاری** نفیِ صادقانه و ادبیات ترس — فقط برای کانال‌های
 * محاوره‌ی نرم (کاروسل و استوریِ فارسی، تصمیم مالک ۲۰۲۶-۱۰-۰۹).
 *
 * ⚠️ دو شکست متقارن را می‌بندد:
 * - خطای کاذب: «کسی نمی‌تونه نتیجه رو تضمین کنه» — صادقانه‌ترین جمله‌ی ممکن
 *   — مسدود می‌شد چون فهرست نوشتاری فقط «نمی‌توانیم … تضمین کنیم» را
 *   می‌شناخت. یعنی بازنویسی بی‌دلیل (قاعده‌ی ۲).
 * - شکست بی‌صدا: «هر روز شانست کمتر می‌شه» از الگوی ترس رد می‌شد.
 *
 * عمداً جدا از فهرست‌های بالاست: بلاگ و ریلز دقیقاً همان رفتار قبلی را
 * نگه می‌دارند. هر «تضمین»ِ دیگری در همان متن همچنان مسدود است.
 */
const NEG_VERB_SPOKEN = "(?:نمی‌|نمی\\s?)(?:کنه|کنن|شه|شن|دیم|ده|دن)(?![\\u0600-\\u06FF])";
export const GUARANTEE_NEGATIONS_SPOKEN_FA: RegExp[] = [
  // «تضمین نمی‌کنه»، «تضمین نمی‌شه»، «تضمین نمی‌دیم»
  new RegExp(`تضمین\\s+${NEG_VERB_SPOKEN}`, "g"),
  // «هیچ تضمینی نداره / وجود نداره / نمی‌دیم»
  /هیچ\s+تضمینی\s+(?:نداره|وجود\s+نداره|(?:نمی‌|نمی\s?)(?:دیم|ده|دن))(?![؀-ۿ])/g,
  // «تضمینی وجود نداره»
  /تضمینی\s+وجود\s+نداره(?![؀-ۿ])/g,
  // «نمی‌تونیم/نمی‌تونه … تضمین کنیم/کنه»
  /(?:نمی‌|نمی\s?)تون(?:یم|ن|ه)?\s+[^.!?؟\n]{0,25}?تضمین\s+(?:کنیم|کنه|کنن|بدیم|بده)(?![؀-ۿ])/g,
];

export function stripGuaranteeNegationsSpokenFa(text: string): string {
  return GUARANTEE_NEGATIONS_SPOKEN_FA.reduce((t, re) => t.replace(re, " "), stripGuaranteeNegationsFa(text));
}

/**
 * ادعای «بی‌ریسک» که با واژه‌ی ثابت «بدون ریسک» گرفته نمی‌شود — فقط
 * کاروسل و استوری (محاوره‌ی نرم). از اولین تست زنده (۲۰۲۶-۱۰-۰۹): «ریسک
 * قفل‌شدن سرمایه‌ات صفره» با امتیاز ۸۲ تأیید شد؛ ویراستار دیده بود ولی
 * نمره‌ی کل بالای حد نصاب بود و بازنویسی راه نیفتاد.
 *
 * ⚠️ نفیِ صادقانه («هیچ مسیری ریسکش صفر نیست»، «هیچ‌چیز بی‌ریسک نیست»)
 * عمداً رد نمی‌شود — دقیقاً همان صداقتی است که برند می‌خواهد (قاعده‌ی ۲).
 * پس اگر تا پایان همان جمله «نیست/نداره/وجود نداره/نمی‌شه» آمده باشد، تطبیق
 * نمی‌خورد؛ و فاصله‌ی «ریسک» تا «صفر» از ویرگول رد نمی‌شود («ریسک داره،
 * ولی سرمایه‌ات صفر نمی‌شه» دو بند جداست).
 */
const NOT_NEGATED_IN_SENTENCE = "(?![^.!?؟\\n]*(?:نیست|نیس(?![\\u0600-\\u06FF])|نداره|ندارد|وجود\\s+ندار|نمی\\u200C?ش))";
export const CERTAINTY_PATTERNS_SPOKEN_FA: { re: RegExp; why: string }[] = [
  {
    // «ریسکش صفره»، «ریسک قفل‌شدن سرمایه‌ات صفره»، «با ریسک صفر»
    re: new RegExp(`ریسک[^.!?؟\\n،؛]{0,30}?صفر(?:\\u200C?ه)?(?![\\u0600-\\u06FF])${NOT_NEGATED_IN_SENTENCE}`),
    why: "ادعای قطعیت مطلق — «ریسک صفر» یعنی «بدون ریسک»؛ بگو چه چیزی دست خودت می‌ماند، نه اینکه ریسکی نیست",
  },
  {
    // «کاملاً بی‌ریسکه»، «بی‌ریسک»
    re: new RegExp(`بی\\u200C?\\s?ریسک${NOT_NEGATED_IN_SENTENCE}`),
    why: "ادعای قطعیت مطلق — «بی‌ریسک» همان «بدون ریسک» است",
  },
];

export const FEAR_PATTERNS_SPOKEN_FA: { re: RegExp; why: string }[] = [
  {
    re: /هر\s*روز[^.!?؟\n]{0,30}شانس[^.!?؟\n]{0,20}(کمتر|کم)\s*(می‌|می\s?)شه(?![؀-ۿ])/,
    why: "ادبیات ترس — «هر روز شانست کمتر می‌شه» صریحاً در راهنمای برند ممنوع است",
  },
];

/* ── انگلیسی ─────────────────────────────────────────────── */

/** `cs: true` یعنی تطبیق حساس به بزرگی حروف — برای املای نام برند */
export type EnTerm = { term: string; why: string; cs?: boolean };

export const FORBIDDEN_CLAIMS_EN: EnTerm[] = [
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

export const FEAR_PATTERNS_EN: { re: RegExp; why: string }[] = [
  {
    re: /\bevery\s+day[^.!?\n]{0,30}\byour\s+chances?\b[^.!?\n]{0,20}\b(shrink|drop|fall|get\s+(smaller|lower|worse))/i,
    why: "fear framing — the guide explicitly bans «every day your chances shrink»",
  },
  { re: /\btime\s+is\s+running\s+out\b/i, why: "fear framing — manufactured urgency" },
];

/**
 * نفیِ مجازِ «guarantee» — همان منطق نسخه‌ی فارسی. «We don't guarantee
 * outcomes» صادقانه است، نه ادعا.
 */
export const GUARANTEE_NEGATIONS_EN: RegExp[] = [
  /\b(?:no|without(?:\s+any)?)\s+guarantees?\b/gi,
  /\b(?:do|does|did|could|would)\s*(?:not|n['’]t)\s+guarantee\b/gi,
  /\b(?:cannot|can\s+not|can['’]t|will\s+not|won['’]t)\s+guarantee\b/gi,
  /\b(?:is|are|was|were)\s*(?:not|n['’]t)\s+guaranteed\b/gi,
  /\bno\s+(?:outcome|result|decision)s?\s+(?:is|are|can\s+be)\s+guaranteed\b/gi,
];

export function stripGuaranteeNegationsEn(text: string): string {
  return GUARANTEE_NEGATIONS_EN.reduce((t, re) => t.replace(re, " "), text);
}

/**
 * ادعاهای جایگاه نظارتی.
 *
 * «immigration advice» و «immigration adviser» عمداً اینجا نیستند —
 * فومنت واقعاً تحت نظارت IAA ثبت شده (F202639410) و حق دارد این را
 * بگوید. چیزی که ممنوع است «legal» است.
 */
export const REGULATED_STATUS_EN: EnTerm[] = [
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
  // ⚠️ «Associated with» عمداً اینجا نیست، با اینکه v3.7 ممنوعش کرده:
  // «risks associated with the route» انگلیسیِ کاملاً سالم است و تطبیق
  // واژه‌ای آن را هم می‌گرفت. قاعده در CLAIMS_EN (پرامپت) هست.
  { term: "OISC", why: "former regulator name — the correct name is IAA" },
];

export const SUPERLATIVES_EN = [
  "best", "#1", "number one", "leading", "top-rated", "unrivalled", "unrivaled",
  "unmatched", "unparalleled", "world-class", "premier", "most trusted",
  "most experienced", "industry-leading", "gold standard",
];

export const COMPETITOR_COMPARISON_EN = [
  "unlike other agencies", "unlike other consultants", "better than",
  "cheaper than", "most agencies fail", "typical consultants",
];

/* ── متن پرامپت ──────────────────────────────────────────── */

/**
 * فرهنگ معیارها — هر عدد یک تعریف واحد دارد. هر عدد با تاریخ مرجع
 * («تا پایان ۲۰۲۵») منتشر می‌شود؛ در سطح برند حداکثر دو اثبات.
 */
const METRICS_FA = `اعداد قابل استفاده — تعریف دقیق هرکدام، هرگز جابه‌جا نشوند:
- +۲۷۰۰ = مشاوره‌ی انجام‌شده (هر جلسه‌ی برگزارشده، صرف‌نظر از نتیجه). برچسب درست Consultations؛ هرگز Clients.
- +۲۰۰ = همراهی کامل تا پایان مسیر. هرگز به‌معنای «ویزای صادرشده» یا «اندورسمنت».
- ۱۰ = منتور Global Talent (همه دارنده‌ی همین ویزا). فقط همین مسیر؛ به‌عنوان «کل شبکه» ارائه نشود.
- ۳ = منتور Innovator Founder. جدا شمرده می‌شود؛ مجموع ۱۳ فقط همراه تفکیک دو مسیر منتشر شود.
- ۲۰۲۱ = سال ثبت Fuwment Ltd. هیچ سال دیگری استفاده نشود.
- نرخ موفقیت: هنوز تعریف نشده — هیچ نرخ، درصد یا عبارت جایگزین منتشر نمی‌شود.
هر عدد با بازه‌ی زمانی بیاید («تا پایان ۲۰۲۵»). در سطح برند حداکثر دو اثبات؛ بقیه جای صفحات عمقی است.
اگر عدد یا ادعایی در ورودی نبود، نساز. قوانین این مسیرها تغییر می‌کنند؛ ادعای قانونی بدون منبع را به بیان کیفی تبدیل کن.`;

const CREDENTIALS_FA = `اعتبارها — هرکدام قاعده‌ی استفاده‌ی خودش را دارد:
- نظارت: Fuwment Ltd تحت نظارت Immigration Advice Authority (IAA) است — شماره‌ی F202639410، سطح Level 1 — Advice and Assistance (Immigration). همیشه با شماره‌ی ثبت و عنوان کامل سطح. خدمات مشاوره‌ی مهاجرتیِ تنظیم‌شده فقط در حدود همین سطح و دسته‌های تأییدشده ارائه می‌شود؛ ادعای خدمات بیرون از آن ممنوع است.
- ثبت ICO (ZB638348): فقط یعنی شرکت در رجیستر حضور دارد؛ هرگز به‌عنوان گواهی امنیت داده یا انطباق با GDPR ارائه نشود.
- گرنت نوآوری (DCMS Create Growth Programme، اجراشده توسط Innovate UK، بخشی از UKRI — ۲۰۲۵): فقط متنی، بدون لوگو، و فقط با متن مصوب.
- Manchester Digital: عضویت شرکت.
- British Council: عضویت یک منتور است نه شرکت — جزو اعتبارهای شرکت نیاور.
- عنوان «Associated with» یا هر بیانی که همکاری یا تأییدیه‌ی رسمی القا کند ممنوع است.`;

/** قواعد ادعا — فارسی. از همان آرایه‌هایی ساخته می‌شود که چک قطعی می‌خواند. */
export const CLAIMS_FA = `قواعد ادعا و انطباق — این بخش بر همه‌ی قواعد دیگر اولویت دارد:
۱. هیچ نتیجه‌ای تضمین نمی‌شود — هیچ‌جا، به هیچ زبانی. ممنوع: ${FORBIDDEN_CLAIMS_FA.filter((c) => /تضمین|۱۰۰|قطعی|ریسک/.test(c.term))
  .map((c) => `«${c.term}»`)
  .join("، ")}.
   جایگزین مجاز: «کاری می‌کنیم پرونده در بهترین شکل ممکن ارائه شود.» گفتنِ صادقانه‌ی «هیچ نتیجه‌ای را تضمین نمی‌کنیم» یا «بدون تضمین» مجاز است.
۲. هیچ ادعای نرخ موفقیت منتشر نمی‌شود — نه عدد، نه درصد، نه «اکثر قریب‌به‌اتفاق» یا «نرخ موفقیت بالا». به‌جایش واقعیت قابل بررسی: ثبت IAA، شبکه‌ی منتورهای هم‌مسیر، بیش از ۲۷۰۰ مشاوره.
۳. مرز منتورینگ و مشاوره‌ی مهاجرتی تنظیم‌شده روشن بماند. واژه‌ی «وکیل» ممنوع است — مشاور ثبت‌شده در IAA لزوماً وکیل نیست. همه‌جا «مشاور مهاجرتی ثبت‌شده».
۴. ادعای برتری مطلق («تنها»، «بهترین»، «بی‌نظیر») نیازمند مدرک است و در تبلیغات بریتانیا قابل شکایت. جایگزین امن: «تمام تمرکز ما روی مسیرهای استعداد و کارآفرینی بریتانیاست» / «منتور شما متخصص همان مسیری است که در آن اقدام می‌کنید».
۵. نام نهادهای اندورس‌کننده فقط برای ارجاع واقعی و فقط در محتوای آموزشیِ تاریخ‌دار؛ هرگز به شکلی که همکاری یا وابستگی رسمی القا کند، و هرگز در پیام هسته‌ای برند. لوگوی این نهادها استفاده نمی‌شود.
۶. هیچ نام، عکس، رشته یا جزئیات پرونده‌ی واقعی بدون اجازه‌ی کتبی منتشر نمی‌شود؛ ترکیب رشته، سن، شهر و سال هم می‌تواند فرد را قابل شناسایی کند. کیس نمونه فقط اگر صریحاً «نمونه» علامت بخورد. رضایت فردی هرگز به‌عنوان نرخ موفقیت عمومی ارائه نشود.
۷. قوانین این ویزاها تغییر می‌کنند؛ محتوای آموزشی تاریخ آخرین به‌روزرسانی دارد (سیستم اضافه می‌کند).
۸. ادبیات ترس ممنوع: «تا دیر نشده»، «آخرین فرصت»، «هر روز شانس‌تان کمتر می‌شود». در هر محتوا حداکثر یک اشاره به ریسک، با ریتم: آسیب‌پذیری ← ارزش حل‌کردن ← اقدام مشخص ← دعوت.
۹. درباره‌ی رقیب حرف نمی‌زنیم؛ درباره‌ی خودمان حرف می‌زنیم — نه مقایسه‌ی مستقیم، نه ضمنی.

${METRICS_FA}

${CREDENTIALS_FA}`;

/** قواعد ادعا — انگلیسی. برای کانال‌های انگلیسی، تا هیچ قاعده‌ی فارسی به خروجی انگلیسی نشت نکند. */
export const CLAIMS_EN = `Claims & compliance — these rules override every other rule:
1. No outcome is ever guaranteed, in any language. Never write: ${FORBIDDEN_CLAIMS_EN.slice(0, 6)
  .map((c) => `"${c.term}"`)
  .join(", ")}. Honest negations ("we don't guarantee outcomes") are fine. Safe alternative: "We make sure your case is presented in the best possible way."
2. No success-rate claims — no figures, percentages, or substitutes ("the vast majority", "high success rate"). Use verifiable facts instead: IAA regulation, mentors with direct experience of the same route, 2,700+ consultations.
3. Fuwment Ltd is regulated by the Immigration Advice Authority (F202639410), Level 1 — Advice and Assistance (Immigration). Never "lawyer", "solicitor", "legal advice", "law firm", never "Associated with". Regulated immigration advice is given only within that level and category.
4. No absolute superiority ("best", "leading", "#1", "only"). Safe: "We focus entirely on the UK's talent and founder routes."
5. Endorsing bodies only as genuine, dated references — never implying partnership. No logos.
6. No real names, photos, fields or case details without written consent; anonymised details must be genuinely unidentifiable.
7. Numbers, each with a reference date ("as of end-2025"): 2,700+ consultations (label: Consultations, never Clients) · 200+ people supported through the full route (never "visas issued" or "endorsements") · 10 Global Talent mentors (that route only) · 3 Innovator Founder mentors (13 only with the split stated) · founded 2021. At brand level, at most two proof points. Never invent a number that is not in the input.
8. No fear framing ("last chance", "before it's too late", "every day your chances shrink"). At most one mention of risk per piece.
9. We never talk about competitors — only about what we do.
10. ICO registration is not a data-security certificate. The DCMS / Innovate UK grant is text-only, no logo. British Council is one mentor's programme, not a company credential.`;
