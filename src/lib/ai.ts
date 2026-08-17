import "server-only";
import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { z } from "zod";

/**
 * هسته‌ی AI — همان الگوی فاز ۲: همه‌ی مدل‌ها از طریق OpenRouter.
 *
 * دو کمکی اصلی این فایل، سنگ‌بنای همه‌ی ایجنت‌ها هستند:
 * - runAgentText: خروجی متنی آزاد (برای نویسنده)
 * - runAgentJSON: خروجی ساخت‌یافته + اعتبارسنجی Zod + یک بار تلاش مجدد
 *
 * نکته‌ی آموزشی: به‌جای اتکا به JSON mode مدل‌ها (که بین مدل‌های مختلف
 * OpenRouter ناسازگار است)، خودمان JSON را از پاسخ استخراج و با Zod
 * اعتبارسنجی می‌کنیم و اگر خراب بود، خطا را به مدل برمی‌گردانیم تا اصلاح کند.
 * این الگوی «validate + retry» در هر سیستم ایجنتی واقعی لازم است.
 */

export function getOpenRouter() {
  return createOpenAICompatible({
    name: "openrouter",
    baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY ?? "",
    headers: {
      "HTTP-Referer": "https://github.com/siavash-smf/fuwment-blog-agents",
      "X-Title": "Fuwment Blog Agents",
    },
    // محدودکردن reasoning به سطح پایین (همان درسِ فاز ۲):
    // برخی مدل‌ها استدلال اجباری دارند و ممکن است کل بودجه‌ی توکن را صرف آن کنند.
    fetch: (async (url: string, options: RequestInit | undefined) => {
      if (options?.body && typeof options.body === "string") {
        try {
          const body = JSON.parse(options.body);
          body.reasoning = { effort: "low" };
          options = { ...options, body: JSON.stringify(body) };
        } catch {
          /* اگر بدنه JSON نبود، دست‌نخورده بماند */
        }
      }
      return fetch(url, options);
    }) as typeof fetch,
  });
}

export function isConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

/** مدل پیش‌فرض همه‌ی ایجنت‌ها؛ برای نویسنده می‌توان مدل قوی‌تر جدا تعیین کرد */
export function defaultModel(): string {
  return process.env.PIPELINE_MODEL || "google/gemini-2.5-flash";
}

export function writerModel(): string {
  return process.env.WRITER_MODEL || defaultModel();
}

/**
 * سقف زمان یک فراخوانی مدل.
 *
 * ⚠️ این از یک اندازه‌گیری واقعی درآمد، نه احتیاط نظری: در یک اجرا، یک
 * فراخوانی پژوهشگر **۱۲۶٫۹ ثانیه** طول کشید و آخرش پاسخ خالی داد؛ تلاش
 * بعدی در ۸٫۶ ثانیه جواب داد. آن یک هنگ، گام را از ~۳۲ به ۱۵۸ ثانیه برد
 * و کل اجرا را به ۲۹۳ ثانیه رساند — یعنی لبه‌ی سقف ۳۰۰ ثانیه‌ی Vercel.
 *
 * بدون سقف، بدترین حالت ۳ تلاش × زمان نامحدود است. با سقف، تماس هنگ‌کرده
 * سریع می‌میرد و تلاش بعدی معمولاً بلافاصله جواب می‌دهد.
 */
const DEFAULT_TIMEOUT_MS = 45_000;

/**
 * سقف بلندتر برای ایجنت‌هایی که متن بلند تولید می‌کنند.
 * نویسنده در اجراهای سالم ۲۴ تا ۳۰ ثانیه می‌گیرد و ورودی‌اش (بریف +
 * پژوهش + پیش‌نویس قبلی) بزرگ‌ترین ورودی پایپ‌لاین است؛ سقف ۴۵ ثانیه
 * تماس‌های سالم را هم می‌کشت.
 */
export const LONG_FORM_TIMEOUT_MS = 90_000;

/**
 * آیا این خطا از قطعِ سقف زمان است؟
 *
 * `AbortSignal.timeout` یک `TimeoutError` می‌اندازد، ولی AI SDK ممکن است
 * آن را در خطای خودش بپیچد. پس هم نام و هم متن پیام را می‌بینیم — تکیه
 * بر یکی، مورد دیگر را بی‌صدا در دسته‌ی «خطای معمولی» می‌انداخت.
 */
function isTimeoutError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const name = err.name.toLowerCase();
  const msg = err.message.toLowerCase();
  return (
    name === "timeouterror" ||
    name === "aborterror" ||
    msg.includes("timeout") ||
    msg.includes("aborted") ||
    msg.includes("signal is aborted")
  );
}

export type AgentCallOptions = {
  /** نام ایجنت — فقط برای پیام‌های خطای خواناتر */
  agent: string;
  system: string;
  prompt: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  /** سقف زمان هر تلاش؛ پیش‌فرض DEFAULT_TIMEOUT_MS */
  timeoutMs?: number;
};

