import "server-only";
import { randomUUID } from "crypto";
import { getStore, type PipelineRun, type SocialPost, type StorySticker, type Slide } from "@/lib/store";
import { makeStepRunner } from "./run-steps";
import { runStoryAngleFinder } from "./story-angle-finder";
import { runStoryWriter, runStoryRevision } from "./story-writer";
import { SOCIAL_APPROVE_THRESHOLD } from "./social-editor";
import { runStoryChecks, type SocialCheck } from "./social-checks";
import { writeAndReview } from "./social-loop";
import { runSocialCritic } from "./critic";
import { clampSlides } from "./types";
import { slideText } from "@/lib/slide-spec";
import type { InstagramStory } from "./types";

/**
 * نگهبانِ کپیِ عینیِ منبع — Stage ۳ (اصلاحِ هدفمند).
 *
 * ⚠️ این چک **جدا** از حلقه‌ی نویسنده⇄ویراستار (`writeAndReview`) است و
 * *بعد* از تمام‌شدنِ آن حلقه اجرا می‌شود — مستقل از اینکه داخلِ آن حلقه
 * چند دور بازنویسیِ ویراستاری رخ داده باشد. سقفِ این نگهبان **یک** دورِ
 * بازنویسیِ هدفمند است، کاملاً جدا از `MAX_SOCIAL_REVISION_ROUNDS`.
 *
 * قاعده‌ی ۱ و ۲ در CLAUDE.md: فقط تطبیقِ عینیِ کل‌فیلد، بدون فازی/embedding/
 * n-gram/LLM-judge. یک واژه‌ی مشترکِ کوتاه (کیکر، اصطلاحِ رسمی) نباید رد شود؛
 * فقط وقتی کل مقدارِ heading/text/بندِ list بایت‌به‌بایت (بعد از نرمال‌سازیِ
 * فاصله) با منبع یکی شد.
 */

