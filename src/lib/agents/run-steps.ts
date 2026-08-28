import "server-only";
import { getDeadline } from "@vercel/functions";
import { getStore, type PipelineRun, type StepRecord } from "@/lib/store";
import { hasTimeForStep, secondsUntilDeadline } from "./deadline-guard";

/**
 * سازنده‌ی تابع step — همان مکانیزمی که نمایش زنده‌ی استودیو را ممکن می‌کند.
 *
 * هر گام بلافاصله (هم موقع شروع، هم موقع پایان) در دیتابیس آینه می‌شود، و
 * استودیو هر ۲ ثانیه همان رکورد اجرا را می‌خواند. یعنی «وضعیت در دیتابیس،
 * نه در حافظه» — بدون وب‌سوکت، بدون صف، فقط polling ساده.
 *
 * نکته‌ی آموزشی: چرا factory و نه یک تابع معمولی که run را پارامتر بگیرد؟
 * چون step باید روی *همان* آرایه‌ی steps بنویسد که ارکستریتور در پایان
 * برمی‌گرداند. با بستن (closure) روی شیء run، این اشتراک تضمین می‌شود.
 *
 * این تابع قبلاً یک closure داخل runPipeline بود. حالا که دو ارکستریتور
 * داریم (بلاگ و بازآفرینی اجتماعی)، بیرونش کشیدیم تا هر دو دقیقاً یک رفتار
 * داشته باشند — نه دو کپیِ کمی متفاوت که با اولین تغییر از هم واگرا شوند.
 */
export function makeStepRunner(run: PipelineRun) {
  const store = getStore();

  /**
   * آینه‌کردنِ آرایه‌ی steps در دیتابیس — رصدپذیری/بازیابی‌پذیری، نه صحت.
   *
   * ⚠️ عمداً هرگز throw نمی‌کند. یک اجرای واقعیِ شکست‌خورده روی Vercel Preview
   * نشان داد که این نوشت‌ها گاهی ۴۰ تا ۷۰ ثانیه هنگ می‌کنند؛ اگر هنگ/خطای
   * آن‌ها کلِ اجرا را بشکند، محافظِ مهلت هرگز فرصتِ عمل پیدا نمی‌کند.
   * `updateRun` روی جدولِ pipeline_runs سقفِ زمانی دارد (supabase.ts) و روی
   * timeout خطا برمی‌گرداند؛ اینجا فقط با صدا لاگ می‌کنیم و می‌گذریم.
   *
   * از دست نمی‌رود چون هر `updateRun` کلِ `run.steps` را می‌نویسد: اگر آینه‌ی
   * «پایان» گامِ N نرسید، آینه‌ی «شروع» گامِ N+1 همان آرایه‌ی کامل را دوباره
   * می‌نویسد. فقط آخرین گام (منتقد) پیگیرِ بعدی ندارد و منتقد هم درس‌هایش را
   * مستقلاً در جدولِ lessons ذخیره می‌کند.
   */
  async function mirror(phase: "start" | "done" | "error", label: string) {
    try {
      await store.updateRun(run.id, { steps: run.steps });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const prefix = phase === "start" ? "[mirror-timeout]" : "[pipeline-run-persist]";
      console.error(`${prefix} آینه‌ی «${phase}» گام «${label}» ذخیره نشد — اجرا ادامه می‌یابد: ${msg}`);
    }
  }

  /** ثبت شروع/پایان هر گام + آینه‌کردن آن در دیتابیس */
  return async function step<T>(
    agent: string,
    label: string,
    fn: () => Promise<{ output: T; summary: string }>
  ): Promise<T> {
    /**
     * محافظ مهلت — **پیش از هر کاری**: پیش از push کردنِ رکوردِ «running» و
     * پیش از هر نوشتِ آینه‌ای.
     *
     * چرا اینجا و نه بعد از آینه‌ی شروع (جای قبلی‌اش): آینه‌ی شروع خودش یک
     * `await store.updateRun` است که روی Vercel Preview دیده شده ۴۰ تا ۷۰
     * ثانیه هنگ کند. اگر محافظ **پشتِ** آن نوشت باشد، تا وقتی محافظ اجرا شود
     * مهلت گذشته و «۰ ثانیه مانده» گزارش می‌دهد — دقیقاً همان چیزی که در اجرای
     * شکست‌خورده‌ی واقعی رخ داد. درخواستی که وقتِ کافی ندارد نباید حتی یک
     * ثانیه صرفِ انتظارِ Supabase کند.
     *
     * خارج از Vercel، `getDeadline()` مقدار undefined می‌دهد و
     * `hasTimeForStep` همیشه true — رفتارِ محلی بدونِ تغییر.
     */
    const deadline = getDeadline();
    if (!hasTimeForStep(deadline)) {
      const left = secondsUntilDeadline(deadline) ?? 0;
      const msg =
        `مهلت اجرا رو به پایان است (${left.toFixed(0)} ثانیه مانده) — ` +
        `گام «${label}» شروع نشد. اجرا تا همین‌جا ذخیره شد.`;
      console.error(`[deadline] ${msg}`);
      throw new Error(msg);
    }

    const record: StepRecord = {
      agent,
      label,
      status: "running",
      summary: "",
      output: null,
      startedAt: new Date().toISOString(),
      finishedAt: null,
    };
    run.steps.push(record);
    await mirror("start", label);

    // زمان‌سنجی هر گام. روی Vercel سقف اجرا ۳۰۰ ثانیه است و بدون این،
    // «کجا وقت می‌رود» فقط حدس است. هزینه‌اش یک Date.now() است.
    const t0 = Date.now();
    const elapsed = () => ((Date.now() - t0) / 1000).toFixed(1);

    try {
      const { output, summary } = await fn();
      record.status = "done";
      record.summary = summary;
      record.output = output;
      record.finishedAt = new Date().toISOString();
      await mirror("done", label);
      console.log(`[timing] ${agent.padEnd(20)} ${elapsed().padStart(6)}s  ${label}`);
      return output;
    } catch (err) {
      record.status = "error";
      record.summary = err instanceof Error ? err.message : String(err);
      record.finishedAt = new Date().toISOString();
      await mirror("error", label);
      console.log(`[timing] ${agent.padEnd(20)} ${elapsed().padStart(6)}s  ${label} — خطا`);
      throw err;
    }
  };
}
