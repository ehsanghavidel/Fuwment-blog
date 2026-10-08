import { COMPANY_NAME, COMPANY_NAME_EN, type ContentLanguage } from "./core";
import { POSITIONING_FA, POSITIONING_EN } from "./positioning";
import { VOICE_FA, VOICE_EN } from "./voice";
import { CLAIMS_FA, CLAIMS_EN } from "./claims";
import { BLOG_PLAIN_PERSIAN_FA, EVIDENCE_STATUS_RULES_FA } from "./blog";
import {
  TERMINOLOGY_FA,
  INTERNAL_LANGUAGE_RULE_FA,
  INTERNAL_LANGUAGE_RULE_EN,
  MAIN_TAGLINE_FA,
  PERSIAN_SCRIPT_TERMS,
} from "./terminology";

/**
 * قواعد کانال — بخش‌های «لحن در کانال‌ها»، «ضمیر و سطح زبان»، «اینستاگرام
 * فارسی — قواعد اجرایی» و «دستور کار ابزار تولید محتوای اینستاگرام» در v3.7.
 *
 * ⚠️ هر کانال بلوک **صریح** خودش را دارد و هیچ کانالی قاعده‌ی دیگری را
 * ارث نمی‌برد مگر اینجا آشکارا ترکیب شده باشد:
 * - «تو» و محاوره فقط در اینستاگرام فارسی (کاروسل، استوری، ریلز — تصمیم
 *   مالک برای استوری و ریلز).
 * - «شما»ی گرم در بلاگ/سایت.
 * - هیچ قاعده‌ی نگارش فارسی (ارقام فارسی، گیومه، نیم‌فاصله، «تو»/«شما») در
 *   کانال‌های انگلیسی نیست، و برعکس.
 */

export type BrandChannel =
  | "blog-fa"
  | "instagram-fa"
  | "story-fa"
  | "reels-fa"
  | "instagram-en"
  | "story-en"
  | "linkedin-en";

/** نوع محتوا + زبان → کانال برند. لینکدین همیشه انگلیسی است (تصمیم مالک، v3.7). */
export function brandChannelFor(
  kind: "blog" | "instagram" | "story" | "reels" | "linkedin",
  language: ContentLanguage
): BrandChannel {
  switch (kind) {
    case "blog":
      return "blog-fa";
    case "linkedin":
      return "linkedin-en";
    case "reels":
      // ریلز فقط فارسی تولید می‌شود؛ زبانِ ورودی دیگری مسیرِ ریلز ندارد.
      return "reels-fa";
    case "instagram":
      return language === "en" ? "instagram-en" : "instagram-fa";
    case "story":
      return language === "en" ? "story-en" : "story-fa";
  }
}

export function isPersianChannel(channel: BrandChannel): boolean {
  return channel.endsWith("-fa");
}

/* ── فارسی: نگارش مشترک ──────────────────────────────────── */

const WRITING_STYLE_FA = `شیوه‌نامه‌ی نگارش فارسی:
- ارقام: متن فارسی ارقام فارسی (۳ تا ۵ سال). قیمت، کد و تاریخ میلادی ارقام لاتین (£2,400).
- نیم‌فاصله همیشه: می‌شود، نمی‌دانم، شبکه‌های.
- «گیومه‌ی فارسی» و ویرگول فارسی (،). بدون سه‌نقطه‌ی پیاپی و علامت تعجب چندگانه.
- ایتالیک و زیرخط در متن فارسی ممنوع.
- هر پاراگراف حداکثر سه خط.`;

/* ── بلاگ / سایت — «شما» ─────────────────────────────────── */

