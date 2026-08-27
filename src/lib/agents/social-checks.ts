import type { Slide, StorySticker } from "@/lib/store";
import { slideText } from "@/lib/slide-spec";
import { LIMITS_BY_LAYOUT } from "./types";
import { countDmCtaLine } from "@/lib/dm-keyword";

/**
 * چک‌های قطعی محتوای اجتماعی — بدون LLM.
 *
 * دقیقاً به همان دلیلِ seo-checks.ts: طول کپشن، تعداد اسلاید، قالب هشتگ و
 * وجود لینک، همه قاعده‌های مکانیکی‌اند. LLM را برای قضاوت (لحن، جذابیت
 * قلاب) نگه می‌داریم و شمردن را با کد انجام می‌دهیم — ارزان‌تر و قطعی.
 *
 * ⚠️ نام هر چک به‌صورت رشته‌ی فارسی در ارکستریتور دوباره match می‌شود
 *    (برای انتخاب ایرادهای «قابل تعمیر توسط نویسنده»). اگر نامی را اینجا
 *    عوض کردی، آنجا هم عوض کن — وگرنه بی‌صدا از کار می‌افتد.
 */

/**
 * `severity` اختیاری است و نبودش یعنی «مسدودکننده».
 *
 * چک‌های خودِ این فایل (طول قلاب، تعداد هشتگ، قالب) همه مسدودکننده‌اند و
 * برچسب نمی‌گیرند. فیلد فقط برای چک‌های برند لازم است که کنار این‌ها در
 * یک فهرست ادغام می‌شوند و بعضی‌شان توصیه‌ای‌اند.
 */
export type SocialCheck = {
  name: string;
  pass: boolean;
  note: string;
  severity?: "blocking" | "advisory";
};

/**
 * شمارش «کاراکترِ دیده‌شده».
 *
 * نکته‌ی مهم یونیکد: str.length واحدهای UTF-16 را می‌شمارد، پس یک ایموجی
 * ۲ حساب می‌شود و یک کپشن سالم را بی‌دلیل رد می‌کنیم. با [...str] روی
 * نقطه‌کدها پیمایش می‌کنیم تا شمارش به آنچه اینستاگرام نشان می‌دهد نزدیک
 * باشد. نیم‌فاصله (‌) عمداً شمرده می‌شود، چون پلتفرم‌ها هم می‌شمارند.
 */


function charCount(s: string): number {
  return [...s].length;
}

/**
 * شمارش اموجی — با گرافیم، نه با regex.
 *
 * ⚠️ `\p{Extended_Pictographic}` جواب غلط می‌دهد و غلط بودنش دو طرفه است:
 *   «سلام 👨‍👩‍👧 و ✌️ و 🇬🇧» → سه اموجیِ دیده‌شده
 *   match(/\p{Extended_Pictographic}/gu) → ۴  (خانواده سه‌تا شمرده می‌شود)
 *   و پرچم 🇬🇧 اصلاً Extended_Pictographic نیست، پس شمرده نمی‌شود.
 *
 * یعنی کپشنی با دقیقاً ۳ اموجی رد می‌شد و یک دور بازنویسی بی‌دلیل
 * راه می‌افتاد — همان تله‌ی «چک قطعی غلط بدتر از نداشتن چک است».
 *
 * Intl.Segmenter واحد شمارش را همان چیزی می‌کند که چشم می‌بیند.
 */

const EMOJI_LIMIT = 3;

function countEmoji(text: string): number {
  const segmenter = new Intl.Segmenter("fa", { granularity: "grapheme" });
  let count = 0;
  for (const { segment } of segmenter.segment(text)) {
    if (/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(segment)) count++;
  }
  return count;
}

