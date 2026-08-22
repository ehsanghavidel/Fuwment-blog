import "server-only";
import { randomUUID } from "crypto";
import { getStore, type PipelineRun, type SocialPost } from "@/lib/store";
import { makeStepRunner } from "./run-steps";
import { runSocialIdeaScout } from "./social-idea-scout";
import { runInstagramStrategist } from "./instagram-strategist";
import { runInstagramWriter, runInstagramRevision } from "./instagram-writer";
import { SOCIAL_APPROVE_THRESHOLD } from "./social-editor";
import { runInstagramChecks } from "./social-checks";
import { writeAndReview } from "./social-loop";
import { runSocialCritic } from "./critic";
import type { InstagramCarousel } from "./types";
import type { BrandRoute } from "./brand-cta";

/**
 * ارکستریتور اینستاگرام — پایپ‌لاین سوم سیستم.
 *
 * یک کاروسل اینستاگرام از صفر می‌سازد، بدون اینکه مقاله‌ای در کار باشد.
 *
 * جریان:
 * ایده‌یاب اجتماعی → استراتژیست اینستاگرام → کپی‌رایتر ⇄ ویراستار
 * → ناشر (کد قطعی) → منتقد
 *
 * چقدر از این فایل واقعاً «جدید» است؟ فقط دو گام اول. از استراتژیست به
 * بعد، همان `SocialBrief` مرحله‌ی قبل جریان دارد و بقیه‌ی زنجیره
 * (writeAndReview، چک‌های قطعی، ناشر، منتقد) بدون تغییر بازاستفاده می‌شود.
 * این همان سودی است که از تعریف یک قرارداد مشترک در مرحله‌ی قبل بردیم.
 */
