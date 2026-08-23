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
import { runSocialCritic, type SocialCriticPart } from "./critic";
import { renderSlidesForPost } from "@/lib/storage";
import { clampSlides } from "./types";
import type { InstagramCarousel, SocialIdea } from "./types";
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
  /**
   * اسلاتِ از پیش تعیین‌شده‌ی برنامه‌ریز هفتگی.
   *
   * وقتی پر باشد، **ایده‌یاب اجرا نمی‌شود**. دلیلش دو چیز است:
   *
   * ۱. کار ایده‌یاب اکتشاف است و اینجا اکتشاف تمام شده. اجرایش یعنی یک
   *    فراخوانی مدل با دمای ۰٫۹ که تنها کار اضافه‌اش فرصت گم‌کردن موضوع
   *    است — همان ریزشی که در کمپین دیده شد.
   * ۲. هفت اجرای موازی همگی `listSocialPosts` را در یک لحظه می‌خوانند و
   *    کار همدیگر را نمی‌بینند، پس مکانیزم ضدتکرارِ ایده‌یاب بین اجراهای
   *    هم‌زمان کور است. تمایز را برنامه‌ریز تضمین می‌کند، نه ایده‌یاب.
   *
   * برنامه‌ریز `hook` و `painPoint` را هم می‌سازد، دقیقاً به همان شکلی
   * که ایده‌یاب می‌ساخت — پس ورودی استراتژیست تغییری نمی‌کند.
   */
  assignedSlot?: { topic: string; hook: string; painPoint: string };
  /** والدِ این اجرا، اگر از یک هفته آمده باشد */
  weekId?: string | null;
  /**
   * وقتی پر باشد، گام منتقدِ **داخل این اجرا** اجرا نمی‌شود و نتیجه
   * به‌جایش اینجا تحویل داده می‌شود.
   *
   * ⚠️ این فلگ از یک خطر واقعی درآمد. `saveLessons` در critic.ts یک
   * read-modify-write بدون قفل است و `MAX_ACTIVE_LESSONS_PER_AGENT = 8`.
   * هفت منتقد هم‌زمان تا ۲۱ درسِ به‌شدت هم‌بسته روی همان چهار ایجنت
   * می‌ریزند و کل حافظه‌ی خودبهبودی را با یک بچ پاک می‌کنند.
   *
   * `runSocialCritic` از قبل آرایه می‌گیرد، پس مسیر هفتگی یک منتقد در
   * سطح هفته می‌زند و این گام را خاموش می‌کند.
   */
  collectForCritic?: (part: SocialCriticPart) => void;
}): Promise<PipelineRun> {
  const store = getStore();
  const runId = opts.runId;
  const topicHint = opts.topicHint?.trim() || null;
  const route = opts.route ?? "brand";
  const language = opts.language ?? "fa";
  const assignedSlot = opts.assignedSlot ?? null;
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
    // ── ۱. ایده‌یاب اجتماعی ──
    // در مسیر هفتگی دور زده می‌شود؛ دلیلش بالای assignedSlot نوشته شده.
    let ideas: SocialIdea[];
    if (assignedSlot) {
      /**
       * گام قطعی، بدون مدل — فقط برای اینکه تایم‌لاین دروغ نگوید.
       *
       * ⚠️ بدون این، اجرای هفتگی یک گام کمتر از اجرای دستی دارد و هیچ
       * توضیحی نیست. کسی که تایم‌لاین را نگاه می‌کند نمی‌تواند بفهمد
       * ایده‌یاب **عمداً** اجرا نشده یا شکست خورده و بی‌صدا رد شده —
       * و آن دو حالت واکنش کاملاً متفاوتی می‌خواهند.
       *
       * شناسه‌ی `weekly-slot` عمداً در `AGENT_IDS` **نیست**: آن فهرست
       * مالِ ایجنت‌هایی است که پرامپت دارند و درس می‌گیرند. این گام
       * کدِ قطعی است، مثل `social-publisher` و `wordpress` — آیکون
       * می‌خواهد، درس نه.
       */
      await step("weekly-slot", "اسلات برنامه‌ی هفتگی", async () => ({
        output: {
          skipped: "social-idea-scout",
          reason:
            "موضوع از برنامه‌ی هفتگی آمده، پس اکتشاف لازم نیست. تمایز هفت موضوع را برنامه‌ریز تضمین کرده، نه ایده‌یاب.",
          slot: assignedSlot,
        },
        summary: `موضوع از برنامه‌ی هفتگی: «${assignedSlot.topic}» — ایده‌یاب عمداً اجرا نشد`,
      }));

      ideas = [
        {
          title: assignedSlot.topic,
          hook: assignedSlot.hook,
          painPoint: assignedSlot.painPoint,
          // امتیاز و دلیل صوری‌اند: این ایده انتخاب نمی‌شود، تحمیل می‌شود.
          score: 10,
          reason: "موضوع از برنامه‌ی هفتگی آمده و انتخابی در کار نیست",
        },
      ];
    } else {
      // عنوان محتواهای قبلی اینستاگرام، برای پرهیز از تکرار
      const existing = await store.listSocialPosts({ platform: "instagram" });
      ideas = await step("social-idea-scout", "ایده‌یاب اجتماعی", async () => {
        const out = await runSocialIdeaScout({
          topicHint,
          existingTitles: existing.map((p) => p.title),
        });
        return {
          output: out,
          summary: `${out.length} ایده تولید شد؛ بهترین: «${out[0].title}»`,
        };
      });
    }

    // ── ۲. استراتژیست اینستاگرام ──
    const brief = await step("instagram-strategist", "استراتژیست اینستاگرام", async () => {
      const out = await runInstagramStrategist({
        ideas,
        topicHint,
        route,
        language,
        assignedTopic: assignedSlot?.topic,
      });
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
        // تور نجات: اگر مدل بعد از بازنویسی هم بلند نوشته، اینجا مهار
        // می‌شود. مسیر عادی نیست — چکِ «طول متن اسلایدها» باید قبلش
        // گرفته باشدش.
        slides: clampSlides(ig.draft.slides),
        hashtags: ig.draft.hashtags,
        cta: ig.draft.cta,
        checks: ig.checks,
        extras: {},
        language,
        weekId,
        imagePaths: [],
        renderedAt: null,
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

    /**
     * ── ۵٫۵. رندر تصویر اسلایدها ──
     *
     * گام جدا، بعد از ناشر — مثل گام وردپرس. ناشر یک کار دارد: ساختن
     * ردیف. اگر رندر داخلش می‌رفت، «ذخیره‌ی متن» و «ساخت تصویر» یک
     * موفقیت/شکست مشترک پیدا می‌کردند.
     *
     * ⚠️ شکستش اجرا را نمی‌کشد: `renderSlidesForPost` هیچ‌وقت throw
     * نمی‌کند و union برمی‌گرداند. کاروسلی که متنش سالم است و تصویرش
     * ساخته نشده هنوز ارزشمند است — دکمه‌ی «رندر دوباره» در استودیو
     * هست. برعکسش نه: تصویر بدون متن هیچ ارزشی ندارد.
     *
     * شناسه‌ی `slide-render` در `AGENT_IDS` نیست — کد قطعی است، درس
     * نمی‌گیرد. فقط آیکون دارد، مثل `social-publisher` و `wordpress`.
     */
    await step<unknown>("slide-render", "رندر تصویر اسلایدها", async () => {
      const result = await renderSlidesForPost(published.instagramId);
      return {
        output: result,
        summary:
          result.status === "rendered"
            ? `${result.count.toLocaleString("fa-IR")} تصویر ۱۰۸۰×۱۳۵۰ ساخته و آپلود شد`
            : result.status === "skipped"
              ? `رندر انجام نشد (${result.reason}) — متن سالم است`
              : `رندر ناموفق بود: ${result.error} — با دکمه‌ی «رندر دوباره» تلاش کنید`,
      };
    });

    // ── ۶. منتقد (خودبهبودی) ──
    // در مسیر هفتگی خاموش است و نتیجه به ارکستریتور هفته تحویل می‌شود؛
    // دلیلش بالای collectForCritic نوشته شده.
    if (opts.collectForCritic) {
      opts.collectForCritic({
        label: `کاروسل ${assignedSlot ? `«${assignedSlot.topic}»` : "اینستاگرام"}`,
        draft: ig.draft,
        review: ig.review,
        checks: ig.checks,
      });
    } else {
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
    }

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