/**
 * تشخیص زبان متن با نسبت حروف — نه با فهرست واژه.
 *
 * چرا لازم شد: `language` را به لایه‌ی چک برند وصل کردیم ولی کپی‌رایتر
 * هنوز فارسی می‌نویسد. نتیجه در اولین اجرای انگلیسی: چک‌های انگلیسی روی
 * متن فارسی اجرا شدند، هیچ واژه‌ی ممنوعی پیدا نکردند، و ۱۶ از ۱۶ سبز شد
 * در حالی که **هیچ گاردی روی آن پست نبود**. شکست بی‌صدا، با ظاهر موفقیت.
 *
 * این چک همان حالت را می‌گیرد، و مهم‌تر: هر ناهماهنگی زبانی در آینده را
 * هم می‌گیرد. اعتماد به «دو لایه هماهنگ می‌مانند» کافی نیست.
 *
 * فقط حروف شمرده می‌شوند؛ رقم، نشانه و فاصله بی‌اثرند.
 */
function persianLetterRatio(text: string): number {
  const persian = (text.match(/[\u0600-\u06FF]/gu) ?? []).length;
  const latin = (text.match(/[A-Za-z]/gu) ?? []).length;
  const total = persian + latin;
  return total === 0 ? -1 : persian / total;
}

export function checkLanguageMatch(text: string, expected: "fa" | "en"): SocialCheck {
  const ratio = persianLetterRatio(text);

  // متن بدون حرف — چیزی برای قضاوت نیست
  if (ratio < 0) {
    return { name: "تطابق زبان", severity: "blocking", pass: true, note: "متن حرفی ندارد" };
  }

  const pct = Math.round(ratio * 100);

  // آستانه‌ها نامتقارن‌اند و باید باشند: متن فارسی طبیعتاً واژه‌های لاتین
  // دارد (Global Talent، Innovator Founder)، ولی متن انگلیسیِ سالم تقریباً
  // هیچ حرف فارسی ندارد.
  const pass = expected === "fa" ? ratio >= 0.5 : ratio <= 0.15;

  return {
    name: "تطابق زبان",
    severity: "blocking",
    pass,
    note: pass
      ? `متن ${expected === "fa" ? "فارسی" : "انگلیسی"} است (${pct}٪ حروف فارسی)`
      : `زبان درخواستی «${expected}» بود ولی متن ${pct}٪ حروف فارسی دارد — چک‌های برند روی زبان اشتباه اجرا می‌شوند و عملاً هیچ گاردی وجود ندارد`,
  };
}


const URL_RE = /(https?:\/\/|www\.)/i;
const HASHTAG_RE = /^#[^\s#]+$/;

