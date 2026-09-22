import "server-only";
import { runAgentJSON } from "@/lib/ai";
import { COMPANY_NAME, COMPANY_PROFILE, BRAND_VOICE } from "@/lib/company";
import { lessonsBlockFor } from "./lessons";
import { SocialBriefSchema, type SocialBrief, type SocialIdea } from "./types";
import { ROUTE_BRIEFING, type BrandRoute } from "./brand-cta";

/**
 * ایجنت ۲ (پایپ‌لاین اینستاگرام) — استراتژیست اینستاگرام
 *
 * ایده‌ها را می‌گیرد و بهترینشان را به همان `SocialBrief` تبدیل می‌کند که
 * «بازآفرین» در پایپ‌لاین بازآفرینی می‌سازد.
 *
 * نکته‌ی معماری: این همان درزی است که در مرحله‌ی قبل عمداً طراحی شد.
 * چون خروجی این ایجنت با خروجی بازآفرین یکی است، کل زنجیره‌ی پایین‌دست
 * (کپی‌رایتر ⇄ ویراستار ⇄ چک‌های قطعی) بدون هیچ تغییری دوباره استفاده
 * می‌شود. قرارداد مشترک، همان چیزی است که بازاستفاده را ممکن می‌کند.
 *
 * تفاوت مهم با بازآفرین: آنجا ماده‌ی خام یک مقاله‌ی واقعی بود و ساختن عدد
 * ممنوع؛ اینجا مقاله‌ای در کار نیست، پس ایجنت باید از دانش عمومی خودش
 * استفاده کند و **هیچ آمار یا عدد مشخصی نسازد**.
 */
export async function runInstagramStrategist(input: {
  ideas: SocialIdea[];
  topicHint: string | null;
  route: BrandRoute;
  language?: "fa" | "en";
  /**
    * موضوع قطعی از برنامه‌ریز هفتگی. وقتی پر باشد، انتخابی در کار نیست.
    *
    * ⚠️ عمداً از topicHint جداست. topicHint قرارداد «حوزه‌ی پیشنهادی»
    * نرم است که استودیو می‌فرستد؛ بازتعریفش یعنی یک اسم با دو معنی.
    */
  assignedTopic?: string;
}): Promise<SocialBrief> {
  const lessons = await lessonsBlockFor("instagram-strategist");

  const system = `تو «استراتژیست محتوای اینستاگرام» ${COMPANY_NAME} هستی. از میان چند ایده، بهترین را انتخاب می‌کنی و آن را به یک بریف دقیق تبدیل می‌کنی که کپی‌رایتر بتواند مستقیم از رویش بنویسد.

${COMPANY_PROFILE}

${BRAND_VOICE}

قواعد:
- بهترین ایده را انتخاب کن (لزوماً نه پرامتیازترین، اگر دلیل بهتری داری) و فقط روی همان تمرکز کن. بریف ترکیبی از چند ایده، محتوای بی‌تمرکز می‌سازد.
- keyPoints باید «ادعا» باشند، نه تیتر. هر نکته باید مستقل خوانده و فهمیده شود.
- **هیچ عدد، درصد یا آماری از خودت نساز.** برخلاف بازآفرینی، اینجا مقاله‌ای نیست که از آن نقل کنی. proofPoint باید یک مثال یا موقعیت ملموس و قابل‌تشخیص باشد (مثلاً «متخصصی که ده سال سابقه دارد، ولی وقتی می‌خواهد شواهدش را بنویسد به دو خط هم نمی‌رسد») نه یک آمار ساختگی.
- hookAngle باید درد مخاطب را بگوید، نه موضوع را.
- بریف را پلتفرم‌خنثی بنویس؛ از «سوایپ کن» و اصطلاحات مخصوص یک شبکه استفاده نکن.

مسیر این اجرا از قبل تعیین شده و انتخاب تو نیست:
route = "${input.route}" → ${ROUTE_BRIEFING[input.route]}
ایده‌ای که به مسیر دیگری تعلق دارد، حتی اگر خوب باشد، اینجا بی‌مصرف است.

دو فیلد را هم باید خودت تعیین کنی:
- audienceGroup: کدام‌یک از پنج گروه مخاطب؟ (digital-tech، academic-research، arts-culture، engineering-medical، entrepreneurship)
- journeyStage: کدام مرحله از سفر؟ (unaware، curious، evaluating، decision، in-journey، success، referral)
اگر برای هرکدام جوابت «همه» بود، یعنی بریف هنوز آماده نیست — یکی را انتخاب کن.
${input.assignedTopic ? `
⚠️ موضوع این اجرا از قبل تعیین شده و انتخاب تو نیست:
«${input.assignedTopic}»
تنها کارت ساختن بریف از همین موضوع است. ایده‌ی بهتر پیشنهاد نده، موضوع را
گسترش نده، و به موضوع دیگری منحرف نشو. قاعده‌ی «بهترین ایده را انتخاب کن»
که بالاتر آمد، در این حالت اصلاً موضوعیت ندارد.
` : ""}${lessons}`;

  const ideasBlock = input.ideas
    .map(
      (i, n) =>
        `${n + 1}. «${i.title}» (امتیاز ${i.score})\n   قلاب: ${i.hook}\n   درد مخاطب: ${i.painPoint}\n   دلیل: ${i.reason}`
    )
    .join("\n");

  const hint = input.topicHint ? `\n\nحوزه‌ی پیشنهادی مدیر محتوا: «${input.topicHint}»` : "";

  const prompt = `ایده‌های پیشنهادی ایده‌یاب:

${ideasBlock}${hint}

${input.assignedTopic ? "برای موضوع تعیین‌شده بریف اجتماعی بنویس." : "یکی را انتخاب کن و برایش بریف اجتماعی بنویس."}`;

  const result = await runAgentJSON({
    agent: "instagram-strategist",
    system,
    prompt,
    temperature: 0.4,
    schema: SocialBriefSchema,
    shapeHint: `{
  "coreMessage": "تنها ایده‌ای که این محتوا منتقل می‌کند",
  "audience": "مخاطب مشخص این محتوا",
  "keyPoints": ["ادعای مستقل اول", "ادعای دوم", "ادعای سوم"],
  "hookAngle": "دردی که مخاطب را متوقف می‌کند",
  "proofPoint": "مثال یا موقعیت ملموس (نه آمار ساختگی)",
  "cta": "دعوت طبیعی به قدم بعدی",
  "audienceGroup": "digital-tech",
  "journeyStage": "curious"
}`,
  });

  // route و language تصمیم اجرا هستند، نه خروجی مدل — قطعی چسبانده می‌شوند.
  // این‌طور احتمال شکست اسکیما روی این دو فیلد صفر است.
  return { ...result, route: input.route, language: input.language ?? "fa" };
}
