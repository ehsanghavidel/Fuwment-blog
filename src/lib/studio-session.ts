/**
 * ثابت مشترک نشست استودیو.
 *
 * عمداً در فایل جدا و بدون هیچ import: دو مصرف‌کننده دارد که در دو
 * runtime متفاوت اجرا می‌شوند — `src/middleware.ts` روی Edge و
 * `src/lib/auth.ts` که `server-only` است. اگر یکی از دیگری import
 * می‌کرد، یا ماژول Edge وارد باندل Node می‌شد یا برعکس.
 *
 * مقدار کوکی، هش SHA-256 رمز است؛ middleware می‌گذاردش و auth.ts
 * می‌خواندش.
 */
export const STUDIO_COOKIE = "studio_auth";
