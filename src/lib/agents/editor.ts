import "server-only";
import { runAgentJSON } from "@/lib/ai";
import { BRAND_VOICE, COMPANY_NAME } from "@/lib/company";
import { lessonsBlockFor } from "./lessons";
import { ReviewSchema, type Brief, type Review } from "./types";
import type { BrandCheck } from "./brand-checks";

/**
 * ایجنت ۵ — ویراستار (Editor)
 *
 * وظیفه: قضاوت کیفیت پیش‌نویس با یک روبریک صریح و دادن ایرادهای «قابل اجرا».
 *
 * نکته‌ی آموزشی — الگوی Generator/Critic:
 * نویسنده و ویراستار عمداً دو ایجنت جدا هستند. مدلی که خودش متن را نوشته،
 * در نقد آن سخت‌گیر نیست (سوگیری خودارزیابی). ویراستارِ جدا با روبریک
 * عددی، دروازه‌ی کیفیت (quality gate) پایپ‌لاین است: امتیاز پایین → برگشت
 * به نویسنده برای بازنویسی.
 */

/** حد نصاب پذیرش — زیر این امتیاز، پیش‌نویس به نویسنده برمی‌گردد */
export const APPROVE_THRESHOLD = 75;

export async function runEditor(input: {
  brief: Brief;
  draft: string;
  /** چک‌های قطعی برند که رد شده‌اند — کد قبلاً سنجیده، ویراستار دوباره قضاوتشان نمی‌کند */
  failedBrandChecks?: BrandCheck[];
}): Promise<Review> {
  const lessons = await lessonsBlockFor("editor");

  const system = `تو «ویراستار ارشد» بلاگ ${COMPANY_NAME} هستی — سخت‌گیر اما منصف. کارت قضاوت کیفیت است، نه بازنویسی. ایرادهایی که می‌گیری باید آن‌قدر مشخص باشند که نویسنده دقیقاً بداند چه چیزی را کجا عوض کند.

${BRAND_VOICE}${lessons}`;

  // چک‌های قطعیِ ردشده به‌عنوان «واقعیت» داده می‌شوند، نه نظر. ویراستار
  // نباید درباره‌شان مذاکره کند — کد آن‌ها را شمرده و قضاوتشان تمام است.
  const failed = input.failedBrandChecks?.filter((c) => !c.pass) ?? [];
  const brandBlock = failed.length
    ? `\n— چک‌های قطعی برند که رد شده‌اند (این‌ها قطعی‌اند، نه سلیقه) —
${failed.map((c) => `- ${c.name}: ${c.note}`).join("\n")}
این موارد باید عیناً در issues بیایند و امتیاز brandVoice را پایین بیاورند.\n`
    : "";

  const prompt = `بریف مقاله:
عنوان: ${input.brief.title}
مخاطب: ${input.brief.audience}
کلمه‌ی کلیدی اصلی: ${input.brief.primaryKeyword}
طول هدف: ${input.brief.targetWordCount} کلمه

— پیش‌نویس —
${input.draft}
${brandBlock}
پیش‌نویس را با این روبریک ارزیابی کن (هر معیار ۰ تا ۱۰):
- clarity: شفافیت و روانی — آیا هر پاراگراف یک حرف روشن دارد؟
- brandVoice: تطابق با لحن برند — بدون اغراق، بدون تبلیغ‌زدگی؟
- usefulness: سودمندی عملی — خواننده بعد از مقاله «قدم بعدی» را می‌داند؟
- structure: ساختار — تطابق با بریف، تیترهای درست، مقدمه و جمع‌بندی؟
- persian: فارسی طبیعی — بدون ترجمه‌زدگی و جمله‌های ماشینی؟

score = مجموع پنج معیار × ۲ (یعنی ۰ تا ۱۰۰).
اگر score زیر ${APPROVE_THRESHOLD} بود verdict را "revise" بگذار و در issues دقیق بگو چه چیزهایی باید اصلاح شود؛ وگرنه "approve".`;

  return runAgentJSON({
    agent: "editor",
    system,
    prompt,
    temperature: 0.3,
    schema: ReviewSchema,
    shapeHint: `{
  "score": 82,
  "rubric": { "clarity": 8, "brandVoice": 9, "usefulness": 8, "structure": 8, "persian": 8 },
  "issues": ["ایراد مشخص و قابل اجرا"],
  "verdict": "approve"
}`,
  });
}
