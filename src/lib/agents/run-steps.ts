import "server-only";
import { getDeadline } from "@vercel/functions";
import { getStore, type PipelineRun, type StepRecord } from "@/lib/store";

/**
 * کمینه‌ی زمان لازم برای شروع یک گام تازه.
 * کندترین گام در اندازه‌گیری واقعی ۳۶ ثانیه بود (پژوهشگر).
 * خارج از Vercel، getDeadline مقدار undefined می‌دهد و این محافظ خاموش است.
 */
const MIN_SECONDS_FOR_STEP = 40;

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

  /** ثبت شروع/پایان هر گام + آینه‌کردن آن در دیتابیس */
  return async function step<T>(
    agent: string,
    label: string,
    fn: () => Promise<{ output: T; summary: string }>
  ): Promise<T> {
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
    await store.updateRun(run.id, { steps: run.steps });

    /**
     * محافظ مهلت — پیش از شروع هر گام.
     *
     * روی Vercel، تابع در `maxDuration` کشته می‌شود چه پاسخ داده باشد چه
     * نه (`waitUntil` هم همان مهلت را دارد؛ مستندات صریح است). کشته‌شدنِ
     * ناگهانی یعنی رکورد اجرا برای همیشه روی «running» می‌ماند و استودیو
     * تا ابد poll می‌کند.
     *
     * پس قبل از شروع هر گام می‌پرسیم آیا وقت کافی هست. اگر نه، تمیز
     * می‌ایستیم و اجرا با پیام روشن «error» می‌شود — کاربر می‌بیند تا کجا
     * پیش رفته و کدام گام شروع نشده.
     *
     * آستانه ۴۰ ثانیه است چون کندترین گام (پژوهشگر) در اندازه‌گیری ۳۶
     * ثانیه طول کشید.
     */
    const deadline = getDeadline();
    if (deadline) {
      const left = (deadline.getTime() - Date.now()) / 1000;
      if (left < MIN_SECONDS_FOR_STEP) {
        const msg =
          `مهلت اجرا رو به پایان است (${left.toFixed(0)} ثانیه مانده) — ` +
          `گام «${label}» شروع نشد. اجرا تا همین‌جا ذخیره شد.`;
        console.error(`[deadline] ${msg}`);
        throw new Error(msg);
      }
    }

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
      await store.updateRun(run.id, { steps: run.steps });
      console.log(`[timing] ${agent.padEnd(20)} ${elapsed().padStart(6)}s  ${label}`);
      return output;
    } catch (err) {
      record.status = "error";
      record.summary = err instanceof Error ? err.message : String(err);
      record.finishedAt = new Date().toISOString();
      await store.updateRun(run.id, { steps: run.steps });
      console.log(`[timing] ${agent.padEnd(20)} ${elapsed().padStart(6)}s  ${label} — خطا`);
      throw err;
    }
  };
}
