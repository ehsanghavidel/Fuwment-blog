"use client";

import { useState } from "react";
import type { SocialPost } from "@/lib/store/types";
import { studioFetch } from "./api";
import { IconAlert, IconDownload, IconEye, IconSpinner } from "@/components/ui/icons";

/**
 * تصویرهای رندرشده‌ی کاروسل — همان PNGهایی که منتشر می‌شوند.
 *
 * ⚠️ چرا این و نه `CarouselPreview`: پیش‌نمایش CSS حتی با `slide-spec`
 * مشترک یک **تقریب** است. مقادیر یکی‌اند، ولی شکست خط را دو موتور
 * متفاوت انجام می‌دهند — مرورگر با موتور متن خودش، رندرکننده با
 * `measureText` اسکیا. هیچ تضمینی نیست تیتری که در canvas دو خط شده،
 * در مرورگر هم دو خط شود.
 *
 * پس وقتی PNG هست، همان را نشان می‌دهیم: دقیقاً چیزی که به اینستاگرام
 * می‌رود. `SocialPostCard` بین این دو **fallback** می‌کند، نه toggle —
 * قبل از رندر و در صورت شکست، CSS سر جایش است.
 */

/**
 * URL عمومی، با کلید نسخه.
 *
 * ⚠️ `?v=` اختیاری نیست. فایل‌ها با upsert روی مسیر **ثابت** می‌نشینند
 * و کششان یک‌ساله است، پس بدون این پارامتر «رندر دوباره» تا مدت‌ها
 * تصویر قدیمی نشان می‌داد و کاربر فکر می‌کرد دکمه کار نکرده.
 *
 * ساخته‌شدنش سمت کلاینت است چون bucket عمومی است و URL فقط یک الحاق
 * رشته است — نه امضا، نه فراخوانی، نه انقضا.
 */
function imageUrl(path: string, renderedAt: string | null): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const url = `${base}/storage/v1/object/public/social-assets/${path}`;
  return renderedAt ? `${url}?v=${encodeURIComponent(renderedAt)}` : url;
}

/**
 * ابعادِ واقعیِ بومِ رندرشده — قالب‌آگاه.
 *
 * ⚠️ کاروسل ۴:۵ (۱۰۸۰×۱۳۵۰، از `slide-spec.CANVAS`)، استوری ۹:۱۶
 * (۱۰۸۰×۱۹۲۰، از `story-spec.STORY_CANVAS`). فقط ویژگی‌های HTMLِ
 * width/height عوض می‌شوند — کلاسِ CSS (`w-[260px]`) عرضِ چیپ را ثابت
 * نگه می‌دارد و مرورگر با همین دو ویژگی نسبتِ درست را حفظ می‌کند، بدونِ
 * برش یا کش‌شدن به ۴:۵.
 */
function dimsFor(format: SocialPost["format"]): { width: number; height: number } {
  return format === "story" ? { width: 1080, height: 1920 } : { width: 1080, height: 1350 };
}

/**
 * نام فایل از هدر Content-Disposition — همان نامی که سرور قطعی ساخته.
 * اگر نبود (نباید پیش بیاید)، یک نام امن محلی.
 */
function filenameFrom(res: Response, fallback: string): string {
  const cd = res.headers.get("content-disposition") ?? "";
  const m = cd.match(/filename="([^"]+)"/);
  return m ? m[1] : fallback;
}

/**
 * دانلودِ یک اسلاید از مسیرِ هم‌مبدأِ محافظت‌شده.
 *
 * ⚠️ چرا fetch + blob و نه `<a download href="/api/…">` سرراست: آن فقط
 * کوکیِ نشست را می‌فرستد. اگر اپراتور با فرمِ رمزِ خودِ استودیو وارد شده
 * باشد (هدر `x-studio-password` از localStorage)، لینکِ ساده ۴۰۱ می‌گرفت.
 * `studioFetch` هر دو راهِ احراز را می‌برد، و blobِ هم‌مبدأ دانلودش در
 * همه‌ی مرورگرها قابل‌اتکاست.
 */
async function downloadSlide(postId: string, index: number): Promise<void> {
  const res = await studioFetch(`/api/social/posts/${postId}/assets/${index}`);
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `خطای ${res.status}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filenameFrom(res, `slide-${index + 1}.png`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // یک تیک صبر تا مرورگر دانلود را شروع کرده باشد
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function SlideImages({ post }: { post: SocialPost }) {
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<{ index: number; message: string } | null>(null);

  if (post.imagePaths.length === 0) return null;
  const dims = dimsFor(post.format);
  const isStory = post.format === "story";
  const label = isStory ? "تصویرهای رندرشده‌ی استوری" : "تصویرهای رندرشده‌ی کاروسل";
  const unit = isStory ? "فریم" : "اسلاید";
  const total = post.imagePaths.length.toLocaleString("fa-IR");

  async function onDownload(index: number) {
    setBusy(index);
    setError(null);
    try {
      await downloadSlide(post.id, index);
    } catch (e) {
      const message =
        e instanceof Error && e.message === "PASSWORD_REQUIRED"
          ? "رمز استودیو لازم است — صفحه را دوباره باز کنید."
          : e instanceof Error
            ? e.message
            : String(e);
      setError({ index, message });
    } finally {
      setBusy(null);
    }
  }

  const btn =
    "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-surface-line px-2.5 py-1.5 text-xs font-medium text-ink transition-colors hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div
      className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3"
      role="list"
      aria-label={label}
    >
      {post.imagePaths.map((path, i) => {
        // تصویرِ کامل، با همان کلید نسخه‌ی پیش‌نمایش — «باز کردن» بعد از
        // رندر دوباره هم نسخه‌ی تازه را نشان می‌دهد، نه کشِ یک‌ساله را.
        const src = imageUrl(path, post.renderedAt);
        const n = (i + 1).toLocaleString("fa-IR");
        return (
          <figure key={path} role="listitem" className="m-0 w-[260px] shrink-0 snap-center">
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              title="باز کردن تصویر در اندازه‌ی کامل"
              className="block cursor-zoom-in"
            >
              <img
                src={src}
                alt={`${unit} ${n} از ${total}`}
                width={dims.width}
                height={dims.height}
                loading="lazy"
                className="block w-[260px] rounded-xl2 border border-surface-line shadow-raised"
              />
            </a>
            <figcaption className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="me-1 text-xs font-bold text-ink-muted">
                {unit} {n}
              </span>
              <a href={src} target="_blank" rel="noopener noreferrer" className={btn}>
                <IconEye className="h-3.5 w-3.5" />
                باز کردن تصویر
              </a>
              <button
                type="button"
                onClick={() => onDownload(i)}
                disabled={busy !== null}
                className={btn}
              >
                {busy === i ? (
                  <IconSpinner className="h-3.5 w-3.5" />
                ) : (
                  <IconDownload className="h-3.5 w-3.5" />
                )}
                دانلود PNG
              </button>
            </figcaption>
            {error?.index === i && (
              <p
                role="alert"
                className="mt-1.5 flex items-start gap-1 text-xs leading-5 text-danger"
              >
                <IconAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {error.message}
              </p>
            )}
          </figure>
        );
      })}
    </div>
  );
}
