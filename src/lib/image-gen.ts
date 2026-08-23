import "server-only";

/**
 * تولید تصویر پس‌زمینه‌ی کاور — الگوی `wordpress.ts` و `storage.ts`:
 * سرویس بیرونی، بیرون از هر قرارداد، و با نبود کلید **بی‌صدا** خاموش.
 *
 * ── چرا OpenRouter و نه SDK اختصاصی ──
 *
 * OpenRouter تولید تصویر دارد و همان `OPENROUTER_API_KEY` را می‌پذیرد
 * که پایپ‌لاین متن استفاده می‌کند. یعنی صفر متغیر محیطی جدید، صفر
 * وابستگی جدید. و قیمتش با قیمت رسمی Google تطبیق داده شد — بدون
 * مارک‌آپ.
 *
 * ── چرا این مدل ──
 *
 * `gemini-3.1-flash-lite-image` سه دلیل دارد:
 *
 * ۱. **نسبت ۴:۵ را بومی می‌سازد.** Flux ارزان‌تر است ($0.020 در برابر
 *    $0.034) ولی فهرست نسبت‌هایش ۴:۵ ندارد و نزدیک‌ترینش ۳:۴ است —
 *    یعنی باید برش بزنیم و بخشی از کادری که مدل چیده را دور بریزیم.
 * ۲. **صحنه‌ای که می‌خواهیم عمداً ساده است.** یک عنصر کانونی، فضای
 *    منفی زیاد، بدون متن. آنچه مدل‌های گران‌تر بهتر می‌کنند —
 *    جزئیات انبوه و ترکیب‌بندی پیچیده — دقیقاً همان چیزی است که
 *    STYLE ممنوعش کرده. پول‌دادن برای پیچیدگی اینجا خروجی بدتر می‌دهد.
 * ۳. هزینه: **$0.0336 هر تصویر**. هفت کاور در هفته ≈ $0.24، سالانه
 *    ~$12. و چون تصویر در Storage می‌ماند، رندر دوباره صفر هزینه دارد.
 *
 * ⚠️ مدل فقط `1K` دارد. در ۴:۵ حدود ۹۰۰×۱۱۲۰ می‌دهد و بوم ما
 * ۱۰۸۰×۱۳۵۰ است — حدود ۲۰٪ بزرگ‌نمایی. زیر لایه‌ی تیره با عمق میدان
 * کم نامرئی است. اگر روزی بد بود، `google/gemini-3.1-flash-image` با
 * `resolution: "2K"` دقیقاً دو برابر قیمت است و بزرگ‌نمایی ندارد.
 */

const MODEL = "google/gemini-3.1-flash-lite-image";
const ENDPOINT = "https://openrouter.ai/api/v1/images";

/** سقف زمان یک فراخوانی — تولید تصویر کندتر از متن است */
const TIMEOUT_MS = 60_000;

/**
 * سبک، قفل‌شده در کد.
 *
 * ⚠️ فقط `{subject}` متغیر است. بقیه ثابت می‌ماند، به همان استدلال
 * `ROUTE_BRIEFING`: اگر سبک را هم مدل انتخاب کند، بعد از دو هفته
 * گرید پیج به هم می‌ریزد و هر کاور دنیای بصری خودش را دارد.
 *
 * چهار تصمیم که تصادفی نیستند:
 *
 * ۱. «upper half» و «nothing in the lower half» — بلوک متن با نسبت
 *    مرکز نوری حدود وسط قاب می‌نشیند و پایین‌تر می‌رود. عنصر کانونی
 *    آنجا، حتی زیر لایه‌ی تیره، با متن می‌جنگد.
 *
 * ۲. ممنوعیت متن با هفت واژه‌ی مختلف. کل معماری روی همین بند ایستاده:
 *    مدل‌های تصویرساز تیتر بزرگ فارسی را درست می‌نویسند ولی متن ریز و
 *    انبوه را خراب می‌کنند، پس **ما** متن را می‌نویسیم و آن‌ها فقط
 *    صحنه را می‌سازند. یک کلمه‌ی «no text» کافی نیست.
 *
 * ۳. ممنوعیت آیکونوگرافی مهاجرت — پرچم، پاسپورت، چمدان، هواپیما.
 *    برندگاید صریح گفته ادبیات فرار و نجات ممنوع است و مخاطب «از موضع
 *    جاه‌طلبی می‌آید، نه اضطرار». چمدان دقیقاً پیام مقابل را می‌دهد.
 *
 * ۴. ممنوعیت چهره‌ی قابل‌تشخیص. قاعده‌ی ۶ ادعاها: هیچ عکس یا جزئیات
 *    پرونده‌ی واقعی بدون اجازه. چهره‌ی تولیدشده واقعی نیست، ولی روی
 *    محتوای یک مشاور مهاجرتی به‌عنوان «مشتری» خوانده می‌شود.
 *
 * انگلیسی است چون مدل‌های تصویرساز با انگلیسی قابل‌اعتمادترند. این یک
 * پارامتر فنی است، نه متن برند — قاعده‌ی «پاسخ‌ها فارسی» شاملش نمی‌شود.
 */
