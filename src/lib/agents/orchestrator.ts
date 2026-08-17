import "server-only";
import { randomUUID } from "crypto";
import { getStore, type PipelineRun, type Post } from "@/lib/store";
import { makeStepRunner } from "./run-steps";
import { runIdeaScout } from "./idea-scout";
import { runStrategist } from "./strategist";
import { runResearcher } from "./researcher";
import { runWriter, runWriterRevision } from "./writer";
import { runEditor, APPROVE_THRESHOLD } from "./editor";
import {
  applySafeBrandFixes,
  blockingFailures,
  runBrandChecks,
  runBriefChecks,
  type BrandCheck,
} from "./brand-checks";
import { allowedCtaIds } from "./brand-cta";
import { finalizeArticle } from "./article-format";
import { syncPostToWordPress } from "@/lib/wordpress";
import { runSeo } from "./seo";
import { runCritic } from "./critic";
import type { Review } from "./types";
import type { BrandRoute } from "@/lib/company";

/**
 * ارکستریتور — رهبر ارکستر پایپ‌لاین.
 *
 * نکته‌ی آموزشی مهم: ارکستریتور خودش LLM نیست؛ کد قطعی است.
 * «تصمیم‌های خلاقانه» با ایجنت‌هاست، ولی «جریان کار» (ترتیب، حلقه‌ی
 * بازبینی، شرط‌ها، ثبت وضعیت) با کد معمولی — چون جریان کار باید
 * قابل پیش‌بینی، قابل دیباگ و قابل تست باشد. رایج‌ترین اشتباه در
 * ساخت مولتی‌ایجنت این است که orchestration را هم به LLM بسپارید.
 *
 * جریان:
 * ایده‌یاب → استراتژیست → پژوهشگر → نویسنده ⇄ ویراستار (حداکثر ۲ دور
 * بازنویسی) → سئو → ناشر → انتقال به وردپرس (فقط اگر تأیید شده) →
 * منتقد (استخراج درس برای اجراهای بعد)
 *
 * هر گام بلافاصله در store ثبت می‌شود تا استودیو بتواند پیشرفت را
 * زنده نمایش دهد (الگوی «وضعیت در دیتابیس، نه در حافظه»).
 */

const MAX_REVISION_ROUNDS = 2;

