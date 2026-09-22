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
 * شش تصمیم که تصادفی نیستند:
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
 *    **این ممنوعیت با بند ۵ عوض نشد** — جدا و مستقل باقی می‌ماند.
 *
 * ۴. ممنوعیت چهره‌ی قابل‌تشخیص. قاعده‌ی ۶ ادعاها: هیچ عکس یا جزئیات
 *    پرونده‌ی واقعی بدون اجازه. چهره‌ی تولیدشده واقعی نیست، ولی روی
 *    محتوای یک مشاور مهاجرتی به‌عنوان «مشتری» خوانده می‌شود.
 *
 * ۵. بند «BRITISH CONTEXT» (۱۴۰۵-۰۶-۰۳ اضافه شد) — قبل از این، صحنه‌ها
 *    مکانی خنثی بودند: کابل، صندلی، بوم نقاشی، همه جای دنیا همین‌شکل‌اند.
 *    راه‌حل **نمادهای توریستی نیست** (باکس تلفن قرمز، تاکسی سیاه، دوطبقه،
 *    بیگ‌بن) — آن‌ها همان‌قدر کلیشه‌اند که پرچم/پاسپورت، فقط از نوع دیگر.
 *
 * ۶. به‌همین‌خاطر بند DEPTH نرم شد: «fully dissolved» یعنی هیچ بافت
 *    معماری‌ای زنده نمی‌ماند تا بند ۵ اصلاً چیزی برای نشان‌دادن نداشته
 *    باشد. عمق میدان کم می‌ماند (فضای منفی و تمرکز روی عنصر کانونی هنوز
 *    لازم است) ولی پس‌زمینه دیگر به گرادیان صاف تقلیل نمی‌رود.
 *
 * ۷. **اصلاح (۱۴۰۵-۰۶-۰۴):** نسخه‌ی اول بند ۵ («aged red brick»، «worn
 *    wooden floorboards»، «a stone corridor») به همراه DEPTH نرم‌شده،
 *    مدل را به‌جای «بریتانیای امروزی» به سمت «دانشگاه ویکتوریایی/گوتیک،
 *    ساختمان کهنه، فضای عتیقه» برد — دقیقاً با داده‌ی واقعی دیده شد (پله‌ی
 *    سنگیِ راهروی گوتیک). صفت‌های سن‌دار (`aged`/`worn`/`stone corridor`)
 *    حذف و با معادل معاصر جایگزین شدند (`red-brick detailing`، `natural
 *    wood flooring`، `clean institutional corridor`)، و یک بند ممنوعیت
 *    صریح («No castles, no Gothic or Victorian-heavy architecture, …»)
 *    به EXCLUDE اضافه شد. **ممنوعیت آیکونوگرافی مهاجرتِ بند ۳ در این
 *    اصلاح دست‌نخورده ماند** — آن قاعده مستقل است و ربطی به مسئله‌ی
 *    heritage-bias ندارد.
 *
 * انگلیسی است چون مدل‌های تصویرساز با انگلیسی قابل‌اعتمادترند. این یک
 * پارامتر فنی است، نه متن برند — قاعده‌ی «پاسخ‌ها فارسی» شاملش نمی‌شود.
 *
 * ── Stage ۲: بندِ COMPOSITION/FORMAT برای استوری ──
 *
 * فقط این دو بند بین کاروسل و استوری فرق دارند؛ LIGHT، BRITISH CONTEXT،
 * DEPTH، PALETTE، MOOD و ABSOLUTELY EXCLUDE کاراکتربه‌کاراکتر مشترک‌اند.
 * دلیلِ کاروسل «بالای قاب» و استوری «۵۵ تا ۷۰٪ پایین‌تر»: بلوکِ متنِ
 * کاروسل حدودِ وسط می‌نشیند و پایین‌تر می‌رود، ولی بلوکِ استوری برای
 * نقشِ hook از **بالا** لنگر می‌شود (`storyBlockAlignFor`) — پس تصویر
 * باید پایینِ قاب بنشیند تا با متن نجنگد. باندِ ۵۵–۷۰٪ روی بومِ
 * ۱۹۲۰ یعنی y∈[۱۰۵۶,۱۳۴۴]، کاملاً بالاترِ مرزِ رزروِ استیکر (۱۴۱۰) —
 * تصادفِ هندسی از طراحی حذف است، Stage ۳ فقط تأییدِ چشمی می‌کند.
 */
