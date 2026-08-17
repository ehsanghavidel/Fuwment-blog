import type { MetadataRoute } from "next";

/**
 * کل این دامنه از ایندکس خارج است.
 *
 * بلاگ عمومی فومنت روی fuwment.com/blog (وردپرس) است؛ این پروژه فقط
 * تولیدکننده‌ی محتواست. اگر صفحه‌های اینجا ایندکس شوند، همان مقاله از دو
 * دامنه منتشر می‌شود و برای دامنه‌ی اصلی محتوای تکراری می‌سازد.
 *
 * این فایل لایه‌ی دوم است، نه تنها لایه: متادیتای ریشه در layout.tsx هم
 * `robots: { index: false }` دارد. robots.txt فقط «درخواست» است و همه‌ی
 * خزنده‌ها رعایتش نمی‌کنند؛ هدر/تگ noindex الزام‌آورتر است. هر دو با هم.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
