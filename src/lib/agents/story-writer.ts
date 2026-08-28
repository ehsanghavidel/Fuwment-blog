import "server-only";
import type { ZodType } from "zod";
import { runAgentJSON } from "@/lib/ai";
import { COMPANY_NAME, COMPANY_PROFILE, BRAND_VOICE } from "@/lib/company";
import { LIMITS_BY_LAYOUT } from "@/lib/slide-spec";
import { lessonsBlockFor } from "./lessons";
import {
  InstagramStorySchema,
  type InstagramStory,
  type SocialBrief,
  type SocialReview,
} from "./types";
import type { SocialCheck } from "./social-checks";

/**
 * ایجنت — کپی‌رایتر استوری
 *
 * وظیفه: بریفِ اجتماعی (خروجیِ زاویه‌یابِ استوری) را به یک ستِ ۲ تا ۳
 * فریمیِ استوری تبدیل کند — یک مینی‌روایتِ واحد، نه فشرده‌سازیِ کاروسل.
 *
 * ⚠️ این ایجنت هرگز متنِ کاروسلِ مبدأ را نمی‌بیند — فقط بریف. همین جداییِ
 * معماری (توضیحش در story-angle-finder.ts) تضمین می‌کند که خروجی نمی‌تواند
 * جمله‌ای از کاروسل را عیناً کپی کند: چیزی که ندیده، نمی‌تواند کپی کند.
 *
 * ⚠️ فریم‌ها از همان `Slide` استفاده می‌کنند — بدونِ چیدمانِ چهارم. سقف‌های
 * طول همان سقف‌های کاروسل‌اند (`LIMITS_BY_LAYOUT`)؛ چیدمانِ چهارمی و
 * سقفِ دومی برای استوری ساخته نمی‌شود.
 *
 * ⚠️ نقشِ هر فریم (hook/body/cta) از **جایگاهش** مشتق می‌شود، نه از خروجیِ
 * مدل — دقیقاً همان قاعده‌ی کاروسل. اینجا فقط پرامپت راهنمایی می‌کند که
 * محتوای هر جایگاه چه باید بگوید؛ خودِ نقش هیچ‌جا از مدل خواسته نمی‌شود.
 */

const FA_BLOCK = `
زبان خروجی: **فارسی**. اعداد داخل متن را فارسی بنویس.`;

const EN_BLOCK = `
زبان خروجی: **انگلیسی**. کل خروجی — عنوان، خلاصه‌ی داخلی، متنِ فریم‌ها، استیکرها و دعوت به اقدام — باید انگلیسی باشد. این ترجمه نیست؛ از نو به انگلیسی بنویس، با جمله‌های کوتاه‌تر از معادلِ فارسی‌شان. اعداد را لاتین بنویس.`;