export async function runPipeline(opts: {
  runId: string;
  topicHint?: string | null;
  /**
   * مسیر برند این مقاله. استودیو همیشه می‌فرستدش؛ کرون هفتگی انسانی پشتش
   * ندارد و پیش‌فرض «brand» می‌گیرد — یعنی محتوای سطح برند که نسبت به دو
   * مسیر بی‌طرف است. همان چیزی که برای محتوای بدون هدف‌گیری مشخص درست است.
   */
  route?: BrandRoute;
}): Promise<PipelineRun> {
  const store = getStore();
  const runId = opts.runId;
  const topicHint = opts.topicHint?.trim() || null;
  const route: BrandRoute = opts.route ?? "brand";

  const run: PipelineRun = {
    id: runId,
    kind: "blog",
    status: "running",
    topicHint,
    steps: [],
    postId: null,
    // این دو فقط برای اجرای بازآفرینی معنی دارند
    sourcePostId: null,
    socialPostIds: [],
    error: null,
    createdAt: new Date().toISOString(),
    finishedAt: null,
  };
  await store.createRun(run);

  // ثبت زنده‌ی گام‌ها — پیاده‌سازی مشترک با ارکستریتور بازآفرینی
  const step = makeStepRunner(run);

  try {
    const existingPosts = await store.listPosts();

    // ── ۱. ایده‌یاب ──
    const ideas = await step("idea-scout", "ایده‌یاب", async () => {
      const out = await runIdeaScout({
        topicHint,
        existingTitles: existingPosts.map((p) => p.title),
      });
      return { output: out, summary: `${out.length} ایده تولید شد؛ بهترین: «${out[0].title}»` };
    });

    // ── ۲. استراتژیست ──
    const brief = await step("strategist", "استراتژیست محتوا", async () => {
      const out = await runStrategist({ ideas, topicHint, route });

      // هدف‌گیری مبهم و CTAی خارج از مسیر باید همین‌جا بمیرند، نه ده گام بعد.
      // بریفِ «برای همه» یعنی مقاله‌ی بی‌قلاب — و هزینه‌ی کشفش بعد از نگارش،
      // یک اجرای کامل است.
      const briefChecks = runBriefChecks({
        audience: out.audience,
        title: out.title,
        ctaId: out.ctaId,
        allowedCtaIds: allowedCtaIds(route),
      });
      const failed = briefChecks.filter((c) => !c.pass);
      if (failed.length > 0) {
        throw new Error(
          `بریف رد شد: ${failed.map((c) => c.note).join(" | ")}`
        );
      }

      return {
        output: out,
        summary: `بریف «${out.title}» — ${out.route} / ${out.audienceGroup} / ${out.journeyStage} — CTA: ${out.ctaId}، کلیدواژه: ${out.primaryKeyword}، ${out.outline.length} بخش`,
      };
    });

    // ── ۳. پژوهشگر ──
    const research = await step("researcher", "پژوهشگر", async () => {
      const out = await runResearcher({ brief });
      const web = out.sources.length
        ? ` (جستجوی وب — ${out.sources.length} منبع)`
        : process.env.TAVILY_API_KEY
          ? " (جستجوی وب بدون نتیجه)"
          : " (بدون جستجوی وب)";
      return {
        output: out,
        summary: `${out.keyFacts.length} فکت و ${out.commonQuestions.length} سؤال رایج${web}`,
      };
    });

    // ── ۴ و ۵. نویسنده ⇄ ویراستار (حلقه‌ی بازبینی) ──
    /**
     * اصلاح واژگانی قطعی، بلافاصله بعد از هر پیش‌نویس.
     *
     * این‌ها قضاوت لازم ندارند («فیومنت» همیشه غلط است) و اگر به حلقه‌ی
     * بازنویسی می‌رفتند، هر کدام یک فراخوانی مدل و ~۳۰ ثانیه هزینه داشت.
     * فهرست در brand-checks.ts عمداً کوتاه و بی‌ابهام است.
     */
    const fixDraft = (text: string, label: string): string => {
      const { text: fixed, applied } = applySafeBrandFixes(text);
      if (applied.length) {
        console.log(`[brand-fix] ${label}: ${applied.join("، ")}`);
      }
      return fixed;
    };

    let draft = await step("writer", "نویسنده — پیش‌نویس اول", async () => {
      const out = fixDraft(await runWriter({ brief, research }), "پیش‌نویس اول");
      return { output: out, summary: `پیش‌نویس ${out.split(/\s+/).length} کلمه‌ای نوشته شد` };
    });

    // چک‌های قطعی برند روی پیش‌نویس — قبل از ویراستار، چون خروجی‌شان ورودی اوست
    let brandChecks: BrandCheck[] = runBrandChecks({ text: draft });

    let review: Review = await step("editor", "ویراستار — بازبینی اول", async () => {
      const out = await runEditor({ brief, draft, failedBrandChecks: brandChecks });
      const passed = brandChecks.filter((c) => c.pass).length;
      return {
        output: { review: out, brandChecks },
        summary: `امتیاز ${out.score}/100 — چک برند ${passed}/${brandChecks.length} پاس — ${out.verdict === "approve" ? "تأیید شد" : `${out.issues.length} ایراد`}`,
      };
    }).then((r) => r.review);

    /**
     * شرط بازنویسی: نظر ویراستار (قضاوت) **یا** ردشدن یک چک **مسدودکننده**.
     *
     * همان درسی که در social-loop.ts ثبت شده: قضاوت مدل نباید نتیجه‌ی
     * اندازه‌گیری قطعی را دور بزند. یک «تضمینی» در متن، ادعای حقوقی است —
     * امتیاز ۸۵ ویراستار آن را بی‌خطر نمی‌کند.
     *
     * ⚠️ ولی فقط چک‌های مسدودکننده. تا پیش از این، هر چک ردشده‌ای بازنویسی
     * می‌ساخت و در یک اجرای اندازه‌گیری‌شده، واژه‌ی «مشتریان» دو دور کامل
     * (۶۶ ثانیه از ۲۰۱) هزینه ساخت — در حالی که ویراستار از پاس اول تأیید
     * کرده بود. چک‌های واژگانی همچنان به ویراستار گزارش می‌شوند و جلوی
     * انتشار خودکار را می‌گیرند؛ فقط دیگر به‌تنهایی بازنویسی نمی‌سازند.
     */
    const needsRevision = (r: Review, cs: BrandCheck[]) =>
      r.verdict === "revise" || blockingFailures(cs).length > 0;

    let revisionRounds = 0;
    while (needsRevision(review, brandChecks) && revisionRounds < MAX_REVISION_ROUNDS) {
      revisionRounds++;
      const round = revisionRounds;
      const failedBrand = brandChecks.filter((c) => !c.pass);

      draft = await step("writer", `نویسنده — بازنویسی ${round}`, async () => {
        const out = fixDraft(
          await runWriterRevision({
            brief,
            research,
            draft,
            review,
            failedBrandChecks: failedBrand,
          }),
          `بازنویسی ${round}`
        );
        return {
          output: out,
          summary: `بازنویسی بر اساس ${review.issues.length} ایراد ویراستار و ${failedBrand.length} چک ردشده`,
        };
      });

      brandChecks = runBrandChecks({ text: draft });

      review = await step("editor", `ویراستار — بازبینی ${round + 1}`, async () => {
        const out = await runEditor({ brief, draft, failedBrandChecks: brandChecks });
        const passed = brandChecks.filter((c) => c.pass).length;
        return {
          output: { review: out, brandChecks },
          summary: `امتیاز ${out.score}/100 — چک برند ${passed}/${brandChecks.length} پاس — ${out.verdict === "approve" ? "تأیید شد" : "هنوز ایراد دارد"}`,
        };
      }).then((r) => r.review);
    }
    // نکته: اگر بعد از سقف بازنویسی هنوز revise بود، ادامه می‌دهیم اما پست
    // «پیش‌نویس» می‌ماند تا انسان تصمیم نهایی را بگیرد (human-in-the-loop).

    // ── ۶. متخصص سئو ──
    const { seo, checks } = await step("seo", "متخصص سئو", async () => {
      const out = await runSeo({
        brief,
        contentMd: draft,
        existingSlugs: existingPosts.map((p) => p.slug),
      });
      const passed = out.checks.filter((c) => c.pass).length;
      return {
        output: out,
        summary: `متادیتا ساخته شد — چک‌لیست: ${passed}/${out.checks.length} پاس`,
      };
    });

    // ── ۷. ناشر ──
    // انتشار خودکار سه شرط دارد؛ چک قطعی برند وتوی مطلق است: یک ادعای
    // «تضمینی» یا «وکیل» در متن، مسئله‌ی حقوقی است و امتیاز بالای ویراستار
    // آن را بی‌خطر نمی‌کند.
    const brandOk = brandChecks.every((c) => c.pass);
    const approved =
      review.verdict === "approve" && review.score >= APPROVE_THRESHOLD && brandOk;
    const post = await step("publisher", "ناشر", async () => {
      const now = new Date().toISOString();

      // تاریخ و منابع اینجا اضافه می‌شوند، نه در پرامپت نویسنده: هر دو
      // داده‌ی قطعی‌اند و بعد از چک‌های برند اعمال می‌شوند تا ارقام لاتینِ
      // تاریخ میلادی و لینک‌ها بی‌دلیل چک را نشکنند.
      const contentMd = finalizeArticle({
        contentMd: draft,
        sources: research.sources,
        updatedAt: now,
      });

      const p: Post = {
        id: randomUUID(),
        runId,
        title: brief.title,
        slug: seo.slug,
        excerpt: seo.excerpt,
        contentMd,
        metaTitle: seo.metaTitle,
        metaDescription: seo.metaDescription,
        keywords: seo.keywords,
        faq: seo.faq,
        score: review.score,
        status: approved ? "published" : "draft",
        createdAt: now,
        publishedAt: approved ? now : null,
        // گام بعدی پرشان می‌کند، اگر تأیید شده باشد و وردپرس تنظیم باشد
        wpPostId: null,
        wpEditLink: null,
      };
      await store.createPost(p);
      return {
        output: { postId: p.id, slug: p.slug, status: p.status },
        summary: approved
          ? `منتشر شد: /blog/${p.slug}`
          : !brandOk
            ? `به‌عنوان پیش‌نویس ذخیره شد — ${brandChecks.filter((c) => !c.pass).length} چک قطعی برند رد شد (نیاز به تأیید انسانی)`
            : `به‌عنوان پیش‌نویس ذخیره شد (امتیاز ${review.score} — نیاز به تأیید انسانی)`,
      };
    });

    run.postId = post.postId;
    await store.updateRun(runId, { postId: post.postId });

    // ── ۸. انتقال به وردپرس ──
    // فقط پست‌های تأییدشده می‌روند. مقاله‌ای که ویراستار ردش کرده یا چک
    // برند را نگذرانده، منتظر تصمیم انسان می‌ماند و از استودیو فرستاده
    // می‌شود — وگرنه وردپرس پر از پیش‌نویس بی‌کیفیت می‌شد.
    //
    // مثل گام منتقد، هیچ خطایی نباید اجرای موفق را خراب کند: انتقال یک
    // «تلاش حداکثری» است و اگر شکست بخورد، دکمه‌ی تلاش مجدد در استودیو
    // هست. برای همین همه‌چیز داخل try/catch است و همیشه done برمی‌گردد.
    await step<unknown>("wordpress", "انتقال به وردپرس", async () => {
      if (!approved) {
        return {
          output: { skipped: "not-approved" },
          summary: "منتقل نشد — پست تأیید نشده و منتظر تصمیم انسانی است",
        };
      }

      try {
        const out = await syncPostToWordPress(post.postId);

        if (out.status === "sent") {
          return { output: out, summary: `پیش‌نویس در وردپرس ساخته شد (${out.wpPostId})` };
        }
        if (out.status === "skipped") {
          return {
            output: out,
            summary:
              out.reason === "not-configured"
                ? "وردپرس تنظیم نشده — از این مرحله رد شد"
                : "از قبل در وردپرس بود",
          };
        }
        return { output: out, summary: `انتقال ناموفق — ${out.error.slice(0, 90)}` };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          output: { error: message },
          summary: `انتقال ناموفق (اجرای اصلی سالم است) — ${message.slice(0, 70)}`,
        };
      }
    });

    // ── ۹. منتقد (خودبهبودی) ──
    // خطای منتقد نباید اجرای موفق را خراب کند؛ درس‌گرفتن «تلاش حداکثری» است.
    await step<unknown>("critic", "منتقد — استخراج درس", async () => {
      try {
        const fullPost = (await store.getPost(post.postId))!;
        const out = await runCritic({
          post: fullPost,
          editorReview: review,
          seoChecks: checks,
          brandChecks,
          revisionRounds,
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