const STYLE = `A single quiet photographic scene. {subject}

COMPOSITION
One focal subject only, placed off-centre in the upper half of the frame,
occupying no more than one third of the image. Everything else is empty.
Generous negative space. Nothing in the lower half but atmosphere.

LIGHT
Soft directional daylight, late afternoon. Gentle falloff. No harsh shadows,
no flash, no rim lighting, no lens flare.

DEPTH
Shallow depth of field. Background fully dissolved into smooth tone.

PALETTE
Deep desaturated blue-teal throughout, close to monochrome. Muted, cool,
low contrast. At most one restrained warm accent.

MOOD
Composed, credible, unhurried. Editorial photography, not advertising.
Understated. The image should feel like a pause, not a pitch.

ABSOLUTELY EXCLUDE
No text, letters, numbers, words, captions, signage, labels, watermarks,
logos, or brand marks anywhere in the frame.
No charts, graphs, diagrams, tables, UI, or screens.
No identifiable faces.
No flags, passports, boarding passes, aeroplanes, suitcases, landmarks,
or any migration iconography.
No collage, split frames, borders, or vignettes.
No 3D render, no illustration, no digital art — photographic only.

FORMAT
Vertical 4:5.`;

export function isImageGenConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export type ImageGenResult =
  | { status: "generated"; buffer: Buffer; costUsd: number | null }
  | { status: "skipped"; reason: "not-configured" | "no-subject" }
  | { status: "failed"; error: string };

/**
 * ساخت تصویر پس‌زمینه از یک صحنه‌ی فیزیکی.
 *
 * ⚠️ هیچ‌وقت throw نمی‌کند — union برمی‌گرداند، مثل `storage.ts`.
 * کاوری که تصویر ندارد هنوز کاملاً قابل استفاده است؛ همان پس‌زمینه‌ی
 * سرمه‌ای را می‌گیرد.
 */
export async function generateCoverImage(subject: string | undefined): Promise<ImageGenResult> {
  if (!isImageGenConfigured()) {
    console.log("[image-gen] OPENROUTER_API_KEY نیست — تولید تصویر رد شد");
    return { status: "skipped", reason: "not-configured" };
  }
  const clean = subject?.trim();
  if (!clean) return { status: "skipped", reason: "no-subject" };

  const prompt = STYLE.replace("{subject}", clean);
  const t0 = Date.now();

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/siavash-smf/fuwment-blog-agents",
        "X-Title": "Fuwment Blog Agents",
      },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        aspect_ratio: "4:5",
        n: 1,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      // ⚠️ پیام واقعی سرویس، نه «تولید ناموفق بود» — همان درسی که
      //    کلید غلط Tavily یک روز وقت گرفت.
      const detail = await res.text().catch(() => "");
      console.error(`[image-gen] ${res.status} ${res.statusText} — ${detail.slice(0, 300)}`);
      return { status: "failed", error: `${res.status}: ${detail.slice(0, 200)}` };
    }

    const json = (await res.json()) as {
      data?: { b64_json?: string; media_type?: string }[];
      usage?: { cost?: number };
    };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) {
      console.error(`[image-gen] پاسخ بدون تصویر: ${JSON.stringify(json).slice(0, 300)}`);
      return { status: "failed", error: "پاسخ سرویس تصویری نداشت" };
    }

    const buffer = Buffer.from(b64, "base64");
    const cost = json.usage?.cost ?? null;
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(
      `[image-gen] ${(buffer.length / 1024).toFixed(0)}KB در ${secs}s` +
        `${cost != null ? ` — $${cost.toFixed(4)}` : ""} — «${clean.slice(0, 50)}»`
    );

    return { status: "generated", buffer, costUsd: cost };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[image-gen] شکست: ${message}`);
    return { status: "failed", error: message };
  }
}
