import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getStore } from "@/lib/store";
import type { SocialPost } from "@/lib/store";
import { renderCarousel, renderStory } from "@/lib/slide-renderer";
import { generateCoverImage } from "@/lib/image-gen";

/**
 * تصویرهای اسلاید در Supabase Storage.
 *
 * ── چرا اینجا و نه در BlogStore ──
 *
 * قرارداد `BlogStore` الگوی Adapter است و دو پیاده‌سازی کامل دارد:
 * Supabase و حافظه. اگر آپلود فایل به آن interface اضافه شود،
 * `MemoryStore` هم باید پیاده‌اش کند — یا بایت‌ها را در یک Map نگه دارد
 * (نشتی حافظه در هر اجرا)، یا throw کند. آن‌وقت interface دروغ می‌گوید:
 * متدی دارد که یکی از دو پیاده‌سازی‌اش کار نمی‌کند.
 *
 * Adapter برای داده‌ی ساخت‌یافته است. فایل باینری نه schema دارد، نه
 * `partialToRow`، نه mapper. پس مثل `wordpress.ts` یک سرویس جداست.
 *
 * ── ساختار این فایل، مثل wordpress.ts ──
 *
 * پایین‌دست: آپلود و ساخت URL. بالادست: `renderSlidesForPost` که پست را
 * می‌خواند، رندر می‌گیرد، آپلود می‌کند و رکورد را به‌روز می‌کند.
 *
 * ── هیچ‌وقت throw نمی‌کند ──
 *
 * هر تابع عمومی یک union برمی‌گرداند. دلیلش قاعده‌ی معماری پروژه است:
 * کاروسلی که متنش سالم است و تصویرش ساخته نشده، هنوز کاملاً ارزشمند
 * است — می‌شود دوباره رندر گرفت. ولی اگر رندر اجرا را بکشد، پنج
 * فراخوانی مدل و کل متن از دست می‌رود.
 */

const BUCKET = "social-assets";

/**
 * کش یک سال.
 *
 * ⚠️ عمداً بلند است، برخلاف پیش‌فرض ۳۶۰۰ ثانیه‌ی Supabase. فایل‌ها با
 * upsert روی **مسیر ثابت** می‌نشینند تا فایل یتیم انباشته نشود، و
 * تازگی از راه `?v={renderedAt}` در URL نمایش تأمین می‌شود — نه از راه
 * کوتاه‌کردن کش. اگر کش کوتاه بود، هر بار باز کردن استودیو یعنی دانلود
 * دوباره‌ی چند مگابایت تصویری که عوض نشده.
 */
const CACHE_SECONDS = 31_536_000;

export function isStorageConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function client() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/**
 * مسیر فایل یک اسلاید.
 *
 * ⚠️ عمداً ASCII خالص. مسیر فارسی کار می‌کند ولی در URL به
 * `%D9%86%…` تبدیل می‌شود و کپی‌کردن دستی‌اش کابوس است.
 */
export function slidePath(socialPostId: string, index: number): string {
  return `${socialPostId}/${index}.png`;
}

/**
 * مسیر تصویر خامِ پس‌زمینه‌ی کاور.
 *
 * ⚠️ جدا از اسلایدهای رندرشده ذخیره می‌شود تا **رندر دوباره فراخوانی
 * جدید نزند**. هر تولید ~$0.034 است؛ رندر دوباره باید رایگان بماند.
 * پیشوند `bg-` تا با `0.png` تا `7.png` قاطی نشود.
 */
export function coverImagePath(socialPostId: string): string {
  return `${socialPostId}/bg-cover.png`;
}

/**
 * URL عمومی یک تصویر.
 *
 * bucket عمداً عمومی است (دلیلش در CLAUDE.md بخش امنیت)، پس این فقط
 * یک الحاق رشته است — بدون انقضا و بدون هیچ فراخوانی شبکه‌ای. لینک
 * امضاشده انقضا دارد و اصلاً در ستون ذخیره‌شدنی نیست.
 *
 * `version` کلید کش را عوض می‌کند بی‌آنکه مسیر ذخیره‌سازی عوض شود.
 */
export function publicUrlFor(path: string, version?: string | null): string {
  const { data } = client().storage.from(BUCKET).getPublicUrl(path);
  return version ? `${data.publicUrl}?v=${encodeURIComponent(version)}` : data.publicUrl;
}

/* ── سطح بالا: رندر یک پست ──────────────────────────────── */

export type RenderResult =
  | { status: "rendered"; count: number; renderedAt: string }
  | { status: "skipped"; reason: "not-configured" | "not-a-carousel" | "no-slides" }
  | { status: "failed"; error: string };

