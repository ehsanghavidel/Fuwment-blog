/**
 * محافظِ مهلت — تصمیمِ خالص، بدونِ هیچ وابستگی به Vercel/Supabase/`server-only`.
 *
 * جدا شده تا در تست‌های منطقِ خالص (الگوی tsc جدا در CLAUDE.md) مستقیماً صدا
 * زده شود؛ `run-steps.ts` فقط این‌ها را می‌بندد روی `getDeadline()`.
 *
 * چرا ۴۰ ثانیه: کندترین گامِ اندازه‌گیری‌شده (پژوهشگرِ بلاگ) ۳۶ ثانیه بود.
 * این عدد در این فاز عمداً دست‌نخورده مانده — تغییرِ شکستِ استوری I/O بود،
 * نه کم‌بودنِ این رزرو.
 */
export const MIN_SECONDS_FOR_STEP = 40;

/**
 * چند ثانیه تا مهلتِ تابع مانده است.
 * `null` یعنی خارج از Vercel اجرا می‌شویم (بدونِ مهلت) — محافظ باید خاموش بماند.
 */
export function secondsUntilDeadline(
  deadline: Date | undefined | null,
  now: number = Date.now()
): number | null {
  if (!deadline) return null;
  return (deadline.getTime() - now) / 1000;
}

/**
 * آیا وقتِ کافی برای شروعِ یک گامِ تازه هست؟
 * خارج از Vercel (`deadline` نامشخص) همیشه `true` — رفتارِ محلی حفظ می‌شود.
 */
export function hasTimeForStep(
  deadline: Date | undefined | null,
  now: number = Date.now()
): boolean {
  const left = secondsUntilDeadline(deadline, now);
  return left === null || left >= MIN_SECONDS_FOR_STEP;
}
