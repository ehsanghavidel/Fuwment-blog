"use client";

import { useEffect, useRef, useState } from "react";
import { studioFetch } from "./api";
import { SocialPostCard } from "./SocialPostCard";
import type { ContentWeek, PipelineRun, SocialPost } from "@/lib/store/types";
import {
  IconAlert,
  IconCheck,
  IconInstagram,
  IconLayers,
  IconPlay,
  IconSpinner,
  IconX,
} from "@/components/ui/icons";

/**
 * پنل «هفته» — برنامه‌ریزی و اجرای هفت کاروسل اینستاگرام.
 *
 * ⚠️ دو دکمه‌ی جدا، عمداً. اجرای هفته حدود ۳۵ فراخوانی مدل است؛ اگر
 * برنامه بد باشد باید پیش از سوزاندنشان دیده شود. همان الگویی که
 * ناشر بلاگ و دکمه‌ی وردپرس دارند: انسان بین تولید و انتشار می‌ایستد.
 *
 * تفاوت با بقیه‌ی پنل‌ها: اینجا کلاینت `runId` نمی‌سازد. هفت شناسه در
 * ارکستریتور ساخته و پیش از شروع ذخیره می‌شوند، و این پنل با GET همان
 * مسیر می‌گیردشان — پس حتی اگر وسط کار صفحه رفرش شود، وضعیت برمی‌گردد.
 */

const DAY_LABELS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

const ROUTE_LABELS: Record<string, string> = {
  brand: "سطح برند",
  "global-talent": "Global Talent",
  "innovator-founder": "Innovator Founder",
};

const AUDIENCE_LABELS: Record<string, string> = {
  "digital-tech": "دیجیتال تک",
  "academic-research": "آکادمیک و پژوهش",
  "arts-culture": "هنر و فرهنگ",
  "engineering-medical": "مهندسی و پزشکی",
  entrepreneurship: "کارآفرینی",
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  education: "آموزش",
  proof: "اثبات",
  sales: "فروش",
};

const JOURNEY_LABELS: Record<string, string> = {
  unaware: "ناآگاه",
  curious: "کنجکاو",
  evaluating: "سنجش",
  decision: "تصمیم",
  "in-journey": "همراهی",
  success: "موفقیت",
  referral: "معرفی",
};

/** برچسب فارسی با fallback به مقدار خام — هیچ‌وقت خالی نشان نده */
function label(map: Record<string, string>, key: string | null): string {
  if (!key) return "—";
  return map[key] ?? key;
}

