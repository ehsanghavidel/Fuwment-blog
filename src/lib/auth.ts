import "server-only";
import { createHash, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { STUDIO_COOKIE } from "@/lib/studio-session";

/**
 * محافظ استودیو و APIهای مدیریتی.
 *
 * ⚠️ fail-closed در پروداکشن — این رفتار عمدی است و برنگردانیدش.
 *
 * نسخه‌ی اول fail-open بود: نبودِ STUDIO_PASSWORD یعنی «همه‌چیز باز».
 * برای یک پروژه‌ی درسیِ محلی قابل دفاع بود، ولی حالا نیست: استودیو
 * می‌تواند پایپ‌لاین اجرا کند (هر اجرا ده‌ها فراخوانی مدل و پول واقعی)،
 * پست منتشر کند، و از همه مهم‌تر **مستقیم در وردپرسِ عمومی پیش‌نویس
 * بسازد**. یک متغیر محیطیِ جاافتاده نباید همه‌ی این‌ها را به اینترنت باز
 * کند.
 *
 * پس همان الگوی CRON_SECRET: در پروداکشن، *نبودِ* راز خودش دلیل رد کردن
 * است. در محیط توسعه باز می‌ماند تا اجرای محلی ساده بماند.
 */

/**
 * مقایسه‌ی زمان‌ثابت.
 *
 * `===` روی رشته به‌محض اولین بایت متفاوت برمی‌گردد و طول تطابق را از
 * روی زمان پاسخ لو می‌دهد. هش‌کردن قبل از مقایسه، هم طول را یکسان
 * می‌کند (پس timingSafeEqual روی طول متفاوت خطا نمی‌دهد) و هم خودِ طول
 * رمز را پنهان نگه می‌دارد.
 */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** همان مقداری که middleware در کوکی می‌گذارد */
function sha256Hex(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function isStudioAuthorized(req: NextRequest): boolean {
  const password = process.env.STUDIO_PASSWORD;

  if (!password) {
    // fail-closed: در پروداکشن نبودِ رمز یعنی دسترسی بسته، نه باز
    if (process.env.NODE_ENV === "production") return false;
    return true;
  }

  // دو راه پذیرفته است:
  // ۱. کوکی نشست که middleware بعد از Basic Auth گذاشته — یعنی کاربر
  //    از پرامپت مرورگر رد شده و لازم نیست دوباره رمز بزند.
  // ۲. هدر x-studio-password که فرم خودِ استودیو می‌فرستد — برای وقتی
  //    که کاربر مستقیم سراغ API می‌آید یا کوکی منقضی شده.
  const cookie = req.cookies.get(STUDIO_COOKIE)?.value;
  if (cookie && safeEqual(cookie, sha256Hex(password))) return true;

  const provided = req.headers.get("x-studio-password");
  if (!provided) return false;
  return safeEqual(provided, password);
}

/**
 * پاسخ ۴۰۱.
 *
 * پیام بین «رمز غلط» و «رمز اصلاً تنظیم نشده» فرق می‌گذارد — وگرنه
 * موقع دیپلوی، فراموش‌کردن STUDIO_PASSWORD شبیه «رمزم را اشتباه زدم»
 * دیده می‌شود و ساعت‌ها دنبال رمز درست می‌گردید.
 * این تفکیک اطلاعات حساسی لو نمی‌دهد: هر دو حالت دسترسی را رد می‌کنند.
 */
export function unauthorized(): Response {
  const misconfigured =
    !process.env.STUDIO_PASSWORD && process.env.NODE_ENV === "production";

  return Response.json(
    {
      error: misconfigured
        ? "STUDIO_PASSWORD روی سرور تنظیم نشده است؛ در پروداکشن دسترسی بسته می‌ماند."
        : "رمز استودیو نادرست است.",
    },
    { status: 401 }
  );
}