/**
 * رندر و آپلود تصویرهای یک محتوای اجتماعی، و به‌روزرسانی رکوردش.
 *
 * ⚠️ محافظ «قبلاً رندر شده» عمداً **ندارد** — برخلاف
 * `syncPostToWordPress` که `already-sent` دارد. آنجا ارسال دوم یعنی
 * پست تکراری در وردپرسِ عمومی؛ اینجا رندر دوباره بی‌ضرر است و اصلاً
 * هدفِ دکمه‌ی «رندر دوباره» همین است.
 */
export async function renderSlidesForPost(socialPostId: string): Promise<RenderResult> {
  if (!isStorageConfigured()) {
    console.log("[storage] Supabase تنظیم نشده — رندر رد شد");
    return { status: "skipped", reason: "not-configured" };
  }

  try {
    const store = getStore();
    const post = await store.getSocialPost(socialPostId);
    if (!post) return { status: "failed", error: `محتوای ${socialPostId} پیدا نشد` };
    // ⚠️ استوری مسیر جداست (پایین‌تر) — کاروسل زیر همین تابع، دست‌نخورده.
    // ⚠️ `await` عمداً است: بدونش throwِ داخلِ renderStoryPost از این
    //    catch رد می‌شد و رندرِ استوری دیگر «هیچ‌وقت throw نمی‌کند» نبود.
    if (post.format === "story") return await renderStoryPost(post);
    if (post.format !== "carousel") return { status: "skipped", reason: "not-a-carousel" };
    if (post.slides.length === 0) return { status: "skipped", reason: "no-slides" };

    const t0 = Date.now();

    /**
     * تصویر پس‌زمینه‌ی کاور — اول از Storage، بعد از سرویس.
     *
     * ⚠️ ترتیب مهم است: اگر تصویر از قبل ساخته شده، رندر دوباره نباید
     * دوباره پول خرج کند. فقط وقتی تولید می‌شود که واقعاً نباشد.
     *
     * شکستِ هر مرحله بی‌ضرر است: کاور همان پس‌زمینه‌ی سرمه‌ای را
     * می‌گیرد و بقیه‌ی کاروسل دست‌نخورده ساخته می‌شود.
     */
    const sbEarly = client();
    const bgPath = coverImagePath(socialPostId);
    let backgroundImage: Buffer | undefined;

    const cached = await sbEarly.storage.from(BUCKET).download(bgPath);
    if (cached.data) {
      backgroundImage = Buffer.from(await cached.data.arrayBuffer());
      console.log(`[storage] تصویر کاور از قبل موجود بود — بدون فراخوانی جدید`);
    } else {
      const gen = await generateCoverImage(post.slides[0]?.imageSubject);
      if (gen.status === "generated") {
        backgroundImage = gen.buffer;
        const up = await sbEarly.storage.from(BUCKET).upload(bgPath, gen.buffer, {
          contentType: "image/png",
          cacheControl: String(CACHE_SECONDS),
          upsert: true,
        });
        if (up.error) {
          // تصویر ساخته شد ولی ذخیره نشد — این بار استفاده می‌شود،
          // دفعه‌ی بعد دوباره تولید می‌شود. بی‌صدا نگذاریمش.
          console.error(`[storage] ذخیره‌ی تصویر کاور شکست: ${up.error.message}`);
        }
      }
    }

    const buffers = await renderCarousel(post.slides, {
      language: post.language ?? "fa",
      backgroundImage,
    });

    const sb = client();
    const paths: string[] = [];
    for (const [i, buf] of buffers.entries()) {
      const path = slidePath(socialPostId, i);
      const { error } = await sb.storage.from(BUCKET).upload(path, buf, {
        contentType: "image/png",
        cacheControl: String(CACHE_SECONDS),
        // مسیر ثابت + upsert = بدون فایل یتیم. تازگی با ?v= تأمین می‌شود.
        upsert: true,
      });
      if (error) {
        // ⚠️ پیام واقعی سرویس، نه «آپلود ناموفق بود». همان درسی که
        //    کلید غلط Tavily یک روز وقت گرفت.
        console.error(`[storage] آپلود ${path} شکست: ${error.message}`);
        return { status: "failed", error: `آپلود اسلاید ${i + 1}: ${error.message}` };
      }
      paths.push(path);
    }

    const renderedAt = new Date().toISOString();
    await store.updateSocialPost(socialPostId, { imagePaths: paths, renderedAt });

    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    const kb = Math.round(buffers.reduce((a, b) => a + b.length, 0) / 1024);
    console.log(`[storage] ${paths.length} تصویر در ${secs}s — ${kb}KB — ${socialPostId}`);

    return { status: "rendered", count: paths.length, renderedAt };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[storage] رندر ${socialPostId} شکست: ${message}`);
    return { status: "failed", error: message };
  }
}

/* ── سطح بالا: رندر یک ستِ استوری (Stage ۲) ─────────────────── */

/**
 * آیا فریمِ اول یک imageSubjectِ قابل‌استفاده دارد؟
 *
 * صادرشده تا بدونِ اتصالِ واقعی به Supabase قابلِ تست باشد — این چک باید
 * **پیش از هر فراخوانیِ شبکه‌ای** اجرا شود (الزامِ صریحِ Stage ۲: نبودِ
 * imageSubjectِ فریمِ صفر باید بلند شکست بخورد، نه یک تصویرِ عمومی بسازد).
 */
export function hasFrame0ImageSubject(post: Pick<SocialPost, "slides">): boolean {
  return Boolean(post.slides[0]?.imageSubject?.trim());
}

/**
 * رندر و آپلودِ فریم‌های یک ستِ استوری.
 *
 * ⚠️ فقط از `renderSlidesForPost` صدا زده می‌شود، بعد از تأییدِ
 * `format === "story"` — کاروسل هیچ‌وقت به این تابع نمی‌رسد و مسیرِ
 * بالا کاملاً دست‌نخورده می‌ماند.
 *
 * ⚠️ Stage ۱ با چکِ مسدودکننده‌ی `runStoryChecks` از قبل تضمین کرده که
 * فریمِ صفر imageSubject دارد، ولی رندرکننده نباید کورکورانه به تضمینِ
 * یک لایه‌ی بالادست تکیه کند — این محافظ اینجا هم هست، **قبل از** هر
 * فراخوانیِ Storage یا تولیدِ تصویر.
 */
async function renderStoryPost(post: SocialPost): Promise<RenderResult> {
  const frame0Subject = post.slides[0]?.imageSubject?.trim();
  if (!frame0Subject) {
    const message = "فریمِ اولِ استوری imageSubject ندارد — رندر متوقف شد";
    console.error(`[story-render] ${message} (${post.id})`);
    return { status: "failed", error: message };
  }

  const t0 = Date.now();
  const store = getStore();

  /**
   * تصویرِ پس‌زمینه‌ی فریمِ اول — همان الگوی کاروسل: اول از Storage،
   * بعد از سرویس. همان قراردادِ مسیرِ `{postId}/bg-cover.png` — postId
   * اینجا شناسه‌ی SocialPostِ **استوری** است، پس با کاورِ کاروسلِ مبدأ
   * (که شناسه‌ی جدایی دارد) هیچ‌وقت تصادف نمی‌کند.
   */
  const sbEarly = client();
  const bgPath = coverImagePath(post.id);
  let backgroundImage: Buffer | undefined;

  const cached = await sbEarly.storage.from(BUCKET).download(bgPath);
  if (cached.data) {
    backgroundImage = Buffer.from(await cached.data.arrayBuffer());
    console.log(`[storage] تصویرِ استوری از قبل موجود بود — بدون فراخوانی جدید`);
  } else {
    const gen = await generateCoverImage(frame0Subject, { frame: "story" });
    if (gen.status === "generated") {
      backgroundImage = gen.buffer;
      const up = await sbEarly.storage.from(BUCKET).upload(bgPath, gen.buffer, {
        contentType: "image/png",
        cacheControl: String(CACHE_SECONDS),
        upsert: true,
      });
      if (up.error) {
        console.error(`[storage] ذخیره‌ی تصویرِ استوری شکست: ${up.error.message}`);
      }
    }
    // شکستِ تولید (failed/skipped) کشنده نیست — همان قاعده‌ی کاروسل: فریمِ
    // اول بدونِ تصویر هنوز کاملاً قابلِ استفاده است، فقط پس‌زمینه‌ی سرمه‌ای می‌گیرد.
  }

  const stickerFrames = new Set<number>((post.extras.stickers ?? []).map((s) => s.frame));

  const buffers = await renderStory(post.slides, {
    language: post.language ?? "fa",
    backgroundImage,
    stickerFrames,
  });

  const sb = client();
  const paths: string[] = [];
  for (const [i, buf] of buffers.entries()) {
    const path = slidePath(post.id, i);
    const { error } = await sb.storage.from(BUCKET).upload(path, buf, {
      contentType: "image/png",
      cacheControl: String(CACHE_SECONDS),
      upsert: true,
    });
    if (error) {
      console.error(`[storage] آپلود ${path} شکست: ${error.message}`);
      return { status: "failed", error: `آپلودِ فریمِ ${i + 1}: ${error.message}` };
    }
    paths.push(path);
  }

  const renderedAt = new Date().toISOString();
  await store.updateSocialPost(post.id, { imagePaths: paths, renderedAt });

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const kb = Math.round(buffers.reduce((a, b) => a + b.length, 0) / 1024);
  console.log(`[storage] ${paths.length} فریمِ استوری در ${secs}s — ${kb}KB — ${post.id}`);

  return { status: "rendered", count: paths.length, renderedAt };
}
