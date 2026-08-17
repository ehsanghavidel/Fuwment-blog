import { NextResponse, type NextRequest } from "next/server";
import { STUDIO_COOKIE } from "@/lib/studio-session";

/**
 * محافظ سمت سرور برای **صفحه‌ها** (نه APIها).
 *
 * چرا اصلاً لازم شد: `isStudioAuthorized` هدر `x-studio-password` را
 * می‌خواند و آن هدر را فقط جاوااسکریپت خودمان می‌فرستد. مرورگر موقع
 * ناوبری معمولی هیچ هدر سفارشی‌ای نمی‌فرستد، پس HTML و باندلِ /studio و
 * /blog بدون رمز سرو می‌شدند — داده نه، ولی خودِ صفحه بله.
 *
 * چرا Basic Auth و نه همان هدر: چون تنها مکانیزمی است که مرورگر خودش
 * می‌فهمد؛ پرامپت بومی نشان می‌دهد و بعد از آن، اعتبارنامه را روی همه‌ی
 * درخواست‌های همان مبدأ تکرار می‌کند. با کوکیِ تنها، به یک صفحه‌ی لاگین
 * جدا نیاز بود.
 *
 * ⚠️ این فایل روی Edge اجرا می‌شود: `crypto` نودی (createHash /
 * timingSafeEqual) اینجا وجود ندارد. برای همین از Web Crypto استفاده
 * می‌کنیم و مقایسه‌ی زمان‌ثابت را دستی می‌نویسیم.
 */

/** SHA-256 → آرایه‌ی بایت (Web Crypto، سازگار با Edge) */
async function sha256(text: string): Promise<Uint8Array> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return new Uint8Array(buf);
}

/** مقایسه‌ی زمان‌ثابت — بدون خروج زودهنگام در اولین بایت متفاوت */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * کوکی نشست: مقدارش هش رمز است، نه خود رمز. با httpOnly + sameSite از
 * جاوااسکریپت قابل خواندن نیست.
 *
 * این نشستِ امضاشده‌ی واقعی نیست — هرکس کوکی را داشته باشد تا انقضا
 * دسترسی دارد — ولی از وضعیت فعلی (نگهداری رمز خام در localStorage)
 * بدتر نیست، و باعث می‌شود بعد از Basic Auth فرم رمز استودیو دیگر
 * ظاهر نشود.
 */

function askForPassword(): NextResponse {
  return new NextResponse("احراز هویت لازم است.", {
    status: 401,
    headers: {
      // این هدر است که پرامپت بومی مرورگر را باز می‌کند
      "WWW-Authenticate": 'Basic realm="Fuwment Studio", charset="UTF-8"',
    },
  });
}

export async function middleware(req: NextRequest) {
  const password = process.env.STUDIO_PASSWORD;

  // همان قاعده‌ی auth.ts و کرون: در پروداکشن نبودِ رمز یعنی بسته، نه باز.
  if (!password) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse(
        "STUDIO_PASSWORD روی سرور تنظیم نشده است؛ در پروداکشن دسترسی بسته می‌ماند.",
        { status: 503 }
      );
    }
    return NextResponse.next(); // محیط توسعه — بدون مزاحمت
  }

  const expected = await sha256(password);
  const expectedHex = toHex(expected);

  // ۱) کوکی نشست (بعد از اولین ورود موفق)
  const cookie = req.cookies.get(STUDIO_COOKIE)?.value;
  if (cookie && constantTimeEqual(new TextEncoder().encode(cookie), new TextEncoder().encode(expectedHex))) {
    return NextResponse.next();
  }

  // ۲) Basic Auth
  const header = req.headers.get("authorization") ?? "";
  const [scheme, encoded] = header.split(" ");
  if (scheme !== "Basic" || !encoded) return askForPassword();

  let provided = "";
  try {
    // نام کاربری هرچه باشد پذیرفته است؛ فقط رمز مهم است.
    // رمز ممکن است خودش «:» داشته باشد، پس فقط روی اولین «:» می‌شکنیم.
    const decoded = atob(encoded);
    provided = decoded.slice(decoded.indexOf(":") + 1);
  } catch {
    return askForPassword();
  }

  if (!constantTimeEqual(await sha256(provided), expected)) return askForPassword();

  // ورود موفق — کوکی می‌گذاریم تا APIها هم بدون فرم رمز کار کنند
  const res = NextResponse.next();
  res.cookies.set(STUDIO_COOKIE, expectedHex, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}

/**
 * فقط صفحه‌ها، نه APIها.
 *
 * `/api/*` عمداً بیرون است: محافظ خودش را دارد (isStudioAuthorized) و
 * اگر Basic Auth را روی آن هم می‌گذاشتیم، هر fetchِ ناموفق به‌جای ۴۰۱
 * تمیز، پرامپت مرورگر باز می‌کرد.
 *
 * `/` (لندینگ) هم عمداً باز است — چیزی جز توضیح سیستم ندارد.
 * `robots.txt` هم باید برای خزنده‌ها قابل خواندن بماند.
 */
export const config = {
  matcher: ["/studio/:path*", "/blog/:path*", "/blog"],
};
