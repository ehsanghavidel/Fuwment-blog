import "server-only";
import { runAgentJSON } from "@/lib/ai";
import { COMPANY_NAME, COMPANY_PROFILE } from "@/lib/company";
import { lessonsBlockFor } from "./lessons";
import { IdeaScoutOutputSchema, type Idea } from "./types";
import { ROUTE_BRIEFING, type BrandRoute } from "./brand-cta";

/**
 * ایجنت ۱ — ایده‌یاب (Idea Scout)
 *
 * وظیفه: تولید چند ایده‌ی مقاله و امتیازدهی به آن‌ها.
 * ورودی مهم: عنوان پست‌های قبلی، تا ایده‌ی تکراری ندهد — ایجنت‌ها حافظه
 * ندارند؛ هر «دانستنی» را باید صریح در پرامپت به آن‌ها بدهیم.
 */

export async function runIdeaScout(input: {
  topicHint: string | null;
  existingTitles: string[];
  route: BrandRoute;
}): Promise<Idea[]> {
  const lessons = await lessonsBlockFor("idea-scout");

  const system = `تو «ایده‌یاب» تیم محتوای شرکت ${COMPANY_NAME} هستی — متخصص پیداکردن موضوع‌هایی که هم برای مخاطب جذاب‌اند و هم در جستجوی فارسی تقاضا دارند.

${COMPANY_PROFILE}${lessons}`;

  const existing =
    input.existingTitles.length > 0
      ? `\n\nمقاله‌های موجود بلاگ (ایده‌ی تکراری یا خیلی مشابه این‌ها نده):\n${input.existingTitles.map((t) => `- ${t}`).join("\n")}`
      : "";

  const hint = input.topicHint
    ? `\n\nمدیر محتوا این حوزه را پیشنهاد داده؛ ایده‌ها حول همین باشند: «${input.topicHint}»`
    : "";

  const routeBlock = `\n\nمسیر این اجرا **از قبل تعیین شده** و انتخاب تو نیست:\nroute = "${input.route}" → ${ROUTE_BRIEFING[input.route]}\nهر ۵ ایده باید با همین مسیر هم‌خوان باشند. ایده‌ای که به مسیر دیگری تعلق دارد، حتی اگر خوب باشد، اینجا بی‌مصرف است.`;
  const prompt = `۵ ایده‌ی مقاله برای بلاگ ${COMPANY_NAME} پیشنهاد بده.${routeBlock}

معیارهای امتیازدهی (۰ تا ۱۰):
- آیا مخاطبِ توصیف‌شده در پروفایل شرکت واقعاً این را در گوگل جستجو می‌کند؟
- آیا به یکی از محورهای بلاگ و خدمات ${COMPANY_NAME} وصل می‌شود؟
- آیا می‌توان حرف عملی و غیرتکراری در آن زد؟${existing}${hint}`;

  const result = await runAgentJSON({
    agent: "idea-scout",
    system,
    prompt,
    temperature: 0.8,
    schema: IdeaScoutOutputSchema,
    shapeHint: `{
  "ideas": [
    {
      "title": "عنوان پیشنهادی مقاله به فارسی",
      "angle": "زاویه‌ی خاص و متمایز مقاله در یک جمله",
      "searchIntent": "کاربر با چه نیتی این را جستجو می‌کند",
      "score": 8.5,
      "reason": "چرا این ایده خوب است"
    }
  ]
}`,
  });

  // مرتب‌سازی نزولی بر اساس امتیاز؛ استراتژیست از بهترین شروع می‌کند
  return result.ideas.sort((a, b) => b.score - a.score);
}