export function WeeklyPanel({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [week, setWeek] = useState<ContentWeek | null>(null);
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"plan" | "run" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    try {
      const [weekRes, socialRes] = await Promise.all([
        studioFetch("/api/social/weekly"),
        studioFetch("/api/social/posts"),
      ]);
      if (weekRes.ok) {
        const data = await weekRes.json();
        setWeek(data.week);
        setRuns(data.runs ?? []);
      }
      if (socialRes.ok) setPosts((await socialRes.json()).socialPosts);
    } catch (e) {
      if (e instanceof Error && e.message === "PASSWORD_REQUIRED") onUnauthorized();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function post(body: Record<string, unknown>, mode: "plan" | "run") {
    setError("");
    setNotice("");
    setBusy(mode);

    // اجرا چند دقیقه طول می‌کشد و پاسخ تا آخر باز می‌ماند؛ همان الگوی
    // بقیه‌ی پنل‌ها — poll موازی تا پیشرفت زنده دیده شود.
    if (mode === "run") {
      pollRef.current = setInterval(load, 2000);
    }

    try {
      const res = await studioFetch("/api/social/weekly", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطای ناشناخته");
      setWeek(data.week);
      setNotice(
        mode === "plan"
          ? "برنامه ساخته شد. پیش از اجرا یک بار بخوانش."
          : "اجرای هفته تمام شد."
      );
    } catch (e) {
      if (e instanceof Error && e.message === "PASSWORD_REQUIRED") onUnauthorized();
      else setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      setBusy(null);
      load();
    }
  }

  const hasPlan = (week?.plan.length ?? 0) > 0;
  const hasRun = (week?.runIds.length ?? 0) > 0;
  const weekPosts = week ? posts.filter((p) => p.weekId === week.id) : [];

  /** وضعیت زنده‌ی هر روز — از رکورد اجرا، نه از run_ids که آخر کار پر می‌شود */
  const runFor = (day: number) => {
    const ref = week?.runIds.find((r) => r.day === day);
    if (!ref) return null;
    return runs.find((r) => r.id === ref.runId) ?? null;
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl2 border border-surface-line bg-surface p-6 shadow-card sm:p-7">
        <h2 className="inline-flex items-center gap-2 text-title text-ink">
          <IconLayers className="h-5 w-5 text-ink-muted" />
          هفته‌ی محتوایی
        </h2>
        <p className="mb-5 mt-1 text-sm leading-6 text-ink-muted">
          هفت کاروسل اینستاگرام، یکی برای هر روز. زبان، مسیر، گروه مخاطب و نوع
          محتوای هر روز از شبکه‌ی برند می‌آید و انتخابی نیست — برنامه‌ریز فقط
          موضوع و قلاب و مرحله‌ی سفر را می‌سازد.
          <br />
          <b className="font-bold text-ink">اول برنامه‌ریزی، بعد اجرا.</b> اجرای
          هفته حدود ۳۵ فراخوانی مدل است؛ برنامه را قبلش یک بار بخوانید.
        </p>

        {loading ? (
          <p className="text-sm text-ink-muted">در حال بارگذاری…</p>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => post({ mode: "plan", force: hasPlan }, "plan")}
              disabled={busy !== null}
              className="btn-action"
            >
              {busy === "plan" ? (
                <>
                  <IconSpinner className="h-4 w-4" />
                  در حال برنامه‌ریزی…
                </>
              ) : (
                <>
                  <IconLayers className="h-4 w-4" />
                  {hasPlan ? "برنامه‌ریزی دوباره" : "برنامه‌ریزی هفته"}
                </>
              )}
            </button>

            <button
              onClick={() => week && post({ mode: "run", weekId: week.id, force: hasRun }, "run")}
              disabled={busy !== null || !hasPlan}
              title={hasPlan ? undefined : "اول هفته را برنامه‌ریزی کنید"}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-surface-line bg-surface-dim px-5 py-3 text-btn text-ink transition-colors hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "run" ? (
                <>
                  <IconSpinner className="h-4 w-4" />
                  در حال اجرا…
                </>
              ) : (
                <>
                  <IconPlay className="h-4 w-4" />
                  {hasRun ? "اجرای دوباره" : "اجرای هفته"}
                </>
              )}
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm leading-6 text-danger"
          >
            <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span dir="auto">{error}</span>
          </div>
        )}
        {notice && (
          <p className="mt-4 rounded-xl bg-success-soft px-4 py-3 text-sm text-success">{notice}</p>
        )}
      </section>

      {/* ── برنامه‌ی هفته ── */}
      {week && hasPlan && (
        <section className="rounded-xl2 border border-surface-line bg-surface p-6 shadow-card sm:p-7">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-title text-ink">برنامه‌ی هفته</h2>
            <span dir="ltr" className="font-latin text-xs text-ink-muted">
              {week.weekStart}
            </span>
          </header>

          <ul className="space-y-3">
            {[...week.plan]
              .sort((a, b) => a.day - b.day)
              .map((slot) => {
                const run = runFor(slot.day);
                return (
                  <li
                    key={slot.day}
                    className="rounded-xl border border-surface-line bg-surface-dim p-4"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-pine px-2.5 py-1 text-xs font-bold text-bone">
                        {DAY_LABELS[slot.day] ?? `روز ${slot.day}`}
                      </span>
                      <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs text-ink-muted">
                        {slot.language === "fa" ? "فارسی" : "English"}
                      </span>
                      <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs text-ink-muted">
                        {label(ROUTE_LABELS, slot.route)}
                      </span>
                      <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs text-ink-muted">
                        {label(AUDIENCE_LABELS, slot.audienceGroup)}
                      </span>
                      <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs text-brand-600">
                        {label(CONTENT_TYPE_LABELS, slot.contentType)}
                      </span>
                      <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-xs text-success">
                        {label(JOURNEY_LABELS, slot.journeyStage)}
                      </span>

                      {/* وضعیت اجرای این روز، فقط وقتی اجرایی شروع شده */}
                      {run && (
                        <span className="mr-auto inline-flex items-center gap-1.5 text-xs">
                          {run.status === "running" ? (
                            <>
                              <IconSpinner className="h-3.5 w-3.5 text-brand-500" />
                              <span className="text-ink-muted">در حال اجرا</span>
                            </>
                          ) : run.status === "done" ? (
                            <>
                              <IconCheck className="h-3.5 w-3.5 text-success" />
                              <span className="text-success">
                                {run.steps.length.toLocaleString("fa-IR")} گام
                              </span>
                            </>
                          ) : (
                            <>
                              <IconX className="h-3.5 w-3.5 text-danger" />
                              <span className="text-danger">خطا</span>
                            </>
                          )}
                        </span>
                      )}
                    </div>

                    <p dir="auto" className="font-bold leading-7 text-ink">
                      {slot.topic}
                    </p>
                    <p dir="auto" className="mt-1 text-sm leading-6 text-ink-muted">
                      {slot.hook}
                    </p>
                  </li>
                );
              })}
          </ul>

          {week.error && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm leading-6 text-danger"
            >
              <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span dir="auto">{week.error}</span>
            </div>
          )}
        </section>
      )}

      {/* ── خروجی هفته ── */}
      {weekPosts.length > 0 && (
        <section className="space-y-4">
          <h2 className="inline-flex items-center gap-2 text-title text-ink">
            <IconInstagram className="h-5 w-5 text-ink-muted" />
            کاروسل‌های این هفته ({weekPosts.length.toLocaleString("fa-IR")})
          </h2>
          {weekPosts.map((sp) => (
            <SocialPostCard
              key={sp.id}
              post={sp}
              onCopy={async (text, lbl) => {
                try {
                  await navigator.clipboard.writeText(text);
                  setNotice(`${lbl} در کلیپ‌بورد کپی شد.`);
                } catch {
                  setNotice("کپی ناموفق بود — متن را دستی انتخاب کنید.");
                }
              }}
              onSetStatus={async (p, status) => {
                await studioFetch(`/api/social/posts/${p.id}`, {
                  method: "PATCH",
                  body: JSON.stringify({ status }),
                });
                load();
              }}
              onNotice={setNotice}
              onUnauthorized={onUnauthorized}
            />
          ))}
        </section>
      )}

      {!loading && !week && (
        <p className="rounded-xl bg-surface-dim px-4 py-3 text-sm leading-6 text-ink-muted">
          برای این هفته هنوز برنامه‌ای ساخته نشده. با دکمه‌ی بالا شروع کنید.
        </p>
      )}
    </div>
  );
}
