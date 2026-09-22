/**
 * تفسیرِ پاسخِ POST ِ شروعِ اجرا — منطقِ خالص، بدونِ React/fetch.
 *
 * چرا جدا: وقتی تابع روی Vercel در مهلتِ ۳۰۰ ثانیه کشته می‌شود، بدنه‌ی پاسخ
 * دیگر JSON ِ ما نیست — یک متن/HTML ِ خودِ پلتفرم است. `res.json()` مستقیم
 * روی آن `SyntaxError: Unexpected token 'A'...` می‌دهد و همان خام به کاربر
 * نشان داده می‌شد. اینجا بدنه را امن می‌خوانیم و پیامِ مفید می‌سازیم.
 *
 * جدا بودن این فایل، تستِ منطقِ خالص را ممکن می‌کند (الگوی tsc جدا).
 */

/** پیامِ خطای قابل‌نمایش برای یک پاسخِ غیرموفق (`res.ok === false`). */
export function readRunError(status: number, rawBody: string): string {
  // اگر بدنه JSON ِ معتبرِ ما بود و فیلدِ error داشت، همان را نشان بده.
  try {
    const parsed = JSON.parse(rawBody);
    if (parsed && typeof parsed.error === "string" && parsed.error.trim()) {
      return parsed.error;
    }
  } catch {
    /* بدنه‌ی غیرJSON — خطای خودِ پلتفرم (مثلاً کشته‌شدن در مهلت) */
  }

  const timedOut =
    status === 504 ||
    status === 408 ||
    /timed out|timeout|FUNCTION_INVOCATION_TIMEOUT/i.test(rawBody);

  if (timedOut) {
    return (
      "سرور در مهلت مقرر پاسخ نداد (۵۰۴). اجرا ممکن است تا گامی پیش رفته و " +
      "ذخیره شده باشد — تایم‌لاینِ همین اجرا و فهرستِ محتوای تولیدشده را ببینید."
    );
  }

  if (status >= 500) {
    return `خطای سرور (${status}). اگر تکرار شد، لاگ‌ها را بررسی کنید.`;
  }
  return `درخواست ناموفق بود (${status}).`;
}