export const BLOG_FA_RULES = `قواعد کانال: سایت و بلاگ فارسی (این قواعد فقط مال همین کانال است):
- خطاب: «شما»ی گرم — نه اداری، نه «تو». تنها استثنا تگ‌لاین‌های ثابت برند است و به متن بدنه سرایت نمی‌کند.
- سطح زبان: نوشتاری ساده؛ لحن روشن، مطمئن، بدون هیجان. هر صفحه یک پیام و یک دعوت اصلی.
- بار اول نام مسیر با معادل انگلیسی در پرانتز: «ویزای گلوبال تلنت (Global Talent)»، «اینوویتور فاندر (Innovator Founder)»؛ بعد فقط فارسی.
- واژه‌ی انگلیسی که لازم است با حروف لاتین، نه فینگلیش.
- اندورسمنت بار اول: «اندورسمنت — تأییدیه‌ای که پیش از ویزا لازم است».
- تاریخ فارسی: شمسی + میلادی در پرانتز برای ددلاین‌ها.
- معادل مخاطب برای مفهوم‌های داخلی (نمونه‌اند، هر بار برای همان محتوا بازنویسی کن):
  · مسئله‌ی اصلی → «دستاورد دارید، ولی معلوم نیست کدامش برای پرونده‌تان ارزش دارد.»
  · پرونده‌ی محکم → «پرونده‌ای که هر ادعایش مدرک دارد.»
  · ارزیابی → «با هم می‌بینیم سابقه‌تان چقدر برای این مسیر آماده است.»
  · تناسب مسیر → «آیا این مسیر اصلاً به شرایط شما می‌خورد؟»
  · مراحل کار → «شش قدم روشن، از ارزیابی تا ثبت درخواست.»
  · تعهد صداقت → «اگر مسیر به شما نخورد، همان اول می‌گوییم.»
  · سه معیار کارآفرینی → «ایده‌تان تازه است؟ شدنی است؟ می‌تواند بزرگ شود؟»

${BLOG_PLAIN_PERSIAN_FA}

${EVIDENCE_STATUS_RULES_FA}

${WRITING_STYLE_FA}`;

/* ── اینستاگرام فارسی — «تو» (کاروسل، استوری، ریلز) ────────── */

/**
 * دستور کار ابزار تولید محتوای اینستاگرام — v3.7 صریحاً گفته «عیناً در
 * پرامپت قرار دهید». متن کلمه‌به‌کلمه از راهنماست؛ ویرایشش نکن.
 */
export const INSTAGRAM_OPERATIONAL_BLOCK_FA = `دستور کار ابزار تولید محتوای اینستاگرام:
۱. پیام و موضع را از Brand Guide بگیر؛ واژه‌های داخلی آن را در متن نیاور.
۲. فارسی طبیعی و روزمره؛ خطاب «تو».
۳. کاور و قلاب محاوره‌ای و کوتاه؛ کپشن نوشتاری ساده.
۴. هر پست فقط یک پیام؛ اول مسئله مخاطب.
۵. جمله کوتاه؛ پاراگراف حداکثر سه خط.
۶. حروف لاتین نه؛ نام مسیرها: «گلوبال تلنت» و «اینوویتور فاندر».
۷. اگر معادل فارسی هست، واژه انگلیسی نه؛ اصطلاح لازم را همان‌جا ساده توضیح بده.
۸. لحن اداری، آکادمیک و مشاوره‌ای نه؛ حرفه‌ای یعنی واضح و مطمئن.
۹. حداکثر یک CTA، هماهنگ با هدف پست. «لینک ارزیابی مسیر در بایو است» فقط در پست فروش یا تبدیل؛ پست آموزشی: «ذخیره کن»، «برای کسی بفرست» یا بدون CTA.
۱۰. قواعد ادعا همچنان پابرجاست: بدون تضمین، بدون نرخ موفقیت، بدون عدد تأییدنشده.`;

