import "server-only";
import { marked } from "marked";
import { getStore, type Post } from "@/lib/store";

/**
 * انتقال مقاله‌ها به وردپرس — به‌عنوان پیش‌نویس.
 *
 * بلاگ عمومی فومنت روی وردپرس است و این پروژه فقط تولیدکننده‌ی محتواست.
 * این ماژول پل بین آن دو است: مقاله‌ی تأییدشده را به REST API وردپرس
 * می‌فرستد تا فقط بازبینی و انتشار نهایی دستی بماند.
 *
 * دو لایه دارد و عمداً از هم جدا نگه داشته شده‌اند:
 * - لایه‌ی حمل (createWordPressDraft و کمکی‌هایش): خالص، بدون store،
 *   قابل تست مستقل.
 * - لایه‌ی همگام‌سازی (syncPostToWordPress): پست را می‌خواند، می‌فرستد،
 *   شناسه‌ها را ذخیره می‌کند. هر سه نقطه‌ی فراخوان از همین یکی استفاده
 *   می‌کنند تا منطق «تکراری نفرست» یک‌جا بماند.
 */

/* ── پیکربندی ────────────────────────────────────────────── */

function config() {
  return {
    url: process.env.WORDPRESS_URL?.trim().replace(/\/+$/, "") ?? "",
    user: process.env.WORDPRESS_USER?.trim() ?? "",
    // ⚠️ فقط trim — فاصله‌های *داخلی* دست نمی‌خورند.
    // وردپرس رمز اپلیکیشن را با فاصله نشان می‌دهد («xxxx xxxx …») و با
    // آزمایش مستقیم API تأیید شد که هر دو شکل (با و بدون فاصله) کار
    // می‌کنند. پس نرمال‌سازی‌اش سود ندارد و فقط یک جای خرابی اضافه است.
    pass: process.env.WORDPRESS_APP_PASSWORD?.trim() ?? "",
    categoryId: process.env.WORDPRESS_CATEGORY_ID?.trim() ?? "",
  };
}

/** آیا هر سه متغیر اجباری موجودند؟ (دسته اختیاری است) */
export function isWordPressConfigured(): boolean {
  const c = config();
  return Boolean(c.url && c.user && c.pass);
}

/** لینک ویرایش پست در پیشخوان وردپرس */
export function wpEditLink(id: number): string {
  return `${config().url}/wp-admin/post.php?post=${id}&action=edit`;
}

/**
 * شناسه‌ی دسته‌ی پیکربندی‌شده، یا null.
 *
 * مقدار نامعتبر فقط لاگ می‌شود و نادیده گرفته می‌شود — یک متغیر اختیاری
 * نباید بتواند کل قابلیت را از کار بیندازد. بدون آن، وردپرس دسته‌ی
 * پیش‌فرض خودش (معمولاً Uncategorized) را می‌گذارد.
 */
function categoryId(): number | null {
  const raw = config().categoryId;
  if (!raw) return null;

  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    console.error(
      `[wordpress] WORDPRESS_CATEGORY_ID نامعتبر است: «${raw}» — نادیده گرفته شد و پست دسته‌ی پیش‌فرض می‌گیرد`
    );
    return null;
  }
  return n;
}

/* ── تبدیل مارک‌داون به HTML ──────────────────────────────── */

/**
 * مارک‌داون مقاله → HTML آماده‌ی وردپرس.
 *
 * ⚠️ پوشش `dir="rtl"` اختیاری نیست.
 * قالب سایت `lang="en-US"` است و هیچ `dir="rtl"` روی صفحه نمی‌گذارد (با
 * گرفتن HTML صفحه‌ی اصلی تأیید شد). بدون این پوشش، کل مقاله‌ی فارسی
 * چپ‌چین رندر می‌شود. گذاشتنش روی خودِ محتوا یعنی مستقل از قالب کار
 * می‌کند و اگر بعداً قالب را RTL کردید هم چیزی نمی‌شکند.
 *
 * `async: false` خروجی را به رشته‌ی همزمان قطعی می‌کند — هیچ افزونه‌ی
 * async‌ای در پروژه ثبت نشده. همان کاری که CampaignPanel می‌کند.
 */
export function markdownToWpHtml(md: string): string {
  const html = marked.parse(md, { async: false });
  return `<div dir="rtl" lang="fa">\n${html}\n</div>`;
}

/* ── لایه‌ی حمل ───────────────────────────────────────────── */

export type WpCreateResult =
  | { ok: true; id: number; editLink: string }
  | { ok: false; error: string };

