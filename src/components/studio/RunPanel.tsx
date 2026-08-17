"use client";

import { useEffect, useRef, useState } from "react";
import { studioFetch } from "./api";
import { RunTimeline } from "./RunTimeline";
import type { PipelineRun } from "@/lib/store/types";
import {
  IconAlert,
  IconCheck,
  IconPlay,
  IconSpinner,
  IconX,
} from "@/components/ui/icons";

/**
 * پنل «خط تولید» — نقطه‌ی شروع پایپ‌لاین و نمایش زنده‌ی گام‌ها.
 *
 * الگوی هماهنگی: کلاینت runId می‌سازد → POST (که تا پایان باز می‌ماند) →
 * همزمان هر ۲ ثانیه GET وضعیت. چون ارکستریتور هر گام را در store آینه
 * می‌کند، همین polling ساده یک نمای زنده می‌سازد — بدون WebSocket.
 */

/**
 * مسیرهای برند — برچسب فارسی و توضیح یک‌خطی برای انتخابگر.
 * مقادیر باید با BRAND_ROUTES در types.ts یکی بمانند.
 */
const ROUTE_OPTIONS = [
  { value: "brand", label: "سطح برند", hint: "بی‌طرف نسبت به دو مسیر" },
  { value: "global-talent", label: "Global Talent", hint: "بر پایه‌ی دستاورد و تاثیر فردی" },
  {
    value: "innovator-founder",
    label: "Innovator Founder",
    hint: "بر پایه‌ی ایده و کسب‌وکار",
  },
] as const;

type RouteValue = (typeof ROUTE_OPTIONS)[number]["value"];

