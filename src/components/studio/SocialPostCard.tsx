"use client";

import { useState } from "react";
import { studioFetch } from "./api";
import { CarouselPreview } from "./CarouselPreview";
import { SlideImages } from "./SlideImages";
import type { SocialFormat, SocialPost } from "@/lib/store/types";
import { FORMAT_META } from "@/lib/social-format";
import {
  IconCheck,
  IconCopy,
  IconEye,
  IconInstagram,
  IconLinkedin,
  IconMessage,
  IconSpinner,
  IconThumbsDown,
  IconThumbsUp,
  IconVideo,
  IconX,
} from "@/components/ui/icons";

/**
 * آیکونِ هر قالب — نگاشتِ صریح، نه ترنری‌ای که برای قالبِ ناشناخته بی‌صدا
 * روی لینکدین می‌افتد (باگی که ممیزیِ فاز ۴ در اینجا پیدا کرد).
 * `satisfies` اضافه‌شدنِ قالبِ جدید بدونِ ورودیِ اینجا را خطای کامپایل می‌کند.
 */
const ICON_BY_FORMAT = {
  carousel: IconInstagram,
  post: IconLinkedin,
  reels: IconVideo,
  story: IconInstagram,
} satisfies Record<SocialFormat, typeof IconInstagram>;

/**
 * کارت یک محتوای اجتماعی — کاروسل، پست لینکدین، اسکریپت ریلز یا ستِ استوری.
 *
 * ابتدا داخل SocialPanel بود؛ با آمدن دومین مصرف‌کننده (پنل کمپین، که
 * باید خروجی هر کانال را نشان دهد) بیرون کشیده شد. همان قاعده‌ی همیشگی:
 * انتزاع را وقتی می‌سازیم که تکرار واقعی دیده شود، نه زودتر.
 */
