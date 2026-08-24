import "server-only";
import { randomUUID } from "crypto";
import {
  getStore,
  type ContentWeek,
  type WeekRunRef,
  type WeeklySlotData,
} from "@/lib/store";
import { weekStart as computeWeekStart } from "@/lib/week";
import { runWeeklyPlanner, RECENT_TITLES_DAYS } from "./weekly-planner";
import { WEEKLY_GRID, sceneFamilyFor } from "./weekly-grid";
import { runInstagramPipeline } from "./instagram-orchestrator";
import { runSocialCritic, type SocialCriticPart } from "./critic";

/**
 * ارکستریتور هفتگی — لایه‌ی بالای پایپ‌لاین اینستاگرام.
 *
 * یک هفته می‌گیرد، برنامه‌ی هفت‌اسلاتی می‌سازد، و هفت کاروسل تولید می‌کند.
 *
 * ── چهار تصمیم و دلیلشان ──
 *
 * ۱. **هیچ رکورد `pipeline_runs` برای خودِ هفته ساخته نمی‌شود و `RunKind`
 *    دست نمی‌خورد.** والد در `content_weeks` زندگی می‌کند و هفت فرزند
 *    `kind: "instagram"` می‌گیرند — دقیقاً الگوی `campaign-orchestrator`
 *    که والدش در `content_campaigns` است و هیچ‌جا `kind: "campaign"` ست
 *    نمی‌شود. `kind` می‌گوید این اجرا چه چیزی تولید کرد، نه چه کسی راهش
 *    انداخت؛ منشأ کارِ `week_id` است.
 *
 *    سود عملی: هیچ فایل استودیویی دست نمی‌خورد. اگر `"weekly"` اضافه
 *    می‌شد، فیلترِ `RunPanel.tsx` (که فهرست سیاه است، نه سفید) بی‌صدا
 *    هفت رکورد در هفته به تاریخچه‌ی پنل بلاگ می‌ریخت.
 *
 * ۲. **موازی با allSettled.** هر اجرا رکورد `pipeline_runs` و آرایه‌ی
 *    `steps` خودش را دارد، پس هیچ state مشترکی نیست — همان استدلال
 *    `campaign-orchestrator` که به تعداد کانال وابسته نبود. و شکست یک
 *    روز نباید شش روز دیگر را از بین ببرد.
 *
 *    عدد اندازه‌گیری‌شده: هر اجرا ۳۴ ثانیه (۵ فراخوانی، بدون بازنویسی).
 *    موازی یعنی زمان کل ≈ زمان کندترین اجرا، با فاصله‌ی زیاد از سقف ۳۰۰
 *    ثانیه. (ترتیبی هم جا می‌شد — ۷×۳۴ ≈ ۲۳۸ — ولی با یک دور بازنویسی
 *    به ~۳۲۱ می‌رسید و رد می‌شد.)
 *
 * ۳. **یک منتقد برای کل هفته، نه هفت منتقد.** این مهم‌ترین قید این فایل
 *    است و شرحش پایین‌تر آمده.
 *
 * ۴. **ایده‌یاب در این مسیر اجرا نمی‌شود.** برنامه‌ریز `topic` و `hook` و
 *    `painPoint` را ساخته، پس ورودی استراتژیست کامل است. توضیحش بالای
 *    `assignedSlot` در `instagram-orchestrator.ts`.
 *
 * ── چرا دو تابع، نه یکی ──
 *
 * `planWeek` و `runWeek` عمداً جدا هستند و پشت سر هم صدا زده نمی‌شوند.
 *
 * اجرای هفته یعنی هفت پایپ‌لاین موازی و حدود ۳۵ فراخوانی مدل. اگر
 * برنامه بد باشد — هفت موضوع شبیه هم، یا مرحله‌ی سفر یک‌نواخت — باید
 * **پیش از** سوزاندن آن هفت اجرا معلوم شود، نه بعدش.
 *
 * و این همان الگویی است که کل سیستم دارد: ناشر بلاگ فقط با تأیید
 * ویراستار منتشر می‌کند، محتوای اجتماعی همیشه «پیش‌نویس» می‌ماند تا
 * انسان تأیید کند، و انتقال به وردپرس دکمه‌ی جداست. برنامه‌ی هفته هم
 * یک خروجی میانی است که انسان باید ببیندش.
 */

/**
 * فاز ۱ — فقط برنامه‌ریزی.
 *
 * ردیف `content_weeks` را با `plan` می‌سازد و همان‌جا می‌ایستد.
 * هیچ اجرای اینستاگرامی راه نمی‌افتد. یک فراخوانی مدل.
 *
 * وضعیت `"running"` می‌ماند چون constraint دیتابیس فقط
 * running/done/error را می‌پذیرد و «برنامه‌ریزی‌شده» حالت سومی نیست
 * که ارزش drop/recreate کردن constraint را داشته باشد. تفکیکش از روی
 * داده خوانده می‌شود: `plan.length > 0 && runIds.length === 0`.
 */
