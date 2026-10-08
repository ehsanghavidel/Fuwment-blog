import "server-only";
import { runAgentJSON } from "@/lib/ai";
import { COMPANY_NAME } from "@/lib/company";
import { lessonsBlockFor } from "./lessons";
import { ROUTE_BRIEFING } from "./brand-cta";
import { ReelsScriptSchema, type ReelsScript, type SocialReview } from "./types";
import type { SocialCheck } from "./social-checks";
import type { ReelsSource } from "./reels-source";
import type { BrandRoute } from "@/lib/company";
import {
  INSTAGRAM_GOAL_CTAS,
  JOURNEY,
  audienceProfileFa,
  brandContext,
  type AudienceGroup,
  type ContentGoal,
  type JourneyStage,
} from "@/lib/brand";

/**
 * ایجنت — کپی‌رایتر ریلز
 *
 * از یک لینک یا متن، اسکریپتی می‌سازد که مستقیم از رویش خوانده و ضبط شود.
 *
 * نکته‌ی کلیدی این ایجنت: خروجی باید **گفتنی** باشد، نه نوشتنی. جمله‌ی
 * قشنگِ کتابی وقتی بلند خوانده می‌شود مصنوعی به گوش می‌آید. برای همین
 * ساختار جمله‌ها کوتاه و نفس‌گیر است.
 *
 * ⚠️ v3.7 (تصمیم مالک): ریلز تابع زبان اینستاگرام فارسی است — خطاب «تو»،
 * قلاب محاوره‌ای — به‌علاوه‌ی لحن ویدیوی v3.7 (روایی و آرام؛ شروع با سؤال،
 * موقعیت واقعی، کیس یا داستان). پیش از v3.7 این‌جا «همیشه با خطاب شما» و
 * املای کتابی الزام شده بود؛ آن قاعده‌ی v3.5 بود و حالا برعکس است.
 *
 * CTA هم از «فهرست CTAهای برند» (دعوت مستقیم/واسط) به «CTA بر اساس هدف
 * پست»ِ اینستاگرام رسید: آموزشی ذخیره/ارسال، فروش فقط لینک ارزیابی مسیر
 * در بایو.
 */

function ctaBlock(goal: ContentGoal): string {
  const options = INSTAGRAM_GOAL_CTAS[goal];
  return `— قدم بعدی (هدف ویدیو: ${goal === "sales" ? "فروش/تبدیل" : "آموزشی"}) — دقیقاً یکی —
${options.map((c, i) => `${i + 1}. «${c.fa}» (id: ${c.id})`).join("\n")}
آن را انتخاب کن که با همین ویدیو جور است و شناسه‌اش را در ctaId بگذار. جمله‌ی cta را طبیعی و با «تو» بگو؛ برچسب بالا یک نام است، نه متنی که باید عیناً خوانده شود${
    goal === "sales" ? " — ولی معنایش (لینک ارزیابی مسیر در بایو) دقیقاً همین بماند" : ""
  }.${goal === "educational" ? "\n⚠️ این ویدیو نباید بفروشد: ارجاع به بایو، ارزیابی اولیه یا رزرو ممنوع است." : ""}`;
}

function systemPrompt(
  lessons: string,
  leadMagnet: string | null,
  route: BrandRoute | undefined,
  goal: ContentGoal
): string {
  return `تو «کپی‌رایتر ریلز» ${COMPANY_NAME} هستی. اسکریپت‌هایی می‌نویسی که قرار است مستقیم از رویشان بلند خوانده و ضبط شوند.

${brandContext("reels-fa")}

— قاعده‌ی اول: هرچه می‌نویسی باید «گفتنی» باشد، نه «نوشتنی» —
اسکریپت را بلند بخوان؛ اگر جمله‌ای در دهان نمی‌چرخد، بازش کن. جمله‌های کوتاه و قابل نفس‌گیری. عبارت‌های کتابی و اداری («لذا»، «می‌بایست»، «حائز اهمیت») در گفتار مصنوعی‌اند؛ استفاده نکن.
- خطاب «تو»، فارسی گفتاری و طبیعی — مثل دوستی که این راه را رفته و حالا رو به دوربین توضیح می‌دهد.
- ولی گفتاری یعنی طبیعی، نه لاتی یا بی‌دقت: اصطلاح تخصصی را همان‌جا ساده توضیح بده و دقتِ حرف را فدای لحن نکن.

— ساختار —
۱) قلاب (۳ تا ۵ ثانیه): یک سؤال، یک موقعیت واقعی، یک کیس یا یک داستان — لحن ویدیوی برند روایی و آرام است، نه هیجانی. **سلام، مقدمه‌چینی و معرفی شرکت ممنوع** — از همان کلمه‌ی اول برو سر حرف مخاطب. حداکثر حدود ۲۰ کلمه.
۲) بدنه: یک قوس روایت داشته باشد — مسئله یا سؤال ← توضیح ساده ← «خب که چه؟» یعنی نتیجه‌ای که به کار مخاطب می‌آید.
۳) قدم بعدی: فقط یکی، از فهرست پایین.
${route ? `\nمسیر این ویدیو: ${ROUTE_BRIEFING[route]}\n` : ""}
— طول —
هر ۱۴۰ کلمه‌ی فارسی حدود یک دقیقه خوانده می‌شود. سقف مطلق ۴۰۰ کلمه (زیر ۳ دقیقه). نقطه‌ی شیرین ۱۴۰ تا ۲۲۰ کلمه (یک تا یک‌ونیم دقیقه) — مگر محتوا واقعاً سنگین باشد.

${ctaBlock(goal)}${
    leadMagnet ? `\n\nمنبع رایگان موجود برای این ویدیو: «${leadMagnet}»` : ""
  }

— ممنوع —
- هیچ راهنمای صحنه، توضیح اجرا یا نشانه‌گذاری داخل کروشه در متن اسکریپت نگذار. فقط چیزی بنویس که قرار است **گفته** شود.
- عدد و آمار از خودت نساز. اگر در منبع نبود، به‌جای عدد دقیق، روند یا اصل را بگو.
- هشتگ‌ها را فقط در فیلد hashtags بگذار، نه داخل متن کپشن — ۳ تا ۵ تا، فقط با حروف فارسی.
- وعده‌ی تضمینی و لحن تبلیغاتی داغ ممنوع است.${lessons}`;
}

