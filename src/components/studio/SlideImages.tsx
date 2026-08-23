"use client";

import type { SocialPost } from "@/lib/store/types";

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

export function SlideImages({ post }: { post: SocialPost }) {
  if (post.imagePaths.length === 0) return null;

  return (
    <div
      className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3"
      role="list"
      aria-label="تصویرهای رندرشده‌ی کاروسل"
    >
      {post.imagePaths.map((path, i) => (
        <figure key={path} role="listitem" className="m-0 shrink-0 snap-center">
          <img
            src={imageUrl(path, post.renderedAt)}
            alt={`اسلاید ${(i + 1).toLocaleString("fa-IR")} از ${post.imagePaths.length.toLocaleString("fa-IR")}`}
            // نسبت ۴:۵ — همان بومِ slide-spec. صریح نوشته می‌شود تا
            // پیش از بارگذاری تصویر، چیدمان نپرد.
            width={1080}
            height={1350}
            loading="lazy"
            className="block w-[260px] rounded-xl2 border border-surface-line shadow-raised"
          />
        </figure>
      ))}
    </div>
  );
}