export async function planWeek(opts: {
  /** لحظه‌ی مرجع برای محاسبه‌ی هفته. پیش‌فرض: همین حالا */
  at?: Date;
  /**
   * اجازه‌ی برنامه‌ریزی دوباره‌ی هفته‌ای که از قبل وجود دارد.
   *
   * پیش‌فرض `false` است چون ستون `week_start` در دیتابیس **unique** است و
   * insert دوم با خطای مبهم Postgres می‌شکند. با محافظ، پیام روشن می‌گیریم.
   */
  force?: boolean;
}): Promise<ContentWeek> {
  const store = getStore();
  const ws = computeWeekStart(opts.at ?? new Date());

  // ── محافظ تکرار ──
  // پیش از فراخوانی مدل، نه بعدش.
  const existing = await store.getWeekByStart(ws);
  if (existing && !opts.force) {
    console.log(`[weekly] هفته‌ی ${ws} از قبل برنامه دارد (${existing.plan.length} اسلات) — دوباره ساخته نشد`);
    return existing;
  }

  const week: ContentWeek = {
    id: randomUUID(),
    weekStart: ws,
    plan: [],
    runIds: [],
    status: "running",
    error: null,
    createdAt: new Date().toISOString(),
    finishedAt: null,
  };
  await store.createWeek(week);
  console.log(`[weekly] برنامه‌ریزی هفته‌ی ${ws} — ${week.id}`);

  try {
    // حافظه‌ی تکرار: عنوان محتواهای اخیر اینستاگرام.
    // ⚠️ فیلتر تاریخ سمت کد است، نه کوئری: listSocialPosts پارامتر بازه
    // ندارد و افزودنش به قرارداد store برای یک مصرف‌کننده زود است.
    const cutoff = Date.now() - RECENT_TITLES_DAYS * 24 * 60 * 60 * 1000;
    const recent = await store.listSocialPosts({ platform: "instagram" });
    const recentTitles = recent
      .filter((p) => new Date(p.createdAt).getTime() >= cutoff)
      .map((p) => p.title);

    const plan = await runWeeklyPlanner({ recentTitles, weekStart: ws });

    /**
     * ادغام برنامه با شبکه — کار کد، نه مدل.
     *
     * ⚠️ اتصال با `day` است، نه با ترتیب آرایه. اسکیما `length(7)` را
     * الزام می‌کند ولی نمی‌تواند بگوید ترتیب درست است؛ اگر مدل اسلات‌ها
     * را جابه‌جا برگرداند، تکیه بر ترتیب یعنی موضوع دوشنبه با زبان و
     * مسیر شنبه تولید می‌شود — بی‌صدا و کاملاً غلط.
     */
    const slots: WeeklySlotData[] = WEEKLY_GRID.map((config) => {
      const fromModel = plan.slots.find((s) => s.day === config.day);
      if (!fromModel) {
        throw new Error(
          `برنامه‌ریز برای روز ${config.day} (${config.dayLabel}) اسلاتی نداد — ` +
            `روزهای برگشتی: ${plan.slots.map((s) => s.day).join("، ")}`
        );
      }
      return {
        // از شبکه — پیکربندی برند
        day: config.day,
        language: config.language,
        route: config.route,
        audienceGroup: config.audienceGroup,
        contentType: config.contentType,
        // از مدل
        journeyStage: fromModel.journeyStage,
        topic: fromModel.topic,
        hook: fromModel.hook,
        painPoint: fromModel.painPoint,
      };
    });

    week.plan = slots;
    await store.updateWeek(week.id, { plan: slots });

    const stages = new Set(slots.map((s) => s.journeyStage));
    console.log(
      `[weekly] برنامه ساخته شد — ${slots.length} اسلات، ${stages.size} مرحله‌ی متمایز از سفر`
    );

    return week;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[weekly] برنامه‌ریزی هفته‌ی ${ws} شکست: ${message}`);
    week.status = "error";
    week.error = message;
    week.finishedAt = new Date().toISOString();
    await store.updateWeek(week.id, {
      status: "error",
      error: message,
      finishedAt: week.finishedAt,
    });
    return week;
  }
}

/**
 * فاز ۲ — اجرای هفت اسلاتِ یک برنامه‌ی موجود.
 *
 * برنامه را نمی‌سازد؛ فقط اجرا می‌کند. اگر هفته برنامه نداشته باشد یا
 * از قبل اجرا شده باشد، بدون سوزاندن هیچ فراخوانی مدلی برمی‌گردد.
 */
export async function runWeek(opts: {
  weekId: string;
  /** اجازه‌ی اجرای دوباره‌ی هفته‌ای که قبلاً اجرا شده */
  force?: boolean;
}): Promise<ContentWeek> {
  const store = getStore();

  const week = await store.getWeek(opts.weekId);
  if (!week) throw new Error(`هفته‌ی ${opts.weekId} پیدا نشد`);

  // ── دو محافظ، هر دو پیش از فراخوانی مدل ──
  if (week.plan.length === 0) {
    throw new Error(
      `هفته‌ی ${week.weekStart} هنوز برنامه ندارد — اول planWeek را اجرا کن`
    );
  }
  if (week.runIds.length > 0 && !opts.force) {
    console.log(
      `[weekly] هفته‌ی ${week.weekStart} از قبل اجرا شده (${week.runIds.length} اجرا) — دوباره اجرا نشد`
    );
    return week;
  }

  const ws = week.weekStart;
  const slots = week.plan;
  console.log(`[weekly] اجرای هفته‌ی ${ws} — ${slots.length} اسلات`);

  week.status = "running";
  week.error = null;
  week.finishedAt = null;
  await store.updateWeek(week.id, { status: "running", error: null, finishedAt: null });

  try {
    /* ── ۱. شناسه‌ی اجراها، پیش از شروع ── */

    // مثل کمپین: شناسه‌ها را قبل از اجرا می‌سازیم و ذخیره می‌کنیم تا
    // استودیو بتواند بلافاصله هر هفت را poll کند، حتی پیش از ساخته‌شدن
    // رکوردشان.
    const refs: WeekRunRef[] = slots.map((s) => ({
      day: s.day,
      runId: randomUUID(),
      status: "running",
    }));
    week.runIds = refs;
    await store.updateWeek(week.id, { runIds: refs });

    /* ── ۲. هفت اجرای موازی ── */

    /**
     * قطعه‌های منتقد، از داخل اجراها جمع می‌شوند.
     *
     * ⚠️ چرا callback و نه خواندن از `run.steps`: خروجی گام ویراستار
     * `unknown` است و برای بازیابی‌اش باید نام ایجنت را رشته‌ای match
     * کنیم — همان شکنندگی‌ای که CLAUDE.md درباره‌ی match رشته‌ای هشدار
     * می‌دهد. callback تایپ‌دار است و با تغییر نام گام نمی‌شکند.
     *
     * ترتیبِ push غیرقطعی است (هر اجرا وقتی تمام شد push می‌کند)، پس
     * بعداً بر اساس day مرتب می‌شود تا گزارش منتقد پایدار بماند.
     */
    const parts: (SocialCriticPart & { day: number })[] = [];

    const results = await Promise.allSettled(
      slots.map((slot, i) => {
        /**
         * ⚠️ `route` از خودِ شبکه خوانده می‌شود، نه از `slot.route`.
         *
         * `WeeklySlotData.route` رشته است — لایه‌ی store عمداً به ایجنت‌ها
         * وابسته نیست، پس تایپ `BrandRoute` را ندارد. خواندن از شبکه هم
         * cast را حذف می‌کند و هم تضمین می‌کند مقدار از پیکربندی برند آمده.
         *
         * و اتصال با `day` است، نه با اندیس. امروز `slots` دقیقاً از
         * `WEEKLY_GRID.map` ساخته می‌شود پس `WEEKLY_GRID[i]` هم درست
         * جواب می‌داد — ولی آن یک وابستگی ضمنی به ترتیب است و اولین
         * مرتب‌سازی یا فیلترِ `slots` بی‌صدا مسیر اشتباه می‌داد. همان
         * دلیلی که چند خط بالاتر ادغام برنامه هم کلیدشده است.
         */
        const config = WEEKLY_GRID.find((g) => g.day === slot.day);
        if (!config) {
          throw new Error(
            `اسلات روز ${slot.day} در WEEKLY_GRID نیست — ` +
              `روزهای شبکه: ${WEEKLY_GRID.map((g) => g.day).join("، ")}`
          );
        }

        return runInstagramPipeline({
          runId: refs[i].runId,
          route: config.route,
          language: config.language,
          assignedSlot: {
            topic: slot.topic,
            hook: slot.hook,
            painPoint: slot.painPoint,
          },
          sceneFamily: sceneFamilyFor(config, ws).hint,
          weekId: week.id,
          // منتقدِ داخل اجرا خاموش می‌شود؛ دلیلش پایین‌تر
          collectForCritic: (part) => parts.push({ ...part, day: slot.day }),
        });
      })
    );

    const finalRefs: WeekRunRef[] = refs.map((ref, i) => {
      const r = results[i];
      if (r.status === "rejected") {
        // allSettled خطا را می‌بلعد؛ بی‌صدا نگذاریمش.
        console.error(
          `[weekly] اجرای روز ${ref.day} رد شد: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`
        );
      }
      return { ...ref, status: r.status === "fulfilled" ? r.value.status : "error" };
    });
    week.runIds = finalRefs;

    const failed = finalRefs.filter((r) => r.status === "error");
    console.log(
      `[weekly] ${finalRefs.length - failed.length} از ${finalRefs.length} اجرا موفق بود`
    );

    /* ── ۳. یک منتقد برای کل هفته ── */

    /**
     * ⚠️ این بخش از یک خطر واقعی درآمد، نه از سلیقه.
     *
     * `saveLessons` در critic.ts یک read-modify-write بدون قفل است:
     * addLesson → listLessons → deactivateLesson روی هر چیز بعد از
     * `MAX_ACTIVE_LESSONS_PER_AGENT = 8`.
     *
     * اجراها هم‌طول‌اند (۳۴ ثانیه)، پس هر هفت منتقد تقریباً هم‌زمان به
     * آن بلوک می‌رسیدند و همه روی همان چهار ایجنت می‌نوشتند. تا ۲۱ درس
     * در یک بازه‌ی چندثانیه‌ای، روی سقفِ ۸ — یعنی **یک اجرای هفتگی کل
     * حافظه‌ی درسِ آن ایجنت‌ها را پاک می‌کرد** و جایش را با درس‌های همان
     * بچ پر می‌کرد. و آن ۲۱ درس به‌شدت هم‌بسته‌اند: هفت منتقد که هفت
     * محتوای هم‌زمان با پرامپت یکسان را قضاوت می‌کنند، یک حرف را هفت جور
     * می‌نویسند.
     *
     * خرابی داده نبود (هر عملیات تک‌ردیفی و اتمیک است) — از دست‌رفتن
     * حافظه‌ی خودبهبودی بود، که بدتر است چون بی‌صدا اتفاق می‌افتد.
     *
     * `runSocialCritic` از قبل آرایه می‌گیرد، پس یک فراخوانی با هفت
     * قطعه هم مسابقه را حذف می‌کند، هم درس‌ها را به سطح هفته می‌برد
     * («این هفته چه الگویی داشت؟» به‌جای «این پست چه ایرادی داشت؟»)، و
     * هم شش فراخوانی مدل صرفه‌جویی می‌کند.
     *
     * خطای منتقد نباید هفته‌ای که تولید شده را خراب کند — همان قاعده‌ی
     * makeStepRunner، اینجا دستی چون گام نیست.
     */
    if (parts.length > 0) {
      try {
        const ordered = [...parts].sort((a, b) => a.day - b.day);
        const critique = await runSocialCritic({
          context:
            `نوع اجرا: هفته‌ی محتوایی اینستاگرام (${ws}) — ${ordered.length} کاروسل در یک هفته. ` +
            `موضوع‌ها از برنامه‌ریز هفتگی آمده‌اند، نه از ایده‌یاب. ` +
            `به الگوی کل هفته نگاه کن، نه فقط به تک‌تک پست‌ها: آیا هفت موضوع واقعاً متمایز بودند؟ ` +
            `آیا توزیع مرحله‌ی سفر معنادار بود؟`,
          parts: ordered.map(({ day, ...p }) => p),
          // این عدد در سطح هفته معنی ندارد؛ صفر می‌دهیم تا ادعای غلط نسازیم.
          revisionRounds: 0,
        });
        console.log(
          `[weekly] منتقد هفته: امتیاز ${critique.overallScore}/100 — ${critique.lessons.length} درس`
        );
      } catch (err) {
        console.error(
          `[weekly] منتقد هفته ناموفق بود (هفته سالم است): ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    /* ── ۴. بستن هفته ── */

    week.status = failed.length === finalRefs.length ? "error" : "done";
    week.error =
      failed.length > 0
        ? `${failed.length} از ${finalRefs.length} روز ناموفق بود: ${failed.map((f) => f.day).join("، ")}`
        : null;
    week.finishedAt = new Date().toISOString();

    await store.updateWeek(week.id, {
      runIds: finalRefs,
      status: week.status,
      error: week.error,
      finishedAt: week.finishedAt,
    });

    return week;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[weekly] اجرای هفته‌ی ${ws} شکست: ${message}`);
    week.status = "error";
    week.error = message;
    week.finishedAt = new Date().toISOString();
    await store.updateWeek(week.id, {
      status: "error",
      error: message,
      finishedAt: week.finishedAt,
    });
    return week;
  }
}