/** اجرای یک ایجنت با خروجی متنی آزاد */
export async function runAgentText(opts: AgentCallOptions): Promise<string> {
  const openrouter = getOpenRouter();
  const model = openrouter(opts.model ?? defaultModel());

  // پاسخ خالی معمولاً گذراست: بعضی مدل‌ها (مثل Gemini) کل بودجه‌ی توکن را صرف
  // reasoning می‌کنند و متنی نمی‌ماند، یا API لحظه‌ای خطا می‌دهد. چند بار تلاش
  // می‌کنیم تا یک خطای گذرا کل پایپ‌لاین را نکُشد.
  const modelId = opts.model ?? defaultModel();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let lastErr = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    // زمان هر فراخوانی جدا لاگ می‌شود، نه فقط جمع گام.
    // بدون این، گامِ ۴۰ ثانیه‌ای و «دو تلاشِ ۲۰ ثانیه‌ای» یکسان دیده
    // می‌شوند — در حالی که راه‌حلشان کاملاً فرق دارد.
    const t0 = Date.now();
    try {
      const result = await generateText({
        model,
        system: opts.system,
        prompt: opts.prompt,
        temperature: opts.temperature ?? 0.7,
        maxOutputTokens: opts.maxOutputTokens ?? 8000,
        abortSignal: AbortSignal.timeout(timeoutMs),
      });
      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      const usage = result.usage;
      if (result.text.trim()) {
        console.log(
          `[llm] ${opts.agent.padEnd(20)} ${secs.padStart(6)}s  تلاش ${attempt}  ${modelId}  ` +
            `(ورودی ${usage?.inputTokens ?? "?"} / خروجی ${usage?.outputTokens ?? "?"} توکن)`
        );
        return result.text;
      }
      console.log(`[llm] ${opts.agent.padEnd(20)} ${secs.padStart(6)}s  تلاش ${attempt} — پاسخ خالی`);
      lastErr = "پاسخ خالی بود (احتمالاً بودجه‌ی توکن صرف reasoning شد)";
    } catch (err) {
      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      lastErr = err instanceof Error ? err.message : String(err);

      /**
       * قطع به‌خاطر سقف زمان را از خطای معمولی جدا لاگ می‌کنیم.
       *
       * پیشوند `[llm-timeout]` عمدی است: با `grep "\[llm-timeout\]"` روی
       * لاگ‌ها می‌شود شمرد چند بار رخ داده. اگر زیاد شد یعنی یا سقف کم
       * است یا مدل/ارائه‌دهنده مشکل دارد — و بدون این تفکیک، این دو در
       * انبوه خطاهای معمولی گم می‌شوند.
       */
      if (isTimeoutError(err)) {
        console.error(
          `[llm-timeout] ${opts.agent.padEnd(20)} ${secs.padStart(6)}s  تلاش ${attempt} — ` +
            `از سقف ${(timeoutMs / 1000).toFixed(0)} ثانیه گذشت و قطع شد. ` +
            `${attempt < 3 ? "تلاش بعدی…" : "تلاش آخر بود."}`
        );
      } else {
        console.log(
          `[llm] ${opts.agent.padEnd(20)} ${secs.padStart(6)}s  تلاش ${attempt} — خطا: ${lastErr.slice(0, 80)}`
        );
      }
    }
  }
  throw new Error(`ایجنت «${opts.agent}» بعد از ۳ تلاش پاسخ معتبری نداد: ${lastErr}`);
}

/** استخراج اولین شیء JSON از متن (مدل‌ها گاهی دور آن توضیح یا ``` می‌گذارند) */
function extractJson(text: string): string {
  const cleaned = text.replace(/```(?:json)?/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("هیچ شیء JSON در پاسخ پیدا نشد.");
  }
  return cleaned.slice(start, end + 1);
}

export type AgentJSONOptions<T> = AgentCallOptions & {
  /** اسکیمای Zod برای اعتبارسنجی خروجی */
  schema: z.ZodType<T>;
  /** نمونه‌ی شکل خروجی که داخل پرامپت به مدل نشان داده می‌شود */
  shapeHint: string;
};

/**
 * اجرای یک ایجنت با خروجی JSON اعتبارسنجی‌شده.
 * اگر بار اول JSON نامعتبر بود، یک بار دیگر با پیام خطا تلاش می‌کند.
 */
export async function runAgentJSON<T>(opts: AgentJSONOptions<T>): Promise<T> {
  const jsonInstruction =
    `\n\n— قالب خروجی —\n` +
    `خروجی تو باید «فقط» یک شیء JSON معتبر باشد؛ بدون هیچ توضیح، مقدمه یا \`\`\`.\n` +
    `دقیقاً با این ساختار:\n${opts.shapeHint}`;

  let lastError = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const retryNote = lastError
      ? `\n\nتلاش قبلی‌ات معتبر نبود. خطا: ${lastError}\nاین بار فقط JSON معتبر مطابق ساختار بده.`
      : "";

    // فراخوانی داخل try/catch است تا خطای «پاسخ خالی» هم به‌جای شکست کل
    // پایپ‌لاین، یک تلاش مجدد بشود (نه فقط خطای JSON نامعتبر).
    try {
      const text = await runAgentText({
        ...opts,
        prompt: opts.prompt + jsonInstruction + retryNote,
        // خروجی ساخت‌یافته با دمای پایین‌تر پایدارتر است
        temperature: opts.temperature ?? 0.4,
      });
      const parsed = JSON.parse(extractJson(text));
      return opts.schema.parse(parsed);
    } catch (err) {
      lastError = err instanceof Error ? err.message.slice(0, 500) : String(err);
    }
  }
  throw new Error(`ایجنت «${opts.agent}» بعد از ۲ تلاش خروجی معتبر نداد: ${lastError}`);
}