/** زبان مشترک کاروسل، استوری و ریلزِ فارسی */
const INSTAGRAM_FA_LANGUAGE = `قواعد کانال: اینستاگرام فارسی (این قواعد فقط مال همین کانال است و به بلاگ یا انگلیسی سرایت نمی‌کند):
- خطاب «تو» — گرم، ساده، آموزشی. هرگز «شما» یا لحن اداری.
- کاور و قلاب: محاوره‌ای (شکسته) و کوتاه، شبیه سؤال یا فکری که خود مخاطب در ذهن دارد. اول مسئله‌ی او، نه معرفی ما.
- کپشن و متن توضیحی: نوشتاری ساده با «تو»؛ جمله‌ی کوتاه؛ پاراگراف حداکثر سه خط؛ هر پست فقط یک پیام.
- **حروف لاتین نه.** نام‌های رسمی و جاافتاده همیشه با حروف فارسی: ${PERSIAN_SCRIPT_TERMS.join("، ")}. حروف لاتین فقط در امضای ${COMPANY_NAME_EN} و شماره‌ی ثبت IAA مجاز است — هرگز در کاور و قلاب.
- هشتگ‌ها هم بخشی از متن‌اند: فقط با حروف فارسی (مثل #گلوبال_تلنت)، هرگز لاتین.
- هر اصطلاح تخصصی بلافاصله در همان جمله ساده توضیح داده می‌شود.
- ارقام فارسی؛ گیومه‌ی فارسی؛ نیم‌فاصله؛ حداکثر ۳ اموجی.
- قلاب‌های گروه‌های مخاطب مفهوم‌اند، نه متن نهایی — با «تو» و محاوره بازنویسی‌شان کن.
- تگ‌لاین «${MAIN_TAGLINE_FA}» فقط در جای امضا (بایو، اسلاید یا فریم آخر) — هرگز روی کاور یا قلاب.
- معادل مخاطب برای مفهوم‌های داخلی (ستون اینستاگرام — نمونه‌اند، هر بار از نو بنویس):
  · «دستاورد داری، ولی نمی‌دونی کدومش واقعاً برای پرونده‌ات ارزش داره؟»
  · «هر چی می‌گی، مدرکش رو داری؟»
  · «ببینیم سابقه‌ات واقعاً چقدر برای این مسیر آماده‌ست.»
  · «این مسیر اصلاً به تو می‌خوره؟»
  · «از کجا شروع کنم؟ شش قدم، به ترتیب.»
  · «اگه این مسیر مال تو نباشه، همون اول می‌گیم.»
  · «ایده‌ات تازه‌ست؟ شدنیه؟ می‌تونه بزرگ بشه؟»
  · «اندورسمنت چیه و چرا قبل از ویزا لازمه؟»
- مثال قبل/بعد کپشن: ✗ «${COMPANY_NAME} با ارائه خدمات جامع و بهره‌گیری از فرآیند ارزیابی ساختاریافته، در راستای ارتقای خوانایی پرونده متقاضیان گام برمی‌دارد.» ✓ «قبل از هر کاری، با منتورِ همان مسیر می‌نشینیم و می‌بینیم این مسیر اصلاً به تو می‌خورد یا نه. اگر نخورد، همان اول می‌گوییم.»

${INSTAGRAM_OPERATIONAL_BLOCK_FA}`;

export const INSTAGRAM_CAROUSEL_FA_RULES = `${INSTAGRAM_FA_LANGUAGE}

قالب کاروسل:
- کاور (اسلاید اول): بسیار کوتاه — حدود ۷ کلمه — محاوره‌ای، بدون حروف لاتین و بدون واژه‌ی داخلی برند. مثال: ✗ «بهینه‌سازی روایت پرونده Global Talent» ✓ «بدون مقاله هم می‌شه؟»
- هر اسلاید یک ایده، حدود ۲۵ کلمه یا کمتر.
- ساختار کپشن: قلاب ← مشکل (سطح درونی) ← ارزش ← قدم بعدی. نمونه‌ی اجراشده: قلاب «ماه‌ها روی مدارک کار کردی و تازه فهمیدی مسیرت این نبوده؟» · مشکل «سخت‌ترین بخش، جمع‌کردن مدرک نیست؛ اینکه بدانی کدام مسیر به تو می‌خورد.» · ارزش «سه سؤال کمکت می‌کند زودتر بفهمی.» · قدم بعدی «ذخیره‌اش کن تا قبل از شروع، این سه سؤال را از خودت بپرسی.»
- قانون قلاب: سه ثانیه‌ی اول باید حرف مخاطب باشد، نه حرف ما.`;

export const STORY_FA_RULES = `${INSTAGRAM_FA_LANGUAGE}

قالب استوری (همان زبان اینستاگرام فارسی — تصمیم قطعی مالک):
- فریم اول همان قلاب است: محاوره‌ای، کوتاه، «تو».
- متن هر فریم برای خواندن چندثانیه‌ای روی تمام‌صفحه است — از کپشن هم کوتاه‌تر.`;

export const REELS_FA_RULES = `${INSTAGRAM_FA_LANGUAGE}

قالب ریلز (زبان اینستاگرام فارسی + لحن ویدیوی v3.7):
- لحن ویدیو: روایی و آرام. با یک سؤال، یک موقعیت واقعی، یک کیس یا یک داستان شروع کن — هرگز با معرفی شرکت، سلام یا مقدمه‌چینی.
- اسکریپت برای بلند خوانده‌شدن است: فارسی گفتاری و طبیعی با «تو» (شکسته‌ی محاوره‌ای مجاز است، چون گفته می‌شود نه خوانده). جمله‌ها کوتاه و قابل نفس‌گیری.
- متنِ روی تصویر مثل کاور: کوتاه و محاوره‌ای، بدون لاتین.
- کپشن ریلز: نوشتاری ساده با «تو».`;

/* ── انگلیسی ─────────────────────────────────────────────── */

