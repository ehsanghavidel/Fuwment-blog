import "server-only";
import { runAgentJSON } from "@/lib/ai";
import { BRAND_VOICE, COMPANY_NAME, COMPANY_PROFILE } from "@/lib/company";
import { lessonsBlockFor } from "./lessons";
import { BriefSchema, type Brief, type Idea } from "./types";

/**
 * ایجنت ۲ — استراتژیست محتوا (Content Strategist)
 *
 * وظیفه: تبدیل بهترین ایده به «بریف محتوا» — سندی که نویسنده و سئوکار
 * بر اساس آن کار می‌کنند: مخاطب دقیق، کلمه‌ی کلیدی اصلی، ساختار مقاله و CTA.
 *
 * نکته‌ی آموزشی: جداکردن «تصمیم‌گیری درباره‌ی چیستی» (استراتژیست) از
 * «تولید» (نویسنده) کیفیت را بالا می‌برد؛ همان دلیلی که در تیم انسانی هم
 * بریف قبل از نوشتن تهیه می‌شود.
 */

export async function runStrategist(input: {
  ideas: Idea[];
  topicHint: string | null;
}): Promise<Brief> {
  const lessons = await lessonsBlockFor("strategist");

  const system = `تو «استراتژیست محتوا»ی شرکت ${COMPANY_NAME} هستی. از بین ایده‌ها بهترین را انتخاب و به بریف اجرایی تبدیل می‌کنی.

${COMPANY_PROFILE}

${BRAND_VOICE}${lessons}`;

  const ideasText = input.ideas
    .map(
      (i, n) =>
        `${n + 1}. «${i.title}» (امتیاز ${i.score}/10)\n   زاویه: ${i.angle}\n   نیت جستجو: ${i.searchIntent}`
    )
    .join("\n");

  const prompt = `ایده‌های پیشنهادی ایده‌یاب (مرتب بر اساس امتیاز):

${ideasText}

بهترین ایده را انتخاب کن (لازم نیست حتماً اولی باشد — قضاوت خودت را داشته باش) و بریف کامل محتوا بساز:
- عنوان نهایی را در صورت نیاز بهتر کن (جذاب اما بدون کلیک‌بیت).
- کلمه‌ی کلیدی اصلی باید عبارتی باشد که واقعاً به فارسی جستجو می‌شود.

— سه تصمیم هدف‌گیری (هر سه اجباری، و «همه» جواب مجاز نیست) —
- route: کدام مسیر برند؟
  · brand — سطح برند، بی‌طرف نسبت به دو مسیر. وقتی محتوا هنوز نمی‌داند
    مخاطب کدام مسیر را می‌رود و قرار است کمکش کند خودش را بسنجد.
  · global-talent — محتوایی که بر پایه‌ی دستاورد و تاثیر فردی است.
  · innovator-founder — محتوایی که بر پایه‌ی ایده و کسب‌وکار است.
- audienceGroup: کدام‌یک از پنج گروه؟
  digital-tech (مهندس نرم‌افزار، دیزاینر محصول، متخصص داده، مدیر محصول) ·
  academic-research (دکترا، پسادکترا، هیئت علمی) ·
  arts-culture (فیلم‌ساز، طراح، نویسنده، موسیقی‌دان، کیوریتور) ·
  engineering-medical (مهندسی، پزشکی و پژوهش بالینی) ·
  entrepreneurship (بنیان‌گذار استارتاپ یا کسب‌وکار فعال)
- journeyStage: مخاطب این مقاله کجای سفر است؟
  · awareness — هنوز نمی‌داند این مسیرها وجود دارند یا فکر می‌کند برای نوابغ‌اند.
    محتوای این مرحله نباید بفروشد.
  · consideration — می‌داند مسیر هست و دارد می‌سنجد که به دردش می‌خورد یا نه.
  · decision — تصمیم گرفته و دنبال این است که چطور و با چه کسی پیش برود.
- فیلد audience را متناسب با همان گروه بنویس، مشخص و ملموس. «همه‌ی متخصصان»
  یا «عموم مخاطبان» رد می‌شود؛ محتوایی که برای همه نوشته شود قلاب ندارد.
- ساختار (outline) باید ۴ تا ۷ بخش داشته باشد و آخرین بخش به یک قدم بعدی روشن برسد.
- فیلد cta باید به «ارزیابی اولیه» دعوت کند. عبارت «مشاوره‌ی رایگان» ممنوع است؛
  آن خدمت وجود ندارد و برندگاید این عبارت را صریحاً رد کرده است.
- فقط یک دعوت مستقیم بگذار، نه چند تا.
- طول هدف بین ۹۰۰ تا ۱۵۰۰ کلمه باشد.`;

  return runAgentJSON({
    agent: "strategist",
    system,
    prompt,
    schema: BriefSchema,
    shapeHint: `{
  "title": "عنوان نهایی مقاله",
  "audience": "توصیف دقیق مخاطب این مقاله",
  "route": "global-talent",
  "audienceGroup": "digital-tech",
  "journeyStage": "awareness",
  "searchIntent": "نیت جستجوی کاربر",
  "primaryKeyword": "کلمه کلیدی اصلی فارسی",
  "secondaryKeywords": ["کلمه ۱", "کلمه ۲", "کلمه ۳"],
  "outline": [
    { "heading": "عنوان بخش", "points": ["نکته‌ای که باید پوشش داده شود"] }
  ],
  "targetWordCount": 1200,
  "cta": "متن دعوت به اقدام پایانی در یکی دو جمله"
}`,
  });
}