/** trim + یکی‌کردنِ فاصله‌های تکراری — نرمال‌سازیِ معنا-خنثی، نه بیشتر */
function normalizeForCollision(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

export type CollisionField = "heading" | "text" | "items";

export type SourceCopyCollision = {
  frameIndex: number;
  field: CollisionField;
  itemIndex?: number;
  value: string;
};

/**
 * مقادیرِ قابلِ‌مقایسه‌ی یک اسلاید — فقط heading + standard.text + list.items[].
 * ⚠️ عمداً kicker و imageSubject را برنمی‌گرداند — قرارداد قفل‌شده‌ی
 * اصلاحِ تأییدشده: برچسب‌های کوتاه و متادیتای تصویر انتظار می‌رود تکرار شوند.
 */
function collisionFieldsOf(
  s: Slide
): { field: CollisionField; itemIndex?: number; value: string }[] {
  const out: { field: CollisionField; itemIndex?: number; value: string }[] = [
    { field: "heading", value: s.heading },
  ];
  if (s.layout === "standard") out.push({ field: "text", value: s.text });
  if (s.layout === "list") {
    s.items.forEach((item, itemIndex) => out.push({ field: "items", itemIndex, value: item }));
  }
  return out;
}

/** برچسبِ فارسیِ فیلد، برای لاگ و پیامِ بازنویسی */
export function collisionFieldLabel(c: SourceCopyCollision): string {
  if (c.field === "items") return `بندِ فهرست شماره‌ی ${(c.itemIndex ?? 0) + 1}`;
  if (c.field === "heading") return "تیتر";
  return "متن";
}

/**
 * تشخیصِ تطبیقِ عینیِ کل‌فیلد بینِ فریم‌های استوری و اسلایدهای کاروسلِ مبدأ.
 * بدونِ فازی‌متچینگ، بدونِ overlapِ جزئی — فقط برابریِ کاملِ مقدارِ نرمال‌شده.
 *
 * export شده تا `detectSourceCopyCollisions` مستقیماً و بدونِ بازنویسیِ
 * موازی، در تست‌های منطقِ خالص (الگوی tsc جدا در CLAUDE.md) صدا زده شود.
 */
export function detectSourceCopyCollisions(
  frames: Slide[],
  sourceSlides: Slide[]
): SourceCopyCollision[] {
  const sourceValues = new Set<string>();
  for (const slide of sourceSlides) {
    for (const f of collisionFieldsOf(slide)) {
      const norm = normalizeForCollision(f.value);
      if (norm) sourceValues.add(norm);
    }
  }

  const collisions: SourceCopyCollision[] = [];
  frames.forEach((frame, frameIndex) => {
    for (const f of collisionFieldsOf(frame)) {
      const norm = normalizeForCollision(f.value);
      if (norm && sourceValues.has(norm)) {
        collisions.push({ frameIndex, field: f.field, itemIndex: f.itemIndex, value: f.value });
      }
    }
  });
  return collisions;
}

/**
 * ارکستریتور استوری — Stage ۱ فاز ۴.
 *
 * از یک کاروسلِ **موجود**، یک ستِ ۲ تا ۳ فریمیِ استوری می‌سازد.
 *
 * جریان:
 * تهیه‌ی منبع (کد قطعی) → زاویه‌یاب استوری → کپی‌رایتر ⇄ ویراستار
 * → ناشر (کد قطعی) → منتقد
 *
 * ⚠️ Stage ۱ عمداً بدونِ گامِ رندر است. `FORMAT_META.story.canRender`
 * تا Stage ۲ `false` می‌ماند و `renderSlidesForPost` (در storage.ts) خودش
 * از قبل هر `format !== "carousel"` را با `skipped: not-a-carousel` رد
 * می‌کند — پس حتی صدازدنش هم لازم نیست، چه برسد به افزودنِ گامِ جدید.
 */
export async function runStoryPipeline(opts: {
  runId: string;
  /** کاروسلِ اینستاگرامِ مبدأ — استوری از همین مشتق می‌شود */
  sourceSocialPostId: string;
}): Promise<PipelineRun> {
  const store = getStore();
  const runId = opts.runId;
  const sourceSocialPostId = opts.sourceSocialPostId;

  const run: PipelineRun = {
    id: runId,
    kind: "story",
    status: "running",
    topicHint: null,
    steps: [],
    postId: null,
    // این یک بازآفرینیِ **بلاگ** نیست؛ مبدأ یک SocialPost است، نه Post.
    // پیوندِ واقعی در extras.sourceSocialPostId (گامِ ناشر) ذخیره می‌شود.
    sourcePostId: null,
    socialPostIds: [],
    error: null,
    createdAt: new Date().toISOString(),
    finishedAt: null,
  };
  await store.createRun(run);

  const step = makeStepRunner(run);

  try {
    // ── ۱. تهیه‌ی منبع — کد قطعی، بدون LLM ──
    // کاروسلِ مبدأ را می‌خوانیم و اعتبارسنجی می‌کنیم؛ خودش را دست نمی‌زنیم.
    let source!: SocialPost;
    await step("story-source", "کاروسلِ مبدأ", async () => {
      const post = await store.getSocialPost(sourceSocialPostId);
      if (!post) throw new Error(`کاروسلِ مبدأ (${sourceSocialPostId}) پیدا نشد.`);
      if (post.format !== "carousel") {
        throw new Error(`محتوای مبدأ کاروسل نیست (format: «${post.format}»).`);
      }
      if (post.slides.length === 0) throw new Error("کاروسلِ مبدأ اسلاید ندارد.");
      source = post;
      return {
        output: { sourceId: post.id, title: post.title, slideCount: post.slides.length },
        summary: `کاروسلِ مبدأ: «${post.title}» — ${post.slides.length} اسلاید، زبان ${post.language}`,
      };
    });

    // ── ۲. زاویه‌یاب استوری ──
    const brief = await step("story-angle-finder", "زاویه‌یاب استوری", async () => {
      const out = await runStoryAngleFinder({ source });
      return {
        output: out,
        summary: `زاویه انتخاب شد: «${out.hookAngle}»`,
      };
    });

    // ── ۳ و ۴. کپی‌رایتر ⇄ ویراستار (حلقه‌ی مشترک) ──
    const story = await writeAndReview<InstagramStory>({
      step,
      channel: "story",
      writerAgent: "story-writer",
      label: "استوری",
      brief,
      write: () => runStoryWriter({ brief }),
      revise: (draft, review, failedChecks) =>
        runStoryRevision({ brief, draft, review, failedChecks }),
      check: (d) => runStoryChecks({ frames: d.frames, stickers: d.stickers ?? [] }),
      // خلاصه‌ی داخلی + متنِ همه‌ی فریم‌ها + دعوت به اقدام
      brandText: (d) => [d.setSummary, ...d.frames.map(slideText), d.cta].join("\n"),
      describe: (d) =>
        `${d.frames.length} فریم${d.stickers?.length ? `، ${d.stickers.length} استیکر` : ""}`,
    });

    // ── ۴٫۵. نگهبانِ کپیِ عینیِ منبع — کدِ قطعی، حداکثر یک بازنویسیِ هدفمند ──
    // مستقل از حلقه‌ی نویسنده⇄ویراستارِ بالا: همیشه دقیقاً یک‌بار، بعد از
    // تمام‌شدنِ آن حلقه اجرا می‌شود؛ بودجه‌اش با MAX_SOCIAL_REVISION_ROUNDS
    // جمع نمی‌شود.
    let finalDraft: InstagramStory = story.draft;
    let finalChecks: SocialCheck[] = story.checks;

    await step("story-source-copy-guard", "نگهبانِ کپیِ منبع", async () => {
      const collisions = detectSourceCopyCollisions(finalDraft.frames, source.slides);
      if (collisions.length === 0) {
        return {
          output: { initialCollisions: 0, resolvedAfterRevision: false },
          summary: "بدون کپیِ عینیِ فیلد از منبع",
        };
      }

      for (const c of collisions) {
        console.log(
          `[story-source-copy] فریمِ ${c.frameIndex} — ${collisionFieldLabel(c)}: «${c.value}» عیناً با کاروسلِ مبدأ یکسان است`
        );
      }

      const failedChecks: SocialCheck[] = collisions.map((c) => ({
        name: "بدون کپی مستقیم از منبع",
        pass: false,
        severity: "blocking",
        note: `فریمِ ${c.frameIndex + 1} — ${collisionFieldLabel(c)}: «${c.value}» عیناً با متنِ کاروسلِ مبدأ یکسان است. معنا و اصطلاحاتِ لازم را حفظ کن، ولی با کلماتِ کاملاً تازه بنویس.`,
      }));

      const revised = await runStoryRevision({
        brief,
        draft: finalDraft,
        review: { ...story.review, verdict: "revise", issues: [] },
        failedChecks,
      });

      const recheck = runStoryChecks({ frames: revised.frames, stickers: revised.stickers ?? [] });
      const stillColliding = detectSourceCopyCollisions(revised.frames, source.slides);

      if (stillColliding.length > 0) {
        for (const c of stillColliding) {
          console.log(
            `[story-source-copy] بعد از یک بازنویسیِ هدفمند هم برطرف نشد — فریمِ ${c.frameIndex} — ${collisionFieldLabel(c)}: «${c.value}»`
          );
        }
        throw new Error(
          `کپیِ عینیِ متنِ منبع بعد از یک بازنویسیِ هدفمند برطرف نشد (${stillColliding.length} تداخل). چیزی ذخیره نشد.`
        );
      }

      finalDraft = revised;
      finalChecks = recheck;

      return {
        output: { initialCollisions: collisions.length, resolvedAfterRevision: true },
        summary: `${collisions.length} کپیِ عینی شناسایی و با یک بازنویسیِ هدفمند برطرف شد`,
      };
    });

    // ── ۵. ناشر — کد قطعی، بدون LLM ──
    const published = await step("social-publisher", "ناشر محتوای اجتماعی", async () => {
      const now = new Date().toISOString();

      /**
       * تصویرِ AI فقط برایِ فریمِ اول ساخته می‌شود (تصمیمِ محصولیِ
       * قفل‌شده). اگر مدل روی فریم‌های بعدی هم imageSubject گذاشته،
       * همین‌جا حذفش می‌کنیم — نرمال‌سازیِ بی‌ضرر، نه چکِ مسدودکننده، چون
       * هیچ مصرف‌کننده‌ای امروز از آن فیلد روی فریم‌های بعدی نمی‌خواند.
       */
      const clamped = clampSlides(finalDraft.frames);
      const cleanFrames = clamped.map((f, i) => {
        if (i > 0 && f.imageSubject) {
          console.log(
            `[story-image] imageSubject روی فریمِ ${i} حذف شد — فقط فریمِ ۰ تصویر می‌گیرد`
          );
          const { imageSubject: _drop, ...rest } = f;
          return rest as typeof f;
        }
        return f;
      });

      /**
       * نرمال‌سازیِ استیکرها — بدونِ نگه‌داشتنِ مرجعِ نامعتبر.
       *
       * ⚠️ چکِ قطعی (runStoryChecks) این حالت‌ها را گزارش می‌دهد و
       * بازنویسی می‌سازد، ولی سقفِ بازنویسی فقط یک دور است؛ اگر مدل بعد
       * از آن هم اصلاح نکرد، محتوا «پیش‌نویس» می‌ماند (همان الگوی
       * human-in-the-loop) — ولی داده‌ی ذخیره‌شده هرگز نباید مرجعِ فریمِ
       * نامعتبر یا استیکرِ دوم روی یک فریم داشته باشد.
       */
      const rawStickers = finalDraft.stickers ?? [];
      const seenFrames = new Set<number>();
      const cleanStickers: StorySticker[] = [];
      for (const s of rawStickers) {
        if (!Number.isInteger(s.frame) || s.frame < 0 || s.frame >= cleanFrames.length) {
          console.log(`[story-sticker] استیکر با frame نامعتبر (${s.frame}) حذف شد`);
          continue;
        }
        if (seenFrames.has(s.frame)) {
          console.log(`[story-sticker] استیکرِ تکراری روی فریمِ ${s.frame} حذف شد`);
          continue;
        }
        seenFrames.add(s.frame);
        cleanStickers.push(s);
      }

      const storyPost: SocialPost = {
        id: randomUUID(),
        runId,
        sourcePostId: null,
        platform: "instagram",
        format: "story",
        title: finalDraft.title,
        // ⚠️ body اینجا setSummary است — خلاصه‌ی داخلیِ اپراتور، نه کپشن.
        // استوری اصلاً کپشن ندارد؛ متن روی خودِ فریم‌هاست.
        body: finalDraft.setSummary,
        slides: cleanFrames,
        // استوری هشتگ ندارد — مفهومِ هشتگ فقط برای فید/کپشن معنی دارد.
        hashtags: [],
        cta: finalDraft.cta,
        checks: finalChecks,
        extras: {
          sourceSocialPostId: source.id,
          ...(cleanStickers.length > 0 ? { stickers: cleanStickers } : {}),
        },
        language: brief.language,
        weekId: source.weekId,
        // Stage ۱ عمداً بدونِ رندر — canRender تا Stage ۲ false می‌ماند.
        imagePaths: [],
        renderedAt: null,
        score: story.review.score,
        status: "draft",
        createdAt: now,
        approvedAt: null,
      };
      await store.createSocialPost(storyPost);

      return {
        output: { storyId: storyPost.id, frameCount: cleanFrames.length },
        summary:
          story.review.score >= SOCIAL_APPROVE_THRESHOLD
            ? "ستِ استوری ذخیره شد — آماده‌ی تأیید انسانی"
            : `ستِ استوری ذخیره شد (امتیاز ${story.review.score} زیر حد نصاب — نیاز به بازبینی انسانی)`,
      };
    });

    run.socialPostIds = [published.storyId];
    await store.updateRun(runId, { socialPostIds: run.socialPostIds });

    // ── ۶. منتقد (خودبهبودی) ──
    await step<unknown>("critic", "منتقد — استخراج درس", async () => {
      try {
        const out = await runSocialCritic({
          context: `نوع اجرا: ستِ استوری، مشتق از کاروسلِ «${source.title}»`,
          // finalDraft/finalChecks ممکن است بعد از نگهبانِ کپیِ منبع
          // به‌روزتر از story.draft/story.checks باشند — منتقد باید
          // همان محتوایی را ببیند که واقعاً ذخیره شد.
          parts: [{ label: "ستِ استوری اینستاگرام", ...story, draft: finalDraft, checks: finalChecks }],
          revisionRounds: story.revisionRounds,
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