function systemPrompt(lessons: string, language: "fa" | "en"): string {
  return `تو «کپی‌رایترِ استوریِ اینستاگرام» ${COMPANY_NAME} هستی. از یک بریفِ اجتماعی، یک ستِ کوتاهِ استوری می‌سازی که یک مینی‌روایتِ واحد تعریف می‌کند — چیزی که در ۲ تا ۳ ثانیه‌ی هر فریم، پشتِ سرِ هم خوانده می‌شود.

${COMPANY_PROFILE}

${BRAND_VOICE}

قواعدِ روایت (رعایتشان اجباری است):
- ست دقیقاً یک مینی‌روایت است، نه یک کاروسلِ کوچک‌شده. یا ۲ فریم (قلاب → دعوت) یا ۳ فریم (قلاب → یک حرفِ تازه → دعوت) — خودت تصمیم بگیر کدام؛ فقط وقتی سومی واقعاً یک اطلاعِ تازه اضافه می‌کند از ۳ فریم استفاده کن.
- **فریمِ اول = قلاب.** باید بدونِ اینکه کاروسلِ مبدأ دیده شده باشد، به‌تنهایی معنی بدهد و یک تنش/سؤال/ایده‌ی مشخص را مطرح کند.
- اگر ۳ فریم ساختی، **فریمِ میانی دقیقاً یک حرفِ تازه** می‌زند — چیزی که فریمِ اول نگفته، نه بازگوییِ همان با کلماتِ دیگر.
- **فریمِ آخر = دعوت به اقدام / جمع‌بندی.** باید مینی‌روایت را تمام کند، نه اینکه فقط قلاب را دوباره بگوید.
- هیچ فریمی جمله‌ی فریمِ دیگر را عیناً یا با کلماتِ کمی متفاوت تکرار نکند.

قواعدِ چیدمان (همان سه چیدمانِ کاروسل، بدونِ تغییر):
- هر فریم یک «layout» دارد: standard (کیکر + تیتر + یکی دو جمله)، statement (کیکر + تیترِ بزرگ، بدونِ بدنه، فقط برایِ یک جمله‌ی واحد و قاطع)، یا list (کیکر + تیتر + ۲ تا ۳ بندِ کوتاه، فقط برایِ محتوایِ واقعاً شمردنی).
- ⚠️ **چیدمان را به‌زور متنوع نکن.** یک ستِ استوریِ کاملاً standard (همه‌ی فریم‌ها) کاملاً معتبر است. statement و list فقط وقتی که محتوای همان فریم واقعاً همان شکل را می‌طلبد.
- سقف‌های سخت — شمرده می‌شوند: kicker حداکثر ${LIMITS_BY_LAYOUT.standard.kicker} کاراکتر، heading حداکثر ${LIMITS_BY_LAYOUT.standard.heading} کاراکتر، متنِ standard حداکثر ${LIMITS_BY_LAYOUT.standard.text} کاراکتر، بندهای list حداکثر ${LIMITS_BY_LAYOUT.list.maxItems} تا و هر بند حداکثر ${LIMITS_BY_LAYOUT.list.item} کاراکتر. این متن‌ها روی تمام‌صفحه‌ی موبایل می‌نشینند — کوتاه بنویس.

قاعده‌ی تصویر (مهم — تصمیمِ محصولیِ قفل‌شده):
- تصویرِ AI فقط برایِ **فریمِ اول** ساخته می‌شود.
- **فریمِ اول باید** «imageSubject» داشته باشد: یک رشته‌ی ناتهیِ یک‌جمله‌ای — یک صحنه‌ی فیزیکیِ قابلِ عکاسی که از دلِ همین بریف بیرون می‌آید (نه یک مفهومِ انتزاعی، نه کلیشه‌ی «لپ‌تاپ روی میز»).
- فریم‌های بعدی کلیدِ «imageSubject» را **اصلاً نداشته باشند** — کلید را کامل حذف کن. نه رشته، نه رشته‌ی خالی، و **هرگز مقدارِ null**.

قاعده‌ی استیکرِ تعاملی (اختیاری):
- استوری می‌تواند حداکثر یک «استیکر» روی هر فریم داشته باشد — از نوع poll (نظرسنجیِ دقیقاً دو گزینه)، question (سؤالِ باز)، یا link (لینک با برچسب و مقصد).
- ⚠️ استیکر اختیاری است. **هیچ استیکری را برایِ تنوع یا تعاملِ زورکی اضافه نکن.** ستی با صفر استیکر کاملاً معتبر است.
- اگر استیکر گذاشتی، «frame» باید اندیسِ **صفرمبنایِ** همان فریم باشد (فریمِ اول = 0).
- متنِ خودِ فریم هرگز نباید آدرسِ خام (URL) داشته باشد — لینک فقط داخلِ متادیتایِ استیکرِ link می‌آید.
${language === "fa" ? FA_BLOCK : EN_BLOCK}${lessons}`;
}

function briefBlock(brief: SocialBrief): string {
  return `بریف اجتماعی:
پیام مرکزی: ${brief.coreMessage}
مخاطب: ${brief.audience}
زاویه‌ی قلاب: ${brief.hookAngle}
نکته‌های کلیدی:
${brief.keyPoints.map((p) => `- ${p}`).join("\n")}
شاهد/مثال: ${brief.proofPoint}
دعوت به اقدام: ${brief.cta}`;
}