export async function runInstagramPipeline(opts: {
  runId: string;
  topicHint?: string | null;
  /**
   * مسیر برند این کاروسل. استودیو همیشه می‌فرستدش؛ کمپین و کرون پیش‌فرض
   * «brand» می‌گیرند — محتوای سطح برند که نسبت به دو مسیر بی‌طرف است.
   * دقیقاً همان قرارداد runPipeline بلاگ.
   */
  route?: BrandRoute;
  /** زبان خروجی. پیش‌فرض فارسی تا هیچ مسیر موجودی رفتار عوض نکند. */
  language?: "fa" | "en";
  /** والدِ این اجرا، اگر از یک هفته‌ی محتوایی آمده باشد */
  weekId?: string | null;
}): Promise<PipelineRun> {
  const store = getStore();
  const runId = opts.runId;
  const topicHint = opts.topicHint?.trim() || null;
  const route = opts.route ?? "brand";
  const language = opts.language ?? "fa";
  const weekId = opts.weekId ?? null;

  const run: PipelineRun = {
    id: runId,
    kind: "instagram",
    status: "running",
    topicHint,
    steps: [],
    postId: null,
    // این پایپ‌لاین از هیچ مقاله‌ای مشتق نشده — مستقل است
    sourcePostId: null,
    socialPostIds: [],
    error: null,
    createdAt: new Date().toISOString(),
    finishedAt: null,
  };
  await store.createRun(run);

  const step = makeStepRunner(run);

  try {
    // عنوان محتواهای قبلی اینستاگرام، برای پرهیز از تکرار
    const existing = await store.listSocialPosts({ platform: "instagram" });

    // ── ۱. ایده‌یاب اجتماعی ──
    const ideas = await step("social-idea-scout", "ایده‌یاب اجتماعی", async () => {
      const out = await runSocialIdeaScout({
        topicHint,
        existingTitles: existing.map((p) => p.title),
      });
      return {
        output: out,
        summary: `${out.length} ایده تولید شد؛ بهترین: «${out[0].title}»`,
      };
    });

    // ── ۲. استراتژیست اینستاگرام ──
    const brief = await step("instagram-strategist", "استراتژیست اینستاگرام", async () => {
      const out = await runInstagramStrategist({ ideas, topicHint, route, language });
      return {
        output: out,
        summary: `بریف ساخته شد — ${out.keyPoints.length} نکته‌ی کلیدی — ${route} / ${out.audienceGroup ?? "؟"} / ${out.journeyStage ?? "؟"}`,
      };
    });

    // ── ۳ و ۴. کپی‌رایتر ⇄ ویراستار (حلقه‌ی مشترک) ──
    const ig = await writeAndReview<InstagramCarousel>({
      step,
      channel: "instagram",
      writerAgent: "instagram-writer",
      label: "اینستاگرام",
      brief,
      write: () => runInstagramWriter({ brief }),
      revise: (draft, review, failedChecks) =>
        runInstagramRevision({ brief, draft, review, failedChecks }),
      check: (d) =>
        runInstagramChecks({ caption: d.caption, slides: d.slides, hashtags: d.hashtags }),
      // کپشن + متن همه‌ی اسلایدها + دعوت به اقدام
      brandText: (d) =>
        [d.caption, ...d.slides.map((s) => `${s.kicker} ${s.heading} ${s.text}`), d.cta].join("\n"),
      describe: (d) => `${d.slides.length} اسلاید، ${d.hashtags.length} هشتگ`,
    });

    // ── ۵. ناشر — کد قطعی، بدون LLM ──
    const published = await step("social-publisher", "ناشر محتوای اجتماعی", async () => {
      const now = new Date().toISOString();
      const igPost: SocialPost = {
        id: randomUUID(),
        runId,
        sourcePostId: null,
        platform: "instagram",
        format: "carousel",
        title: ig.draft.title,
        body: ig.draft.caption,
        slides: ig.draft.slides,
        hashtags: ig.draft.hashtags,
        cta: ig.draft.cta,
        checks: ig.checks,
        extras: {},
        weekId,
        score: ig.review.score,
        // انتشار روی اینستاگرام دستی است؛ انسان تأیید می‌کند
        status: "draft",
        createdAt: now,
        approvedAt: null,
      };
      await store.createSocialPost(igPost);

      return {
        output: { instagramId: igPost.id },
        summary:
          ig.review.score >= SOCIAL_APPROVE_THRESHOLD
            ? "کاروسل ذخیره شد — آماده‌ی تأیید و انتشار دستی"
            : `کاروسل ذخیره شد (امتیاز ${ig.review.score} زیر حد نصاب — نیاز به بازبینی انسانی)`,
      };
    });

    run.socialPostIds = [published.instagramId];
    await store.updateRun(runId, { socialPostIds: run.socialPostIds });

    // ── ۶. منتقد (خودبهبودی) ──
    // خطای منتقد نباید اجرای موفق را خراب کند.
    await step<unknown>("critic", "منتقد — استخراج درس", async () => {
      try {
        const out = await runSocialCritic({
          context: `نوع اجرا: کاروسل مستقل اینستاگرام${topicHint ? ` — موضوع درخواستی: «${topicHint}»` : " (انتخاب آزاد ایده‌یاب)"}`,
          parts: [{ label: "کاروسل اینستاگرام", ...ig }],
          revisionRounds: ig.revisionRounds,
        });
        return {
          output: out,
          summary: `امتیاز کلی ${out.overallScore}/100 — ${out.lessons.length} درس برای اجراهای بعدی ذخیره شد`,
        };
      } catch (err) {
        return {
          output: { error: err instanceof Error ? err.message : String(err) },
          summary: "استخراج درس ناموفق بود (اجرای اصلی سالم است)",
        };
      }
    });

    run.status = "done";
    run.finishedAt = new Date().toISOString();
    await store.updateRun(runId, { status: "done", finishedAt: run.finishedAt });
    return run;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    run.status = "error";
    run.error = message;
    run.finishedAt = new Date().toISOString();
    await store.updateRun(runId, {
      status: "error",
      error: message,
      finishedAt: run.finishedAt,
    });
    return run;
  }
}