const ENGLISH_STYLE = `English writing rules (no Persian-language writing rules apply here — no Persian digits, Persian quotation marks or half-spaces; never switch to Persian):
- Address the reader as "you". Plain English: short sentences, no internal jargon, no consultancy-speak.
- This is not a translation. Structure may carry over from a brief; every sentence is written fresh in natural English.
- Write route names in English: Global Talent visa, Innovator Founder visa, endorsement, Indefinite Leave to Remain (ILR). Fuwment always with a capital F only.
- Latin digits. Dates as "31 July 2026".
- The Persian tagline is never translated word for word; do not invent new slogans for the brand.`;

export const LINKEDIN_EN_RULES = `Channel rules: LinkedIn (English only — v3.7 sets LinkedIn's language to English):
- Tone: professional, analytical, measured. Data and case-study thinking — but only facts present in the input; never invent figures, cases or names.
- No emoji. None.
- Primary readers: academics and founders; write for the specific audience group in the brief.
- Open with a concrete claim or a real observation, not a self-introduction or "In this post…".
- End with a genuine question that invites the reader's own experience — not a sales prompt.

${ENGLISH_STYLE}`;

export const SOCIAL_EN_RULES = `Channel rules: Instagram in English (feed carousel and Story):
- Tone: warm, simple, educational — "you", one message per post, the reader's problem first.
- Short sentences; paragraphs of at most three lines; at most 3 emoji; hashtags in English only.
- The cover is very short (around seven words) and starts from the reader's problem; never a tagline, never internal brand vocabulary.

${ENGLISH_STYLE}`;

/* ── ترکیب ───────────────────────────────────────────────── */

const CHANNEL_RULES: Record<BrandChannel, string> = {
  "blog-fa": BLOG_FA_RULES,
  "instagram-fa": INSTAGRAM_CAROUSEL_FA_RULES,
  "story-fa": STORY_FA_RULES,
  "reels-fa": REELS_FA_RULES,
  "instagram-en": SOCIAL_EN_RULES,
  "story-en": SOCIAL_EN_RULES,
  "linkedin-en": LINKEDIN_EN_RULES,
};

export function channelRules(channel: BrandChannel): string {
  return CHANNEL_RULES[channel];
}

/**
 * زمینه‌ی کامل برند برای نویسنده یا ویراستارِ یک کانال.
 *
 * فارسی: جایگاه‌یابی + صدا + ادعا + واژگان + مرز زبان داخلی + قواعد کانال.
 * انگلیسی: همان‌ها از نو به انگلیسی — هیچ متن فارسی‌ای که نویسنده بتواند
 * کپی کند، و هیچ قاعده‌ی نگارش فارسی.
 */
export function brandContext(channel: BrandChannel): string {
  if (isPersianChannel(channel)) {
    return [
      POSITIONING_FA,
      VOICE_FA,
      CLAIMS_FA,
      TERMINOLOGY_FA,
      INTERNAL_LANGUAGE_RULE_FA,
      CHANNEL_RULES[channel],
    ].join("\n\n");
  }
  return [POSITIONING_EN, VOICE_EN, CLAIMS_EN, INTERNAL_LANGUAGE_RULE_EN, CHANNEL_RULES[channel]].join(
    "\n\n"
  );
}

/**
 * قواعد مشترکِ برند، **بدون** قواعد کانال — برای ایجنت‌های برنامه‌ریزی
 * (ایده‌یاب، استراتژیست، زاویه‌یاب‌ها) که بریف داخلی می‌سازند و هنوز
 * کانال/زبان نهایی را نمی‌نویسند.
 */
export const SHARED_BRAND_RULES_FA = [VOICE_FA, CLAIMS_FA, TERMINOLOGY_FA, INTERNAL_LANGUAGE_RULE_FA].join(
  "\n\n"
);

/** یادآوری برای سازنده‌های بریف: بریف داخلی است، ولی بخش‌هایش به نویسنده می‌رسند */
export const BRIEF_LANGUAGE_NOTE_FA = `⚠️ این بریف داخلی است، ولی نویسنده از رویش می‌نویسد: در hookAngle، keyPoints و cta واژه‌ی داخلی برند (شکاف خوانایی، مسیر خوانا، پیمان فومنت، پرونده‌ی قابل دفاع، قهرمان، دشمن، CTA…) نیاور — مفهوم را با زبان مخاطب بگو. ضمیر خطاب (تو/شما) و زبان نهایی را نویسنده بر اساس کانال تعیین می‌کند، نه تو.`;