/** خط‌های ناخالی، بدون فاصله‌های اضافی */
function lines(s: string): string[] {
  return s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/** پاراگراف‌ها = بلوک‌های جداشده با خط خالی */
function paragraphs(s: string): string[] {
  return s
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * «قلاب» = اولین جمله‌ی متن.
 *
 * نکته‌ی مهم که دو بار در عمل به آن خوردیم: واحد اندازه‌گیری را باید درست
 * انتخاب کرد. اولین نسخه «خط اول» را می‌سنجید، ولی کپی‌رایتر کپشن را در یک
 * بلوک بدون شکست خط می‌نوشت، پس «خط اول» یعنی کل ۴۷۲ کاراکتر — در حالی که
 * جمله‌ی اول (۴۴ کاراکتر) قلاب کاملاً سالمی بود.
 *
 * پس اول تا اولین شکست خط می‌بریم، بعد تا اولین پایانه‌ی جمله. هرکدام
 * زودتر بیاید. چک قطعیِ غلط بدتر از نداشتن چک است: بازنویسی بی‌دلیل
 * راه می‌اندازد و به مدل می‌گوید چیزی را درست کند که خراب نیست.
 */
function firstSentence(s: string): string {
  const firstLine = lines(s)[0] ?? "";
  const m = firstLine.match(/^[\s\S]*?[؟?!.]/);
  return (m ? m[0] : firstLine).trim();
}

/**
 * آیا اسلاید از سقفِ چیدمانِ خودش رد شده؟ چیدمان‌آگاه: هر واریانت فقط
 * فیلدهای خودش را می‌سنجد.
 */
function slideOverLimit(s: Slide): boolean {
  if (charCount(s.heading) > LIMITS_BY_LAYOUT[s.layout].heading) return true;
  switch (s.layout) {
    case "standard":
      return charCount(s.text) > LIMITS_BY_LAYOUT.standard.text;
    case "statement":
      return false;
    case "list":
      return s.items.some((item) => charCount(item) > LIMITS_BY_LAYOUT.list.item);
    default: {
      const neverSlide: never = s;
      throw new Error(`چیدمانِ ناشناخته: ${JSON.stringify(neverSlide)}`);
    }
  }
}

/** توضیحِ چیدمان‌آگاهِ ایرادِ طول، برای پیامِ چک */
function slideLimitNote(s: Slide): string {
  const headingNote = `تیتر ${charCount(s.heading)} (سقف ${LIMITS_BY_LAYOUT[s.layout].heading})`;
  switch (s.layout) {
    case "standard":
      return `${headingNote} و متن ${charCount(s.text)} (سقف ${LIMITS_BY_LAYOUT.standard.text}) کاراکتر`;
    case "statement":
      return `${headingNote} کاراکتر`;
    case "list": {
      const longest = Math.max(...s.items.map(charCount));
      return `${headingNote} و بلندترین بند ${longest} (سقف ${LIMITS_BY_LAYOUT.list.item}) کاراکتر`;
    }
    default: {
      const neverSlide: never = s;
      throw new Error(`چیدمانِ ناشناخته: ${JSON.stringify(neverSlide)}`);
    }
  }
}

/* ── اینستاگرام ─────────────────────────────────────────── */

export function runInstagramChecks(input: {
  caption: string;
  slides: Slide[];
  hashtags: string[];
}): SocialCheck[] {
  const { caption, slides, hashtags } = input;
  const checks: SocialCheck[] = [];

  // قلاب: اینستاگرام حدود ۱۲۵ کاراکتر اول را قبل از «... بیشتر» نشان می‌دهد،
  // پس جمله‌ی اول باید کامل داخل همان جا بنشیند و مستقل معنی بدهد.
  const hook = firstSentence(caption);
  const hookLen = charCount(hook);
  checks.push({
    name: "قلاب در ۱۲۵ کاراکتر اول",
    pass: hookLen > 0 && hookLen <= 125,
    note:
      hookLen === 0
        ? "کپشن خالی است"
        : `«${hook.slice(0, 40)}…» — ${hookLen} کاراکتر (سقف ۱۲۵)`,
  });

  checks.push({
    name: "تعداد اسلایدها",
    pass: slides.length >= 5 && slides.length <= 8,
    note: `${slides.length} اسلاید (بازه‌ی مطلوب ۵–۸)`,
  });

  // متن اسلاید باید روی تصویر خوانا باشد.
  //
  // ⚠️ این چک تا پیش از این **مرده** بود: SlideSchema سقف‌ها را با
  // clampText می‌بُرید، پس heading همیشه ≤۴۰ می‌رسید و شرط هرگز درست
  // نمی‌شد. حالا اسکیما نمی‌بُرد و این واقعاً اندازه می‌گیرد.
  const longSlide = slides.findIndex(slideOverLimit);
  checks.push({
    name: "طول متن اسلایدها",
    pass: longSlide === -1,
    note:
      longSlide === -1
        ? "همه‌ی اسلایدها در حد خوانایی روی تصویرند"
        : `اسلاید ${longSlide + 1} بلند است — ${slideLimitNote(slides[longSlide])}`,
  });

  // تنوعِ چیدمانِ اسلایدهای میانی — advisory: یکنواختی زشت است، نه غلط.
  // کاور و اسلاید آخر عمداً بیرون‌اند: نقشِ ساختاریِ ثابتی دارند و
  // چیدمانشان معیارِ تنوع نیست.
  const middleSlides = slides.slice(1, -1);
  const distinctLayouts = new Set(middleSlides.map((s) => s.layout));
  checks.push({
    name: "تنوع چیدمانِ اسلایدهای میانی",
    pass: middleSlides.length === 0 || distinctLayouts.size > 1,
    severity: "advisory",
    note:
      middleSlides.length === 0
        ? "اسلاید میانی‌ای وجود ندارد"
        : distinctLayouts.size > 1
          ? `${distinctLayouts.size} چیدمانِ متفاوت در اسلایدهای میانی`
          : `همه‌ی ${middleSlides.length} اسلایدِ میانی چیدمانِ «${[...distinctLayouts][0]}» دارند`,
  });

  // ⚠️ اینجا عمداً چکی برای «آیا اسلاید آخر دعوت به اقدام دارد؟» نداریم.
  // نسخه‌ی اول این فایل چنین چکی داشت که دنبال کلیدواژه‌هایی مثل «مشاوره»
  // یا «بایو» می‌گشت — و روی اسلایدی که دعوتش کاملاً روشن بود («اگر
  // می‌خواهید… ما کنار شما هستیم») رد شد، چون هیچ‌کدام از آن کلمه‌ها را
  // نداشت. درسش همان چیزی است که بالای این فایل نوشته‌ایم، فقط از سمت
  // مخالف: «وجود دعوت به اقدام» یک قضاوت است، نه یک قاعده‌ی مکانیکی.
  // تطبیق کلیدواژه‌ای روی فارسی برایش ابزار غلطی است. این معیار به روبریک
  // ویراستار اجتماعی سپرده شده (platformFit).

  checks.push({
    name: "تعداد هشتگ‌های کاروسل",
    pass: hashtags.length >= 3 && hashtags.length <= 5,
    note: `${hashtags.length} هشتگ (بازه‌ی مطلوب ۳–۵)`,
  });

  const emojiCount = countEmoji(caption);
  checks.push({
    name: "تعداد اموجی",
    pass: emojiCount <= EMOJI_LIMIT,
    note: `${emojiCount} اموجی در کپشن (حداکثر ${EMOJI_LIMIT} — قاعده‌ی برندگاید)`,
  });

  const badTags = hashtags.filter((h) => !HASHTAG_RE.test(h));
  const hasDupes = new Set(hashtags).size !== hashtags.length;
  checks.push({
    name: "قالب هشتگ‌ها",
    pass: badTags.length === 0 && !hasDupes,
    note:
      badTags.length > 0
        ? `هشتگ نامعتبر: ${badTags.join("، ")}`
        : hasDupes
          ? "هشتگ تکراری وجود دارد"
          : "همه‌ی هشتگ‌ها معتبر و یکتا هستند",
  });

  const hasUrl = URL_RE.test(caption);
  checks.push({
    name: "بدون لینک در کپشن",
    pass: !hasUrl,
    note: hasUrl
      ? "اینستاگرام لینک کپشن را کلیک‌پذیر نمی‌کند — به‌جایش «لینک در بایو»"
      : "کپشن لینک ندارد",
  });

  const capLen = charCount(caption);
  checks.push({
    name: "طول کپشن",
    pass: capLen >= 150 && capLen <= 2200,
    note: `${capLen} کاراکتر (بازه‌ی مطلوب ۱۵۰–۲۲۰۰)`,
  });

  return checks;
}

/* ── دایرکت (فاز ۵) ─────────────────────────────────────── */

/**
 * نامِ پایدار — Stage ۳ هنگامِ ویرایش/آزادسازیِ دستیِ کلیدواژه با همین
 * رشته این چک را پیدا و جایگزین/حذف می‌کند. اگر این نام را عوض کردی،
 * آن مسیر هم باید عوض شود.
 */
export const DM_CTA_CHECK_NAME = "خط دایرکت";

/**
 * فقط وقتی `dmKeyword` غیرخالی است به فهرستِ چک‌ها اضافه می‌شود.
 *
 * واحدِ سنجش خطِ کاملِ سیستم است (`countDmCtaLine` در `dm-keyword.ts`)، نه
 * توکنِ تنهای کلیدواژه — کپشنی که «TALENT» را جای دیگری هم به‌عنوانِ واژه‌ی
 * عادی دارد نباید رد شود.
 */
export function checkDmCtaLine(body: string, keyword: string, language: "fa" | "en"): SocialCheck {
  const count = countDmCtaLine(body, keyword, language);
  return {
    name: DM_CTA_CHECK_NAME,
    pass: count === 1,
    note:
      count === 1
        ? `خطِ سیستمِ کلیدواژه‌ی «${keyword}» دقیقاً یک‌بار در متن هست`
        : count === 0
          ? "خطِ دایرکت در متن نیست"
          : `خطِ دایرکت ${count} بار تکرار شده`,
  };
}

/* ── ریلز ───────────────────────────────────────────────── */

/** شمارش کلمه — مبنای تخمین زمان گفتار */
function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/** هر ۱۴۰ کلمه‌ی فارسی حدوداً یک دقیقه بلندخوانی */
const WORDS_PER_MINUTE = 140;

export function runReelsChecks(input: {
  hook: string;
  body: string;
  cta: string;
  ctaId: string;
  onScreenText: string;
  hashtags: string[];
  /** شناسه‌های مجاز، از BRAND_CTAS (company.ts) */
  allowedCtaIds: string[];
  /** زیرمجموعه‌ی بالا که نوعشان direct است — برای قاعده‌ی «حداکثر یک دعوت مستقیم» */
  directCtaIds: string[];
}): SocialCheck[] {
  const { hook, body, cta, onScreenText, hashtags } = input;
  const checks: SocialCheck[] = [];

  const script = `${hook}\n\n${body}\n\n${cta}`;
  const words = wordCount(script);
  const seconds = Math.round((words / WORDS_PER_MINUTE) * 60);

  // سقف مطلق: زیر ۳ دقیقه
  checks.push({
    name: "سقف طول اسکریپت",
    pass: words <= 400,
    note: `${words} کلمه ≈ ${seconds} ثانیه (سقف ۴۰۰ کلمه / ۳ دقیقه)`,
  });

  // بازه‌ی کاربردی. عمداً تا ۳۰۰ باز است، نه ۲۲۰:
  // دستورالعمل اجازه می‌دهد محتوای سنگین بلندتر شود، و چکِ سخت‌گیرترِ
  // لازم، بازنویسیِ بی‌دلیل راه می‌اندازد.
  checks.push({
    name: "طول مناسب ریلز",
    pass: words >= 100 && words <= 300,
    note: `${words} کلمه ≈ ${seconds} ثانیه (بازه‌ی مطلوب ۱۰۰–۳۰۰ کلمه)`,
  });

  // قلاب ۳ تا ۵ ثانیه ≈ حداکثر ۲۰ کلمه
  const hookWords = wordCount(hook);
  checks.push({
    name: "قلاب کوتاه",
    pass: hookWords > 0 && hookWords <= 20,
    note: `${hookWords} کلمه ≈ ${Math.round((hookWords / WORDS_PER_MINUTE) * 60)} ثانیه (سقف ۲۰ کلمه)`,
  });

  // شروع با سلام و مقدمه‌چینی، صریحاً ممنوع است
  const OPENERS = ["سلام", "درود", "وقت بخیر", "خب،", "خب ", "در این ویدیو", "امروز می‌خواهیم"];
  const opener = OPENERS.find((o) => hook.trimStart().startsWith(o));
  checks.push({
    name: "بدون مقدمه‌چینی در قلاب",
    pass: !opener,
    note: opener ? `قلاب با «${opener.trim()}» شروع می‌شود` : "قلاب مستقیم سر اصل مطلب می‌رود",
  });

  // راهنمای صحنه نباید داخل اسکریپت باشد.
  // فقط کروشه را می‌گیریم: در گفتار فارسی عملاً استفاده نمی‌شود، پس
  // خطای مثبتِ کاذب نمی‌دهد — برخلاف پرانتز که در جمله‌ی عادی می‌آید.
  const stageDir = script.match(/\[[^\]]*\]/);
  checks.push({
    name: "بدون راهنمای صحنه",
    pass: !stageDir,
    note: stageDir
      ? `راهنمای صحنه در متن: «${stageDir[0].slice(0, 40)}»`
      : "اسکریپت فقط شامل چیزی است که گفته می‌شود",
  });

  // CTA باید از فهرست مجاز باشد — جلوی ساختن CTA خودسر را می‌گیرد
  const ctaOk = input.allowedCtaIds.includes(input.ctaId);
  checks.push({
    name: "دعوت به اقدام از فهرست مجاز",
    pass: ctaOk,
    note: ctaOk
      ? `CTA انتخاب‌شده: ${input.ctaId}`
      : `«${input.ctaId}» در فهرست مجاز نیست (${input.allowedCtaIds.join("، ")})`,
  });

  // قاعده‌ی برند: حداکثر یک دعوت مستقیم در هر محتوا.
  //
  // ⚠️ صادقانه: اسکیمای ریلز فقط یک ctaId دارد، پس این شمارش امروز هیچ‌وقت
  // از ۱ بالاتر نمی‌رود و چک عملاً همیشه پاس می‌شود. عمداً به‌شکل شمارش روی
  // آرایه نوشته شده تا اگر بعداً محتوایی چند CTA اعلام کرد، قاعده خودبه‌خود
  // اعمال شود. برای ریلز، چیزی که واقعاً کار می‌کند چک بالا (فهرست مجاز) و
  // خودِ دستورالعمل پرامپت است — نه این یکی.
  const declaredIds = [input.ctaId];
  const directUsed = declaredIds.filter((id) => input.directCtaIds.includes(id));
  checks.push({
    name: "حداکثر یک دعوت مستقیم",
    pass: directUsed.length <= 1,
    note:
      directUsed.length <= 1
        ? directUsed.length === 1
          ? `یک دعوت مستقیم: ${directUsed[0]}`
          : "دعوت مستقیمی استفاده نشده (فقط واسط)"
        : `${directUsed.length} دعوت مستقیم هم‌زمان: ${directUsed.join("، ")}`,
  });

  const onScreenLen = charCount(onScreenText);
  checks.push({
    name: "طول متن روی تصویر",
    pass: onScreenLen > 0 && onScreenLen <= 45,
    note: `${onScreenLen} کاراکتر (سقف ۴۵ — روی ویدیو باید یک‌نگاهی خوانده شود)`,
  });

  // املای محاوره‌ای — برندگاید فارسی کتابی با خطاب «شما» می‌خواهد.
  // این فهرست عمداً کوتاه و بی‌ابهام است: همه واژه‌های کاملی هستند که
  // شکل کتابی مشخصی دارند، پس تطبیقِ کلمه‌کامل خطای کاذب نمی‌دهد.
  // (برخلاف پسوندهایی مثل «تون» که داخل «ستون» هم پیدا می‌شوند.)
  const COLLOQUIAL = [
    "اگه", "دیگه", "میشه", "نمیشه", "بشه", "کنه", "بکنه", "میکنه",
    "اینجوری", "این‌جوری", "چیه", "یه", "خیلیا", "اینا", "واسه", "بریم",
  ];
  const found = COLLOQUIAL.filter((w) =>
    new RegExp(`(^|[\\s،.!؟:؛«»()"])${w}([\\s،.!؟:؛«»()"]|$)`).test(script)
  );
  checks.push({
    name: "فارسی کتابی (نه محاوره‌ای)",
    pass: found.length === 0,
    note:
      found.length > 0
        ? `شکل محاوره‌ای: ${found.join("، ")} — طبق برندگاید باید کتابی نوشته شود`
        : "متن با املای کتابی نوشته شده",
  });

  const badTags = hashtags.filter((h) => !HASHTAG_RE.test(h));
  checks.push({
    name: "تعداد هشتگ‌های ریلز",
    pass: hashtags.length >= 3 && hashtags.length <= 5 && badTags.length === 0,
    note:
      badTags.length > 0
        ? `هشتگ نامعتبر: ${badTags.join("، ")}`
        : `${hashtags.length} هشتگ (بازه‌ی مطلوب ۳–۵)`,
  });

  return checks;
}

/* ── لینکدین ────────────────────────────────────────────── */

export function runLinkedinChecks(input: {
  body: string;
  hashtags: string[];
}): SocialCheck[] {
  const { body, hashtags } = input;
  const checks: SocialCheck[] = [];

  // لینکدین حدود سه خط رندرشده (~۲۱۰ کاراکتر) را قبل از «... بیشتر ببینید»
  // نشان می‌دهد. چون نویسنده پاراگراف‌ها را با خط خالی جدا می‌کند، عملاً
  // پاراگراف اول همان چیزی است که دیده می‌شود — پس همان را می‌سنجیم.
  // (نسخه‌ی اول این چک «سه خط ناخالی اول» را می‌گرفت که در عمل سه پاراگراف
  //  کامل می‌شد و همیشه رد می‌شد.)
  const hookPara = paragraphs(body)[0] ?? "";
  const hookLen = charCount(hookPara);
  checks.push({
    name: "قلاب سه‌خطی",
    pass: hookLen > 0 && hookLen <= 210,
    note:
      hookLen === 0
        ? "متن خالی است"
        : `${hookLen} کاراکتر پیش از «بیشتر ببینید» (سقف ۲۱۰)`,
  });

  const bodyLen = charCount(body);
  checks.push({
    name: "طول پست",
    pass: bodyLen >= 900 && bodyLen <= 1800,
    note: `${bodyLen} کاراکتر (بازه‌ی مطلوب ۹۰۰–۱۸۰۰)`,
  });

  const hasUrl = URL_RE.test(body);
  checks.push({
    name: "بدون لینک در متن",
    pass: !hasUrl,
    note: hasUrl
      ? "لینک باید در کامنت اول بیاید، نه در متن پست (لینک بیرونی reach را کم می‌کند)"
      : "متن پست لینک ندارد",
  });

  const paras = paragraphs(body);
  const longest = paras.reduce((m, p) => Math.max(m, charCount(p)), 0);
  checks.push({
    name: "پاراگراف‌های کوتاه",
    pass: longest <= 320,
    note: `بلندترین پاراگراف ${longest} کاراکتر (سقف ۳۲۰)`,
  });

  checks.push({
    name: "فاصله‌گذاری پاراگراف‌ها",
    pass: paras.length >= 4,
    note: `${paras.length} پاراگراف (حداقل ۴ — دیوارِ متن در فید خوانده نمی‌شود)`,
  });

  // لینکدین مارک‌داون رندر نمی‌کند؛ ستاره و شارپ خام دیده می‌شوند.
  // عمداً فقط * و # را می‌گیریم — خط تیره در فارسی کاربرد مشروع دارد و
  // گرفتنش خطای کاذب می‌ساخت. (درسِ «چک قطعیِ غلط بدتر از نداشتن چک».)
  const md = body.match(/^\s*(\*+|#+)\s/m) || body.match(/\*\*[^*]+\*\*/);
  checks.push({
    name: "بدون نشانه‌گذاری مارک‌داون",
    pass: !md,
    note: md
      ? `«${md[0].trim()}» — لینکدین مارک‌داون را رندر نمی‌کند و خام دیده می‌شود`
      : "متن بدون نشانه‌گذاری مارک‌داون است",
  });

  const badTags = hashtags.filter((h) => !HASHTAG_RE.test(h));
  checks.push({
    name: "تعداد هشتگ‌های لینکدین",
    pass: hashtags.length >= 3 && hashtags.length <= 5 && badTags.length === 0,
    note:
      badTags.length > 0
        ? `هشتگ نامعتبر: ${badTags.join("، ")}`
        : `${hashtags.length} هشتگ (بازه‌ی مطلوب ۳–۵)`,
  });

  // پایان با پرسش، برای دعوت به گفت‌وگو. خط هشتگ‌ها را کنار می‌گذاریم.
  const meaningful = paras.filter((p) => !p.split(/\s+/).every((w) => w.startsWith("#")));
  const lastPara = meaningful[meaningful.length - 1] ?? "";
  const endsWithQuestion = /[؟?]\s*$/.test(lastPara);
  checks.push({
    name: "پایان با دعوت به گفت‌وگو",
    pass: endsWithQuestion,
    note: endsWithQuestion
      ? "پست با یک پرسش تمام می‌شود"
      : "پست با پرسش تمام نمی‌شود — گفت‌وگو در کامنت‌ها راه نمی‌افتد",
  });

  return checks;
}

/* ── استوری ─────────────────────────────────────────────── */

export function runStoryChecks(input: {
  frames: Slide[];
  stickers: StorySticker[];
}): SocialCheck[] {
  const { frames, stickers } = input;
  const checks: SocialCheck[] = [];

  checks.push({
    name: "تعداد فریم‌های استوری",
    pass: frames.length === 2 || frames.length === 3,
    note: `${frames.length} فریم (مجاز: ۲ یا ۳)`,
  });

  // همان چکِ طول کاروسل، همان سقف‌ها — چیدمانِ چهارم و سقفِ دومی برای
  // استوری ساخته نشده.
  const longFrame = frames.findIndex(slideOverLimit);
  checks.push({
    name: "طول متن فریم‌ها",
    pass: longFrame === -1,
    note:
      longFrame === -1
        ? "همه‌ی فریم‌ها در حد خوانایی روی تمام‌صفحه‌اند"
        : `فریم ${longFrame + 1} بلند است — ${slideLimitNote(frames[longFrame])}`,
  });

  // تصویرِ AI فقط برای فریمِ اول ساخته می‌شود (تصمیمِ محصولیِ قفل‌شده)،
  // پس نبودنش روی فریمِ اول یک نقصِ کیفیِ واقعی است، نه انتخاب — برخلافِ
  // کاور کاروسل که در گریدِ بندانگشتی دیده می‌شود، فریمِ استوری تمام‌صفحه
  // است.
  const hasFirstFrameImage = Boolean(frames[0]?.imageSubject?.trim());
  checks.push({
    name: "تصویر فریم اول",
    pass: hasFirstFrameImage,
    note: hasFirstFrameImage
      ? "فریم اول صحنه‌ی تصویر دارد"
      : "فریم اول imageSubject ندارد — تصویرِ AI فقط برای همین فریم ساخته می‌شود",
  });

  const badRange = stickers.filter(
    (s) => !Number.isInteger(s.frame) || s.frame < 0 || s.frame >= frames.length
  );
  checks.push({
    name: "بازه‌ی فریمِ استیکر",
    pass: badRange.length === 0,
    note:
      badRange.length === 0
        ? "همه‌ی استیکرها به فریمی معتبر اشاره می‌کنند"
        : `استیکر با frame نامعتبر: ${badRange.map((s) => s.frame).join("، ")}`,
  });

  // حداکثر یک استیکرِ تعاملی روی هر فریم — قرارداد MVP.
  const frameCounts = new Map<number, number>();
  for (const s of stickers) frameCounts.set(s.frame, (frameCounts.get(s.frame) ?? 0) + 1);
  const dupFrames = [...frameCounts.entries()].filter(([, n]) => n > 1).map(([f]) => f);
  checks.push({
    name: "یکتاییِ استیکرِ هر فریم",
    pass: dupFrames.length === 0,
    note:
      dupFrames.length === 0
        ? "حداکثر یک استیکر روی هر فریم"
        : `بیش از یک استیکر روی فریمِ ${dupFrames.join("، ")}`,
  });

  const badPolls = stickers.filter((s) => s.type === "poll" && s.options.length !== 2);
  checks.push({
    name: "نظرسنجی دقیقاً دو گزینه",
    pass: badPolls.length === 0,
    note:
      badPolls.length === 0
        ? "همه‌ی نظرسنجی‌ها دقیقاً دو گزینه دارند"
        : `${badPolls.length} نظرسنجیِ با تعدادِ گزینه‌ی نامعتبر`,
  });

  const badLinks = stickers.filter((s) => s.type === "link" && !s.destination.trim());
  checks.push({
    name: "مقصدِ استیکرِ لینک",
    pass: badLinks.length === 0,
    note:
      badLinks.length === 0
        ? "همه‌ی استیکرهای لینک مقصد دارند"
        : `${badLinks.length} استیکرِ لینکِ بدونِ مقصد`,
  });

  // لینک باید متادیتای استیکر باشد، نه متنِ خامِ روی فریم — همان قاعده‌ی
  // «بدون لینک در کپشن» کاروسل، اینجا روی متنِ خودِ فریم.
  const urlInText = frames.some((f) => URL_RE.test(slideText(f)));
  checks.push({
    name: "بدون URL خام در متنِ فریم",
    pass: !urlInText,
    note: urlInText
      ? "متنِ یک فریم آدرسِ خام دارد — لینک باید متادیتای استیکرِ link باشد"
      : "متنِ فریم‌ها آدرسِ خام ندارد",
  });

  return checks;
}