const COMPOSITION_CAROUSEL = `One focal subject only, placed off-centre in the upper half of the frame,
occupying no more than one third of the image. Everything else is empty.
Generous negative space. Nothing in the lower half but atmosphere.`;

const COMPOSITION_STORY = `One focal subject only, placed in the lower-middle band of the frame —
roughly between 55% and 70% of the way down — occupying no more than one
third of the image. The bottom quarter of the frame must stay visually
quiet: atmosphere and falloff only, no focal object, no face, no key
visual element there. The upper half stays open for text.`;

const FORMAT_CAROUSEL = `Vertical 4:5.`;
const FORMAT_STORY = `Vertical 9:16.`;

/** ساخت پرامپتِ نهایی — فقط COMPOSITION و FORMAT با قالب عوض می‌شوند */
function styleFor(subject: string, frame: "carousel" | "story"): string {
  const composition = frame === "story" ? COMPOSITION_STORY : COMPOSITION_CAROUSEL;
  const format = frame === "story" ? FORMAT_STORY : FORMAT_CAROUSEL;
  return STYLE_TEMPLATE.replace("{subject}", subject)
    .replace("{composition}", composition)
    .replace("{format}", format);
}

const STYLE_TEMPLATE = `A single quiet photographic scene. {subject}

COMPOSITION
{composition}

LIGHT
Soft, directional daylight — bright overcast or gentle indirect daylight,
cool-neutral with a restrained grey-blue tint. Gentle falloff, low contrast,
no harsh shadows, no flash, no rim lighting, no lens flare. The exposure
stays bright, clean, and contemporary-editorial — never dim, muddy,
sepia-toned, or nostalgic.

BRITISH CONTEXT
The setting is subtly, contemporarily British — background atmosphere only,
never the subject. Draw from modern, lived-in environments: a contemporary
university space, a modern study room, a university library, a research
lab, a professional workspace, a clean institutional corridor, a
contemporary residential interior. Keep material cues light and current:
white or lightly textured plaster, restrained red-brick detailing (not
weathered or aged), sash-window proportions where they fit naturally,
natural wood flooring, a paved campus or urban path. Where it suits the
composition, one secondary cue may suggest quiet progress — a modern
half-open door, a clean staircase, a corridor line, a window onto another
space — kept strictly secondary, never symbolic. When a choice exists,
prefer a bright contemporary interior or professional/academic environment
over an exterior architectural scene. The result should feel current and
lived-in, not preserved, grand, or historic.

DEPTH
Shallow depth of field around the focal subject, with strong separation and
generous negative space. The background is softly legible, not fully
erased — enough shape and material should survive (a wall, a window's
proportions, a corridor line) for the British setting to register, but it
stays secondary and never becomes sharp enough to compete with the focal
subject.

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
No red telephone boxes, black cabs, double-decker buses, Big Ben, or any
other postcard/tourist iconography of Britain.
No castles, no Gothic or Victorian-heavy architecture, no grand historic
university façade as the hero image, no visibly old or decaying buildings,
no antique furniture, no dark-wood heritage interiors, no rustic interiors,
no weathered or crumbling masonry as the dominant element.
No sepia or nostalgic colour grading, no period-drama atmosphere, no
historic-postcard aesthetic.
No collage, split frames, borders, or vignettes.
No 3D render, no illustration, no digital art — photographic only.

FORMAT
{format}`;

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
 *
 * ⚠️ `opts.frame` پیش‌فرضش `"carousel"` است — یعنی هر فراخوانیِ موجود
 * (بدونِ آرگومانِ دوم) رفتارِ عیناً قبلی را می‌گیرد. فقط `story-orchestrator`
 * (از طریقِ `storage.ts`) صریحاً `{ frame: "story" }` می‌فرستد.
 */
export async function generateCoverImage(
  subject: string | undefined,
  opts?: { frame?: "carousel" | "story" }
): Promise<ImageGenResult> {
  if (!isImageGenConfigured()) {
    console.log("[image-gen] OPENROUTER_API_KEY نیست — تولید تصویر رد شد");
    return { status: "skipped", reason: "not-configured" };
  }
  const clean = subject?.trim();
  if (!clean) return { status: "skipped", reason: "no-subject" };

  const frame = opts?.frame ?? "carousel";
  const prompt = styleFor(clean, frame);
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
        aspect_ratio: frame === "story" ? "9:16" : "4:5",
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
