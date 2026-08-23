import "server-only";
import { runAgentJSON } from "@/lib/ai";
import { COMPANY_NAME, COMPANY_PROFILE, BRAND_VOICE } from "@/lib/company";
import { lessonsBlockFor } from "./lessons";
import {
  SLIDE_LIMITS,
  InstagramCarouselSchema,
  type InstagramCarousel,
  type SocialBrief,
  type SocialReview,
} from "./types";
import type { SocialCheck } from "./social-checks";

/**
 * ایجنت ۲ (پایپ‌لاین بازآفرینی) — کپی‌رایتر اینستاگرام
 *
 * وظیفه: بریف اجتماعی را به یک کاروسل ۵ تا ۸ اسلایدی + کپشن تبدیل کند.
 *
 * نکته‌ی آموزشی: برخلاف نویسنده‌ی بلاگ که متن آزاد مارک‌داون می‌دهد، این
 * ایجنت خروجی **ساختاریافته** می‌دهد (آرایه‌ای از اسلایدها). چون هر اسلاید
 * بعداً جداگانه در یک قاب ۴:۵ رندر می‌شود، شکل داده باید تضمین‌شده باشد —
 * نه یک رشته که بعداً بخواهیم پارسش کنیم.
 */


/**
 * قواعد مخصوص زبان خروجی.
 *
 * ⚠️ انگلیسی «ترجمه‌ی» فارسی نیست. قاعده‌ی صریح برندگاید: ساختار ترجمه
 * می‌شود، جمله‌ها از نو نوشته می‌شوند. اگر فقط بگوییم «به انگلیسی بنویس»،
 * خروجی انگلیسیِ ترجمه‌شده از فارسی می‌شود که برای مخاطب بریتانیایی
 * مصنوعی می‌خواند — و آن مخاطب نهاد و شریک بالقوه است، نه متقاضی.
 */
const FA_BLOCK = `
زبان خروجی: **فارسی**.
- اعداد داخل متن را فارسی بنویس.
- هشتگ‌ها ترکیبی از فارسی و انگلیسی.`;

const EN_BLOCK = `
زبان خروجی: **انگلیسی**. کل خروجی — عنوان، کپشن، تیتر و متن اسلایدها، هشتگ‌ها و CTA — باید انگلیسی باشد. هیچ جمله‌ی فارسی در خروجی نباشد.

این ترجمه نیست. از نو به انگلیسی بنویس:
- جمله‌های انگلیسی کوتاه‌ترند. جمله‌ی فارسیِ ترجمه‌شده در انگلیسی بلند و پیچیده می‌شود — نکن.
- مخاطب انگلیسی‌زبان اینجا با مخاطب فارسی فرق دارد: نهادها، دانشگاه‌ها، همکاران بین‌المللی و متخصصان غیرایرانی. لحن حرفه‌ای و مستقیم، بدون صمیمیت محاوره‌ای.
- اصطلاحات رسمی را به شکل انگلیسیِ خودشان بنویس: Global Talent visa، Innovator Founder visa، endorsement، Indefinite Leave to Remain (ILR).
- اعداد را لاتین بنویس.
- هشتگ‌ها همه انگلیسی.
- هرگز «lawyer»، «solicitor» یا «legal advice» ننویس — این‌ها در بریتانیا عناوین حفاظت‌شده‌اند. اگر لازم شد، «immigration advice» درست است.`;