/**
 * ساخت پیش‌نویس در وردپرس.
 *
 * ⚠️ قاعده‌ی سخت: خروجی همیشه «پیش‌نویس» است، هرگز منتشرشده.
 *
 * این تابع عمداً پارامتر `status` نمی‌گیرد. حساب متصل، administrator است
 * و `publish_posts: true` دارد (با فراخوانی users/me تأیید شد) — یعنی
 * وردپرس با کمال میل منتشر می‌کند اگر مقدار اشتباهی برود. نبودِ پارامتر،
 * تنها چیزی است که انتشار تصادفی را *ساختاراً* غیرممکن می‌کند؛ پیش‌فرضِ
 * قابل‌تغییر این تضمین را نمی‌داد.
 * اگر روزی کسی خواست این را پارامتری کند: نکنید. انتشار تصمیم انسان است.
 *
 * هرگز throw نمی‌کند — همان قرارداد tavilySearch. شکست انتقال نباید
 * پایپ‌لاین یا تأیید پست را بشکند.
 */
export async function createWordPressDraft(input: {
  title: string;
  contentHtml: string;
  slug: string;
  excerpt: string;
}): Promise<WpCreateResult> {
  const c = config();
  const auth = Buffer.from(`${c.user}:${c.pass}`).toString("base64");
  const cat = categoryId();

  const body: Record<string, unknown> = {
    title: input.title,
    content: input.contentHtml,
    slug: input.slug,
    excerpt: input.excerpt,
    status: "draft", // ← ثابت. توضیحش بالای تابع.
    ...(cat ? { categories: [cat] } : {}),
  };

  try {
    const res = await fetch(`${c.url}/wp-json/wp/v2/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await res.text();

    if (!res.ok) {
      // پیام واقعی وردپرس را بیرون می‌کشیم. «۴۰۱» به‌تنهایی نمی‌گوید چرا —
      // دقیقاً همان درسی که با Tavily گرفتیم و یک روز وقت برد.
      let detail = text.slice(0, 300);
      try {
        const e = JSON.parse(text);
        detail = `${e.code ?? "?"} — ${e.message ?? text.slice(0, 200)}`;
      } catch {
        /* پاسخ JSON نبود؛ همان متن خام را نگه می‌داریم */
      }
      console.error(`[wordpress] ${res.status} ${res.statusText} — ${detail}`);
      return { ok: false, error: `${res.status}: ${detail}` };
    }

    const data = JSON.parse(text);
    const id = Number(data?.id);
    if (!Number.isInteger(id) || id <= 0) {
      console.error(`[wordpress] پاسخ ۲۰۰ بود ولی id معتبر نداشت: ${text.slice(0, 200)}`);
      return { ok: false, error: "پاسخ وردپرس شناسه‌ی پست نداشت" };
    }

    // ⚠️ وضعیت پاسخ را چک می‌کنیم، نه چیزی که فرستادیم. اگر افزونه‌ای در
    // وردپرس وضعیت را عوض کند، باید بدانیم — سکوت اینجا یعنی انتشار ناخواسته.
    if (data.status !== "draft") {
      console.error(
        `[wordpress] ⚠️ پست ${id} با وضعیت «${data.status}» ساخته شد، نه draft — در وردپرس بررسی کنید`
      );
    }

    console.log(
      `[wordpress] پیش‌نویس ${id} ساخته شد${cat ? ` (دسته ${cat})` : " (دسته‌ی پیش‌فرض)"} — ${data.link ?? ""}`
    );
    return { ok: true, id, editLink: wpEditLink(id) };
  } catch (err) {
    // خطای شبکه یا JSON خراب
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[wordpress] فراخوانی شکست خورد: ${message}`);
    return { ok: false, error: message };
  }
}

/* ── لایه‌ی همگام‌سازی ────────────────────────────────────── */

export type WpSyncResult =
  | { status: "sent"; wpPostId: number; editLink: string }
  | { status: "skipped"; reason: "not-configured" | "already-sent"; editLink?: string }
  | { status: "failed"; error: string };

/**
 * یک پست را به وردپرس بفرست و شناسه‌هایش را ذخیره کن.
 *
 * تنها نقطه‌ای که «تکراری نفرست» را می‌داند. هر سه فراخوان (پایپ‌لاین،
 * تأیید انسانی، تلاش مجدد) از همین می‌گذرند تا این قاعده در سه جا کپی نشود.
 */
export async function syncPostToWordPress(postId: string): Promise<WpSyncResult> {
  if (!isWordPressConfigured()) {
    return { status: "skipped", reason: "not-configured" };
  }

  const store = getStore();
  const post: Post | null = await store.getPost(postId);
  if (!post) return { status: "failed", error: "پست پیدا نشد" };

  // محافظ اصلی در برابر پست تکراری در وردپرس
  if (post.wpPostId) {
    return {
      status: "skipped",
      reason: "already-sent",
      editLink: post.wpEditLink ?? wpEditLink(post.wpPostId),
    };
  }

  const result = await createWordPressDraft({
    title: post.title,
    contentHtml: markdownToWpHtml(post.contentMd),
    slug: post.slug,
    excerpt: post.excerpt,
  });

  if (!result.ok) return { status: "failed", error: result.error };

  await store.updatePost(post.id, {
    wpPostId: result.id,
    wpEditLink: result.editLink,
  });

  return { status: "sent", wpPostId: result.id, editLink: result.editLink };
}
