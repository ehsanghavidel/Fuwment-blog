import "server-only";
import { z } from "zod";
import { runAgentJSON } from "@/lib/ai";
import { COMPANY_NAME, COMPANY_PROFILE } from "@/lib/company";
import { lessonsBlockFor } from "./lessons";
import { ResearchSchema, type Brief, type Research, type Source } from "./types";

/**
 * ایجنت ۳ — پژوهشگر (Researcher)
 *
 * وظیفه: جمع‌آوری ماده‌ی خام مقاله — فکت‌ها، مثال‌ها و سؤال‌های رایج —
 * تا نویسنده از خودش «نبافد» (کاهش توهم).
 *
 * نکته‌ی آموزشی — الگوی «مدل تصمیم می‌گیرد، کد اجرا می‌کند»:
 * اگر کلید Tavily موجود باشد، مرحله‌ی اول از مدل «کوئری جستجو» می‌گیریم
 * (تصمیم با LLM)، ولی خودِ جستجو را با fetch معمولی در کد انجام می‌دهیم
 * (اجرای قطعی). این تفکیک از دادنِ ابزار آزاد به مدل قابل‌اعتمادتر است.
 * بدون کلید، پژوهشگر به دانش خود مدل تکیه می‌کند و پایپ‌لاین نمی‌شکند.
 */

const QueriesSchema = z.object({ queries: z.array(z.string()).min(2).max(4) });

/**
 * سقف منابعِ ضمیمه‌شده به مقاله.
 *
 * تا ۴ کوئری × ۳ نتیجه = حداکثر ۱۲ نتیجه. فهرست ۱۲تایی زیر یک مقاله‌ی
 * ۱۲۰۰ کلمه‌ای بیشتر شبیه لاگ است تا منبع، پس بعد از حذف تکراری‌ها می‌بُریم.
 */
const MAX_SOURCES = 6;

type SearchResult = { title: string; url: string; content: string };

/**
 * جستجوی وب با Tavily.
 *
 * ⚠️ درس واقعی: نسخه‌ی اول این تابع `if (!res.ok) return []` بود و هیچ
 * لاگی نداشت. کلید در .env.local یک حرف اضافه داشت (`ttvly-` به‌جای
 * `tvly-`)، Tavily با ۴۰۱ جواب می‌داد، و پایپ‌لاین بی‌هیچ نشانه‌ای
 * می‌گفت «جستجو بدون نتیجه». یعنی تفاوتِ «کلید خراب است» و «چیزی پیدا
 * نشد» به بیرون درز نمی‌کرد — بدترین نوع شکست، چون شبیه کارکرد عادی است.
 *
 * حالا شکست بی‌صدا نیست: وضعیت HTTP و پیام خودِ Tavily لاگ می‌شوند.
 * همچنان `[]` برمی‌گردانیم (نه throw) چون طبق طراحی این فایل، جستجوی وب
 * اختیاری است و نبودش نباید اجرا را بکُشد.
 */