/** قواعد مشترک بین پیش‌نویس اول و بازنویسی */
function systemPrompt(lessons: string, language: "fa" | "en"): string {
  return `تو «کپی‌رایتر اینستاگرام» ${COMPANY_NAME} هستی. کاروسل‌های آموزشی می‌نویسی که مخاطبِ توصیف‌شده در پروفایل شرکت اسکرول را برایشان متوقف کند.

${COMPANY_PROFILE}

${BRAND_VOICE}

قواعد اینستاگرام (رعایتشان اجباری است):
- **جمله‌ی اول کپشن** قلاب است و باید کوتاه‌تر از ۱۲۵ کاراکتر باشد؛ اینستاگرام حدوداً همان‌جا «... بیشتر» می‌زند. این جمله باید به‌تنهایی معنی بدهد و کنجکاوی بسازد، و با نقطه یا علامت سؤال تمام شود. با سلام، با نام برند، یا با «در این پست...» شروع نکن.
- کاروسل ۵ تا ۸ اسلاید دارد و **نقش هر اسلاید از جایگاهش تعیین می‌شود، نه انتخاب تو**:
  · اسلاید **اول** = قلاب. تصویریِ همان ایده، نه کپیِ لفظ‌به‌لفظِ کپشن.
  · اسلایدهای **میانی** = هر کدام دقیقاً یک ایده.
  · اسلاید **آخر** = دعوت به اقدام. این نقش قطعی است؛ رندرکننده این اسلاید را با رنگ «اقدام» می‌کشد چه محتوایش دعوت باشد چه نباشد.
- **kicker باید نقشِ همان اسلاید را منعکس کند.** kicker یک برچسب است، نه شماره.
  · روی اسلاید آخر kicker باید دعوت را اعلام کند: «قدم بعدی»، «از اینجا شروع کنید»، «حالا چه؟».
  · ⚠️ روی اسلاید آخر **هرگز** برچسب دنباله‌ای نگذار — «قدم اول»، «قدم دوم»، «۱ از ۵». در یک اجرای واقعی اسلاید ۶ از ۶ کیکر «قدم اول» گرفت در حالی که با رنگ اقدام رندر شده بود؛ خواننده هم‌زمان «شروع» و «پایان» را می‌دید.
  · اگر برچسب دنباله‌ای به کار می‌بری، ترتیبش باید با ترتیب واقعی اسلایدها بخواند و روی اسلاید آخر تمام شده باشد.
- heading هر اسلاید باید در اندازه‌ی بندانگشتی خوانا باشد: کوتاه، بدون جمله‌ی وابسته. text حداکثر دو جمله‌ی کوتاه.
- **سقف‌های سخت هر اسلاید — این‌ها شمرده می‌شوند، حدس نیستند:** kicker حداکثر ${SLIDE_LIMITS.kicker} کاراکتر، heading حداکثر ${SLIDE_LIMITS.heading}، text حداکثر ${SLIDE_LIMITS.text}. رد شدن از این‌ها محتوا را برای بازنویسی برمی‌گرداند. **کوتاه بنویس، نه اینکه بلند بنویسی.** این متن‌ها روی تصویر می‌نشینند و جای اضافه‌ای وجود ندارد.
- **هیچ لینکی در کپشن نگذار.** اینستاگرام لینک کپشن را کلیک‌پذیر نمی‌کند؛ به‌جایش بنویس «لینک در بایو».
- ۳ تا ۵ هشتگ، هرکدام با # و بدون فاصله، بدون تکرار. هشتگ اسپم ممنوع (#فالو، #لایک، #فالوبک).
- ایموجی کم و کاربردی. لحن برند اجازه‌ی لحن تبلیغاتی داغ نمی‌دهد.
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
  "caption": "کپشن — ۱۲۵ کاراکتر اولش قلاب است",
  "slides": [
    { "kicker": "قلاب", "heading": "تیتر کوتاه اسلاید", "text": "یکی دو جمله" }
  ],
  "hashtags": ["#گلوبال_تلنت", "#GlobalTalent", "#مهاجرت_حرفه‌ای"],
  "cta": "دعوت به اقدام اسلاید آخر"
}`;

const SHAPE_HINT_EN = `{
  "title": "short internal title",
  "caption": "first sentence is the hook, under 125 characters",
  "slides": [
    { "kicker": "hook", "heading": "short slide heading", "text": "one or two short sentences" }
  ],
  "hashtags": ["#GlobalTalent", "#UKVisa", "#TechTalent"],
  "cta": "call to action on the last slide"
}`;

export async function runInstagramWriter(input: {
  brief: SocialBrief;
}): Promise<InstagramCarousel> {
  const lessons = await lessonsBlockFor("instagram-writer");

  return runAgentJSON({
    agent: "instagram-writer",
    system: systemPrompt(lessons, input.brief.language),
    prompt: `${briefBlock(input.brief)}

${input.brief.language === "en" ? "Write a complete Instagram carousel in English." : "یک کاروسل اینستاگرام کامل بنویس."}`,
    temperature: 0.8,
    schema: InstagramCarouselSchema,
    shapeHint: input.brief.language === "en" ? SHAPE_HINT_EN : SHAPE_HINT,
  });
}

/**
 * بازنویسی بر اساس ایرادهای ویراستار + چک‌های قطعیِ ردشده.
 *
 * نکته: پیش‌نویس قبلی را کامل به مدل می‌دهیم تا «اصلاح» کند، نه اینکه از
 * صفر بنویسد؛ وگرنه چیزهایی که درست بودند هم عوض می‌شوند.
 */
export async function runInstagramRevision(input: {
  brief: SocialBrief;
  draft: InstagramCarousel;
  review: SocialReview;
  failedChecks: SocialCheck[];
}): Promise<InstagramCarousel> {
  const lessons = await lessonsBlockFor("instagram-writer");

  const prompt = `${briefBlock(input.brief)}

— پیش‌نویس فعلی —
${JSON.stringify(input.draft, null, 2)}

— ایرادهای ویراستار (امتیاز ${input.review.score}/100) —
${input.review.issues.map((i) => `- ${i}`).join("\n") || "- (بدون ایراد)"}

— چک‌های قطعیِ ردشده —
${input.failedChecks.map((c) => `- ${c.name}: ${c.note}`).join("\n") || "- (همه پاس شدند)"}

کاروسل را اصلاح کن. فقط چیزهایی را عوض کن که ایراد دارند؛ بقیه را دست نزن.`;

  return runAgentJSON({
    agent: "instagram-writer",
    system: systemPrompt(lessons, input.brief.language),
    prompt,
    temperature: 0.6,
    schema: InstagramCarouselSchema,
    shapeHint: input.brief.language === "en" ? SHAPE_HINT_EN : SHAPE_HINT,
  });
}