export function SocialPostCard({
  post,
  onCopy,
  onSetStatus,
  onNotice,
  onUnauthorized,
  onRefresh,
}: {
  post: SocialPost;
  onCopy: (text: string, label: string) => void;
  onSetStatus: (post: SocialPost, status: "draft" | "approved") => void;
  onNotice: (msg: string) => void;
  onUnauthorized: () => void;
  /** والد داده را دوباره بخواند — بعد از رندر لازم است، برای «?v=» تازه */
  onRefresh?: () => void;
}) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState<"up" | "down">("up");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [rendering, setRendering] = useState(false);

  /**
   * رندر دوباره.
   *
   * ⚠️ صفحه را reload نمی‌کنیم و onNotice کافی نیست: مسیر فایل‌ها ثابت
   * است و فقط `renderedAt` عوض می‌شود، پس URL نمایش هم باید عوض شود.
   * تا وقتی والد داده را دوباره نخواند، `?v=` قدیمی می‌ماند و مرورگر
   * تصویر کش‌شده را نشان می‌دهد — دقیقاً همان چیزی که این ستون برای
   * جلوگیری از آن ساخته شد.
   */
  async function rerender() {
    setRendering(true);
    try {
      const res = await studioFetch(`/api/social/posts/${post.id}/render`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطای ناشناخته");
      const r = data.render;
      onNotice(
        r.status === "rendered"
          ? `${r.count} تصویر ساخته شد.`
          : r.status === "failed"
            ? `رندر ناموفق بود: ${r.error}`
            : `رندر انجام نشد (${r.reason}).`
      );
      onRefresh?.();
    } catch (e) {
      if (e instanceof Error && e.message === "PASSWORD_REQUIRED") onUnauthorized();
      else onNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setRendering(false);
    }
  }

  async function sendFeedback() {
    setSending(true);
    try {
      const res = await studioFetch("/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          targetType: "social",
          targetId: post.id,
          rating,
          comment,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطای ناشناخته");
      onNotice(
        data.lessonsAdded > 0
          ? `بازخورد ثبت شد و ${data.lessonsAdded} درس به حافظه‌ی سیستم اضافه شد.`
          : "بازخورد ثبت شد."
      );
      setShowFeedback(false);
      setComment("");
    } catch (e) {
      if (e instanceof Error && e.message === "PASSWORD_REQUIRED") onUnauthorized();
      else onNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  const isReels = post.format === "reels";
  const isStory = post.format === "story";
  const meta = FORMAT_META[post.format];
  const PlatformIcon = ICON_BY_FORMAT[post.format];
  const platformLabel = meta.label;

  // چیزی که واقعاً کپی می‌شود. در ریلز، اسکریپت و کپشن دو چیز جدا هستند:
  // اسکریپت را می‌خوانید، کپشن را زیر ویدیو می‌گذارید.
  const copyText = isReels
    ? post.body
    : `${post.body}\n\n${post.hashtags.join(" ")}`;
  const copyLabel = meta.copyLabel;
  const passed = post.checks.filter((c) => c.pass).length;

  return (
    <article className="rounded-xl2 border border-surface-line bg-surface p-6 shadow-card sm:p-7">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 font-bold text-ink">
          <PlatformIcon className="h-5 w-5 text-ink-muted" />
          <span dir="auto">{post.title}</span>
          <span className="rounded-full bg-surface-dim px-2.5 py-0.5 text-xs font-medium text-ink-muted">
            {platformLabel}
          </span>
        </h3>
        <div className="flex items-center gap-2">
          {post.score != null && (
            <span className="text-xs text-ink-muted">امتیاز {post.score}/۱۰۰</span>
          )}
          <button
            onClick={() => onSetStatus(post, post.status === "approved" ? "draft" : "approved")}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              post.status === "approved"
                ? "bg-success-soft text-success"
                : "bg-surface-dim text-ink-muted hover:bg-brand-50 hover:text-brand-600"
            }`}
          >
            {post.status === "approved" ? "تأییدشده" : "تأیید برای انتشار"}
          </button>
        </div>
      </header>

      {/*
        PNG وقتی هست، CSS وقتی نیست — fallback، نه کلید تعویض.
        ⚠️ حتی با slide-spec مشترک، پیش‌نمایش CSS تقریب است: شکست خط را
        موتور متن مرورگر انجام می‌دهد و رندرکننده با measureText اسکیا.
        دو موتور اندازه‌گیری، بدون تضمین توافق. PNG حقیقت است.
      */}
      {meta.canRender &&
        (post.imagePaths.length > 0 ? (
          <SlideImages post={post} />
        ) : (
          <CarouselPreview slides={post.slides} language={post.language} />
        ))}

      {meta.canRender && (
        <button
          onClick={rerender}
          disabled={rendering}
          className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-surface-line px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
        >
          {rendering ? <IconSpinner className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
          {rendering
            ? "در حال رندر…"
            : post.imagePaths.length > 0
              ? "رندر دوباره"
              : "ساخت تصویرها"}
        </button>
      )}

      {/* در ریلز، دلیل انتخاب CTA بیرون از اسکریپت نمایش داده می‌شود */}
      {isReels && post.extras.ctaReason && (
        <p className="mb-4 rounded-xl border-r-2 border-brass bg-surface-dim px-4 py-3 text-sm leading-6 text-ink-muted">
          <b className="font-bold text-ink">چرا این دعوت به اقدام؟</b>{" "}
          <span dir="auto">{post.extras.ctaReason}</span>
        </p>
      )}

      {/* متن اصلی — شکست خط‌ها معنادارند، پس whitespace-pre-line */}
      <div className="mt-4">
        {isReels && (
          <h4 className="mb-1.5 text-sm font-bold text-ink">اسکریپت (برای بلندخوانی)</h4>
        )}
        {/* ⚠️ استوری کپشن ندارد — این جعبه خلاصه‌ی داخلیِ ست است، نه متنِ قابلِ انتشار */}
        {isStory && <h4 className="mb-1.5 text-sm font-bold text-ink">{meta.bodyLabel}</h4>}
        <div
          dir="auto"
          className="whitespace-pre-line rounded-xl bg-surface-dim p-4 text-sm leading-8 text-ink-soft"
        >
          {post.body}
        </div>
      </div>

      {/* اکسترا — فقط ریلز: متن روی تصویر و کپشن جدا */}
      {isReels && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {post.extras.onScreenText && (
            <div>
              <h4 className="mb-1.5 text-sm font-bold text-ink">متن روی تصویر (قلاب)</h4>
              <p
                dir="auto"
                className="rounded-xl bg-pine px-4 py-3 text-center font-heading text-base font-bold leading-7 text-bone"
              >
                {post.extras.onScreenText}
              </p>
            </div>
          )}
          {post.extras.caption && (
            <div>
              <h4 className="mb-1.5 text-sm font-bold text-ink">کپشن پیشنهادی</h4>
              <p
                dir="auto"
                className="whitespace-pre-line rounded-xl bg-surface-dim px-4 py-3 text-sm leading-7 text-ink-soft"
              >
                {post.extras.caption}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {post.hashtags.map((h) => (
          <span
            key={h}
            dir="auto"
            className="rounded-full bg-brand-50 px-2.5 py-1 text-xs text-brand-600"
          >
            {h}
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() => onCopy(copyText, copyLabel)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-surface-line px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-surface-dim"
        >
          <IconCopy className="h-4 w-4" />
          {copyLabel}
        </button>
        {isReels && post.extras.caption && (
          <button
            onClick={() =>
              onCopy(`${post.extras.caption}\n\n${post.hashtags.join(" ")}`, "کپشن")
            }
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-surface-line px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-surface-dim"
          >
            <IconCopy className="h-4 w-4" />
            کپی کپشن و هشتگ‌ها
          </button>
        )}
        <button
          onClick={() => setShowFeedback((v) => !v)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-surface-line px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-surface-dim"
        >
          <IconMessage className="h-4 w-4" />
          بازخورد
        </button>
        <span className="text-xs text-ink-muted">
          چک‌لیست: {passed}/{post.checks.length} پاس
        </span>
      </div>

      {/* بازخورد انسانی → منتقد → درس برای اجراهای بعدی */}
      {showFeedback && (
        <div className="mt-4 rounded-xl border border-surface-line bg-surface-dim p-4">
          <div className="mb-3 flex gap-2">
            {(
              [
                { v: "up", label: "خوب بود", Icon: IconThumbsUp },
                { v: "down", label: "خوب نبود", Icon: IconThumbsDown },
              ] as const
            ).map((o) => (
              <button
                key={o.v}
                onClick={() => setRating(o.v)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold transition-colors ${
                  rating === o.v
                    ? o.v === "up"
                      ? "bg-success-soft text-success"
                      : "bg-danger-soft text-danger"
                    : "text-ink-muted hover:bg-surface"
                }`}
              >
                <o.Icon className="h-4 w-4" />
                {o.label}
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="چه چیزی را باید دفعه‌ی بعد متفاوت انجام دهد؟ (اختیاری، ولی بدون آن درسی استخراج نمی‌شود)"
            className="w-full resize-y rounded-xl border border-surface-line bg-surface px-3 py-2 text-sm leading-6 transition-colors placeholder:text-ink-muted/60 focus:border-brand-400"
          />
          <button
            onClick={sendFeedback}
            disabled={sending}
            className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {sending ? <IconSpinner className="h-4 w-4" /> : null}
            ثبت بازخورد
          </button>
        </div>
      )}

      {/* چک‌های قطعی — نتیجه‌ی کد، نه قضاوت مدل */}
      {post.checks.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-surface-line pt-4">
          {post.checks.map((c) => (
            <li key={c.name} className="flex items-start gap-2 text-xs leading-5">
              {c.pass ? (
                <IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
              ) : (
                <IconX className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
              )}
              <span className={c.pass ? "text-ink-muted" : "text-danger"}>
                <b className="font-bold">{c.name}</b> —{" "}
                <span dir="auto">{c.note}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