async function tavilySearch(query: string): Promise<SearchResult[]> {
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        max_results: 3,
        search_depth: "basic",
      }),
    });

    if (!res.ok) {
      // پیام خطای واقعی Tavily را می‌خوانیم؛ «۴۰۱» به‌تنهایی نمی‌گوید چرا
      const detail = await res.text().catch(() => "");
      console.error(
        `[tavily] ${res.status} ${res.statusText} برای کوئری «${query}» — ${detail.slice(0, 300)}`
      );
      return [];
    }

    const data = await res.json();
    const results: SearchResult[] = (data.results ?? []).map((r: any) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      content: String(r.content ?? "").slice(0, 800),
    }));

    console.log(`[tavily] «${query}» → ${results.length} نتیجه`);
    return results;
  } catch (err) {
    // خطای شبکه یا JSON خراب — قبلاً کل گام پژوهشگر را می‌کُشت
    console.error(
      `[tavily] فراخوانی برای کوئری «${query}» شکست خورد: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return [];
  }
}

export async function runResearcher(input: { brief: Brief }): Promise<Research> {
  const lessons = await lessonsBlockFor("researcher");
  const { brief } = input;

  const system = `تو «پژوهشگر» تیم محتوای ${COMPANY_NAME} هستی. ماده‌ی خام دقیق و قابل‌استناد برای نویسنده آماده می‌کنی. اغراق نمی‌کنی و آمار بی‌منبع نمی‌سازی.

${COMPANY_PROFILE}${lessons}`;

  // مرحله‌ی اختیاری: جستجوی واقعی وب
  let webContext = "";
  // بیرون از بلوک شرط زندگی می‌کند، چون بعد از تولید خروجی مدل هم لازمش داریم
  let sources: Source[] = [];
  if (process.env.TAVILY_API_KEY) {
    const { queries } = await runAgentJSON({
      agent: "researcher",
      system,
      prompt: `برای مقاله‌ای با این مشخصات، ۲ تا ۴ کوئری جستجوی وب طراحی کن (فارسی یا انگلیسی، هرکدام مؤثرتر است):
عنوان: ${brief.title}
کلمه‌ی کلیدی اصلی: ${brief.primaryKeyword}
مخاطب: ${brief.audience}`,
      schema: QueriesSchema,
      shapeHint: `{ "queries": ["کوئری اول", "کوئری دوم"] }`,
    });

    // کوئری‌ها را قبل از ارسال لاگ می‌کنیم: وقتی جستجو نتیجه نمی‌دهد،
    // اولین سؤال این است که مدل اصلاً دنبال چه گشته.
    console.log(`[researcher] ${queries.length} کوئری: ${queries.map((q) => `«${q}»`).join("، ")}`);

    const allResults = (await Promise.all(queries.map(tavilySearch))).flat();
    if (allResults.length > 0) {
      webContext =
        `\n\nنتایج جستجوی وب (فقط به‌عنوان ماده‌ی خام؛ صحت‌سنجی با توست):\n` +
        allResults
          .map((r) => `- ${r.title} (${r.url})\n  ${r.content}`)
          .join("\n");

      // کوئری‌های مختلف اغلب به یک صفحه می‌رسند؛ URL کلید یکتایی است.
      // نتیجه‌ی بی‌عنوان یا بی‌آدرس هم به درد فهرست منابع نمی‌خورد.
      const seen = new Set<string>();
      sources = allResults
        .filter((r) => r.url && r.title && !seen.has(r.url) && seen.add(r.url))
        .map((r) => ({ title: r.title, url: r.url }))
        .slice(0, MAX_SOURCES);
    }
  }

  const prompt = `بریف مقاله:
عنوان: ${brief.title}
مخاطب: ${brief.audience}
نیت جستجو: ${brief.searchIntent}
ساختار: ${brief.outline.map((s) => s.heading).join(" / ")}${webContext}

بر این اساس، ماده‌ی خام پژوهشی مقاله را آماده کن:
- keyFacts: نکته‌ها و فکت‌های کلیدی که مقاله باید بگوید (اگر آماری مطمئن نیستی، به‌جای عدد دقیق، روند یا اصل را بگو).
- examples: مثال‌های ملموس از فضای کسب‌وکار ایران که نویسنده بتواند استفاده کند.
- commonQuestions: سؤال‌هایی که مخاطب واقعاً درباره‌ی این موضوع دارد (برای بخش FAQ).
- angleNotes: توصیه‌ات به نویسنده برای متمایزکردن مقاله.`;

  const out = await runAgentJSON({
    agent: "researcher",
    system,
    prompt,
    schema: ResearchSchema,
    shapeHint: `{
  "keyFacts": ["فکت یا نکته کلیدی"],
  "examples": ["مثال ملموس"],
  "commonQuestions": ["سؤال رایج مخاطب"],
  "angleNotes": "توصیه‌ها به نویسنده"
}`,
  });

  // منابع از کد می‌آیند، نه از مدل — بدون کلید Tavily فهرست خالی می‌ماند
  // و مقاله هم فهرست منابع نمی‌گیرد.
  return { ...out, sources };
}