const SHAPE_HINT = `{
  "title": "عنوان داخلی برای فهرست استودیو",
  "setSummary": "خلاصه‌ی داخلیِ ست برای اپراتور — کپشن نیست، هرگز جایی paste نمی‌شود",
  "frames": [
    { "layout": "standard", "kicker": "قلاب", "heading": "تیترِ کوتاهِ فریمِ اول", "text": "یکی دو جمله", "imageSubject": "صحنه‌ی فیزیکی — فقط فریمِ اول" },
    { "layout": "standard", "kicker": "دعوت", "heading": "تیترِ فریمِ آخر", "text": "یکی دو جمله" }
  ],
  "stickers": [
    { "type": "poll", "frame": 0, "question": "متنِ نظرسنجی", "options": ["گزینه‌ی اول", "گزینه‌ی دوم"] }
  ],
  "cta": "دعوت به اقدامِ فریمِ آخر"
}
⚠️ نمونه‌ی «frames» بالا فقط ساختارِ ۲ فریمی را نشان می‌دهد — می‌تواند ۳ فریم هم باشد (با یک فریمِ میانیِ standard/statement/list بینِ همین دو). «stickers» کاملاً اختیاری است؛ اگر لازم نبود، این فیلد را اصلاً برنگردان.

دو شکلِ دیگرِ فریم:
statement: { "layout": "statement", "kicker": "برچسب", "heading": "یک جمله‌ی واحد و قاطع" }
list: { "layout": "list", "kicker": "برچسب", "heading": "تیترِ فهرست", "items": ["بندِ اول", "بندِ دوم"] }`;

const SHAPE_HINT_EN = `{
  "title": "short internal title",
  "setSummary": "internal operator summary — not a caption, never pasted anywhere",
  "frames": [
    { "layout": "standard", "kicker": "hook", "heading": "short first-frame heading", "text": "one or two short sentences", "imageSubject": "a physical, photographable scene — first frame only" },
    { "layout": "standard", "kicker": "call to action", "heading": "last-frame heading", "text": "one or two short sentences" }
  ],
  "stickers": [
    { "type": "poll", "frame": 0, "question": "poll question", "options": ["option one", "option two"] }
  ],
  "cta": "the call to action on the last frame"
}
⚠️ The "frames" example above shows the 2-frame shape only — a 3-frame set is also valid (one middle standard/statement/list frame between these two). "stickers" is fully optional — omit it entirely when not needed.

The two other frame shapes:
statement: { "layout": "statement", "kicker": "label", "heading": "one single decisive sentence" }
list: { "layout": "list", "kicker": "label", "heading": "list heading", "items": ["first point", "second point"] }`;

export async function runStoryWriter(input: { brief: SocialBrief }): Promise<InstagramStory> {
  const lessons = await lessonsBlockFor("story-writer");

  return runAgentJSON<InstagramStory>({
    agent: "story-writer",
    system: systemPrompt(lessons, input.brief.language),
    prompt: `${briefBlock(input.brief)}

${input.brief.language === "en" ? "Write a complete Instagram story set in English." : "یک ستِ کاملِ استوری اینستاگرام بنویس."}`,
    temperature: 0.8,
    schema: InstagramStorySchema as ZodType<InstagramStory>,
    shapeHint: input.brief.language === "en" ? SHAPE_HINT_EN : SHAPE_HINT,
  });
}

export async function runStoryRevision(input: {
  brief: SocialBrief;
  draft: InstagramStory;
  review: SocialReview;
  failedChecks: SocialCheck[];
}): Promise<InstagramStory> {
  const lessons = await lessonsBlockFor("story-writer");

  const prompt = `${briefBlock(input.brief)}

— پیش‌نویس فعلی —
${JSON.stringify(input.draft, null, 2)}

— ایرادهای ویراستار (امتیاز ${input.review.score}/100) —
${input.review.issues.map((i) => `- ${i}`).join("\n") || "- (بدون ایراد)"}

— چک‌های قطعیِ ردشده —
${input.failedChecks.map((c) => `- ${c.name}: ${c.note}`).join("\n") || "- (همه پاس شدند)"}

ستِ استوری را اصلاح کن. فقط چیزهایی را عوض کن که ایراد دارند؛ بقیه را دست نزن.`;

  return runAgentJSON<InstagramStory>({
    agent: "story-writer",
    system: systemPrompt(lessons, input.brief.language),
    prompt,
    temperature: 0.6,
    schema: InstagramStorySchema as ZodType<InstagramStory>,
    shapeHint: input.brief.language === "en" ? SHAPE_HINT_EN : SHAPE_HINT,
  });
}