export function RunPanel({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [topicHint, setTopicHint] = useState("");
  const [route, setRoute] = useState<RouteValue>("brand");
  const [run, setRun] = useState<PipelineRun | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<PipelineRun[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadHistory() {
    try {
      const res = await studioFetch("/api/pipeline/runs");
      if (res.ok) {
        const runs: PipelineRun[] = (await res.json()).runs;
        // اجراهای بازآفرینی تاریخچه‌ی خودشان را در تب «شبکه‌های اجتماعی» دارند
        setHistory(runs.filter((r) => r.kind !== "repurpose"));
      }
    } catch (e) {
      if (e instanceof Error && e.message === "PASSWORD_REQUIRED") onUnauthorized();
    }
  }

  useEffect(() => {
    loadHistory();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  /**
   * شروع اجرا.
   *
   * ⚠️ POST دیگر منتظر پایان پایپ‌لاین نمی‌ماند — بلافاصله ۲۰۲ برمی‌گرداند
   * و کار در پس‌زمینه‌ی سرور ادامه دارد. پس **نباید** در finally به
   * polling پایان داد؛ تنها چیزی که اجرا را تمام‌شده اعلام می‌کند، خودِ
   * وضعیت رکورد است. (نسخه‌ی قبلی در finally قطع می‌کرد، که با پاسخ فوری
   * یعنی UI بلافاصله یخ می‌زد.)
   */
  async function start() {
    setError("");
    setBusy(true);
    const runId = crypto.randomUUID();
    const startedAt = Date.now();

    // شروع polling قبل از POST — تا از اولین گام جا نمانیم
    pollRef.current = setInterval(async () => {
      // محافظ نهایی: اگر سرور کشته شود و رکورد روی «running» بماند،
      // بی‌نهایت poll نکنیم. سقف اجرای Vercel ۳۰۰ ثانیه است.
      if (Date.now() - startedAt > 6 * 60 * 1000) {
        stopPolling();
        setBusy(false);
        setError("اجرا بیش از حد انتظار طول کشید. تاریخچه را بررسی کنید.");
        loadHistory();
        return;
      }

      try {
        const res = await studioFetch(`/api/pipeline/runs/${runId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.run) {
            setRun(data.run);
            if (data.run.status !== "running") {
              stopPolling();
              setBusy(false);
              loadHistory();
            }
          }
        }
      } catch (e) {
        if (e instanceof Error && e.message === "PASSWORD_REQUIRED") {
          stopPolling();
          setBusy(false);
          onUnauthorized();
        }
        /* بقیه‌ی خطاها گذرا فرض می‌شوند؛ poll بعدی دوباره تلاش می‌کند */
      }
    }, 2000);

    // POST فقط اجرا را کلید می‌زند. خطای این درخواست یعنی اصلاً شروع نشد.
    try {
      const res = await studioFetch("/api/pipeline/run", {
        method: "POST",
        body: JSON.stringify({ runId, topicHint: topicHint || undefined, route }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "خطای ناشناخته");
      }
    } catch (e) {
      stopPolling();
      setBusy(false);
      if (e instanceof Error && e.message === "PASSWORD_REQUIRED") onUnauthorized();
      else setError(e instanceof Error ? e.message : String(e));
      loadHistory();
    }
  }

  return (
    <div className="space-y-6">
      {/* ── فرم شروع ── */}
      <section className="rounded-xl2 border border-surface-line bg-surface p-6 shadow-card sm:p-7">
        <h2 className="text-title text-ink">اجرای جدید پایپ‌لاین</h2>
        <p className="mb-5 mt-1 text-sm text-ink-muted">
          موضوع دادن اختیاری است — اگر خالی بگذارید، ایده‌یاب خودش موضوع پیدا می‌کند.
          مسیر اما اجباری است: دعوت‌به‌اقدام‌های مجاز و زاویه‌ی محتوا از همین تعیین می‌شوند.
        </p>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) start();
          }}
        >
          {/* ── مسیر برند ── */}
          <fieldset disabled={busy}>
            <legend className="mb-2 text-sm font-bold text-ink">مسیر برند</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {ROUTE_OPTIONS.map((opt) => {
                const active = route === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`cursor-pointer rounded-xl border px-4 py-3 transition-colors ${
                      active
                        ? "border-brand-600 bg-brand-50"
                        : "border-surface-line bg-surface-dim hover:bg-sand/50"
                    } ${busy ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    <input
                      type="radio"
                      name="route"
                      value={opt.value}
                      checked={active}
                      onChange={() => setRoute(opt.value)}
                      className="sr-only"
                    />
                    <span
                      className={`block text-sm font-bold ${active ? "text-brand-700" : "text-ink"}`}
                    >
                      {opt.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-muted">{opt.hint}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <label htmlFor="topic-hint" className="sr-only">
                موضوع پیشنهادی (اختیاری)
              </label>
              <input
                id="topic-hint"
                value={topicHint}
                onChange={(e) => setTopicHint(e.target.value)}
                placeholder="مثلاً: چه چیزی در این مسیر «شواهد» حساب می‌شود"
                className="w-full rounded-xl border border-surface-line bg-surface-dim px-4 py-3 transition-colors placeholder:text-ink-muted/60 focus:border-brand-400 focus:bg-surface"
                disabled={busy}
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="btn-action"
            >
              {busy ? (
                <>
                  <IconSpinner className="h-4 w-4" />
                  در حال اجرا…
                </>
              ) : (
                <>
                  <IconPlay className="h-4 w-4" />
                  شروع
                </>
              )}
            </button>
          </div>
        </form>

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm leading-6 text-danger"
          >
            <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </section>

      {/* ── تایم‌لاین زنده ── */}
      {run && (
        <RunTimeline
          run={run}
          badge={
            run.topicHint
              ? `${ROUTE_OPTIONS.find((o) => o.value === route)?.label} · موضوع: ${run.topicHint}`
              : ROUTE_OPTIONS.find((o) => o.value === route)?.label
          }
        />
      )}

      {/* ── تاریخچه ── */}
      {history.length > 0 && (
        <section className="rounded-xl2 border border-surface-line bg-surface p-6 shadow-card sm:p-7">
          <h2 className="mb-4 text-title text-ink">اجراهای اخیر</h2>
          <div className="divide-y divide-surface-line">
            {history.map((h) => (
              <button
                key={h.id}
                onClick={() => setRun(h)}
                className="flex w-full cursor-pointer items-center gap-3 px-2 py-3 text-right text-sm transition-colors hover:bg-surface-dim"
              >
                {h.status === "done" ? (
                  <IconCheck className="h-4 w-4 shrink-0 text-success" />
                ) : h.status === "error" ? (
                  <IconX className="h-4 w-4 shrink-0 text-danger" />
                ) : (
                  <IconSpinner className="h-4 w-4 shrink-0 text-brand-500" />
                )}
                <span className="min-w-0 flex-1 truncate text-ink-soft">
                  {h.topicHint || "بدون موضوع (انتخاب آزاد ایده‌یاب)"}
                </span>
                <time className="shrink-0 text-xs text-ink-muted">
                  {new Date(h.createdAt).toLocaleString("fa-IR", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