const SHAPE_HINT = `{
  "title": "عنوان داخلی برای فهرست استودیو",
  "hook": "جمله‌ی کوبنده‌ی سه تا پنج ثانیه‌ی اول",
  "body": "بدنه‌ی اسکریپت، آماده‌ی بلندخوانی",
  "cta": "جمله‌ی قدم بعدی، همان‌طور که گفته می‌شود",
  "ctaId": "save",
  "ctaReason": "یک جمله: چرا این قدم بعدی برای این ویدیو درست است",
  "onScreenText": "متن کوتاه روی فریم قلاب",
  "caption": "کپشن پیشنهادی زیر ویدیو",
  "hashtags": ["#گلوبال_تلنت", "#مهاجرت_حرفه‌ای", "#اندورسمنت"]
}`;

function sourceBlock(source: ReelsSource): string {
  if (source.trusted) {
    return `— ماده‌ی خام (${source.origin}) —
${source.text}`;
  }
  return `— زاویه‌ی پیشنهادی (این متن را **خود سیستم** تولید کرده، نه یک انسان) —
${source.text}

⚠️ این متن «واقعیت» نیست، فقط یک جهت است. هر عدد، درصد، آمار یا مثال موردیِ مشخصی که در آن آمده **ساختگی است** و نباید در اسکریپت تو ظاهر شود. فقط موضوع و زاویه را بردار؛ ادعاهای عددی را به بیان کیفی تبدیل کن.`;
}

/**
 * برای چه کسی و در کدام مرحله — همان بلوکی که نویسنده‌ی کاروسل می‌گیرد.
 * مفهوم داخلی است: شناسه‌ها و برچسب‌ها راهنمای نویسنده‌اند و در اسکریپت
 * نمی‌آیند.
 */
function targetBlock(audienceGroup: AudienceGroup, journeyStage: JourneyStage): string {
  const j = JOURNEY[journeyStage];
  return `— مخاطب این ویدیو (داخلی — واژه‌هایش وارد اسکریپت نشود) —
${audienceProfileFa(audienceGroup)}
مرحله: ${j.label} — سؤال مخاطب در این مرحله: «${j.question}». کار ما: ${j.job}`;
}

export async function runReelsWriter(input: {
  source: ReelsSource;
  leadMagnet: string | null;
  route?: BrandRoute;
  /** هدف ویدیو — پیش‌فرض آموزشی (v3.7) */
  contentGoal?: ContentGoal;
  audienceGroup: AudienceGroup;
  journeyStage: JourneyStage;
}): Promise<ReelsScript> {
  const lessons = await lessonsBlockFor("reels-writer");

  const prompt = `${sourceBlock(input.source)}

${targetBlock(input.audienceGroup, input.journeyStage)}

این محتوا را کامل بخوان، نکته‌ی اصلی و ارزشمندش را پیدا کن — آن چیزی که واقعاً ارزش یک ویدیو را دارد — و بر اساسش یک اسکریپت ریلز بنویس.`;

  return runAgentJSON({
    agent: "reels-writer",
    system: systemPrompt(lessons, input.leadMagnet, input.route, input.contentGoal ?? "educational"),
    prompt,
    temperature: 0.7,
    maxOutputTokens: 4000,
    schema: ReelsScriptSchema,
    shapeHint: SHAPE_HINT,
  });
}

export async function runReelsRevision(input: {
  source: ReelsSource;
  leadMagnet: string | null;
  route?: BrandRoute;
  contentGoal?: ContentGoal;
  audienceGroup: AudienceGroup;
  journeyStage: JourneyStage;
  draft: ReelsScript;
  review: SocialReview;
  failedChecks: SocialCheck[];
}): Promise<ReelsScript> {
  const lessons = await lessonsBlockFor("reels-writer");

  const prompt = `${sourceBlock(input.source)}

${targetBlock(input.audienceGroup, input.journeyStage)}

— پیش‌نویس فعلی —
${JSON.stringify(input.draft, null, 2)}

— ایرادهای ویراستار (امتیاز ${input.review.score}/100) —
${input.review.issues.map((i) => `- ${i}`).join("\n") || "- (بدون ایراد)"}

— چک‌های قطعیِ ردشده —
${input.failedChecks.map((c) => `- ${c.name}: ${c.note}`).join("\n") || "- (همه پاس شدند)"}

اسکریپت را اصلاح کن. فقط چیزهایی را عوض کن که ایراد دارند؛ بقیه را دست نزن.`;

  return runAgentJSON({
    agent: "reels-writer",
    system: systemPrompt(lessons, input.leadMagnet, input.route, input.contentGoal ?? "educational"),
    prompt,
    temperature: 0.5,
    maxOutputTokens: 4000,
    schema: ReelsScriptSchema,
    shapeHint: SHAPE_HINT,
  });
}
