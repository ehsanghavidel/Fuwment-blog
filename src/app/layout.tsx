import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import localFont from "next/font/local";
import { Inter } from "next/font/google";
import "./globals.css";

/**
 * وزیرمتن برای فارسی — وزن‌های ۴۰۰/۵۰۰/۷۰۰/۸۰۰ طبق راهنمای برند.
 * Thin و ExtraLight عمداً بارگذاری نمی‌شوند: در فارسی روی صفحه‌های معمولی
 * خوانا نیستند و راهنمای برند هم منعشان کرده.
 * (وزن ۶۰۰ نگه داشته شده چون رابط از font-semibold استفاده می‌کند.)
 */
const vazirmatn = localFont({
  src: [
    { path: "../../public/fonts/Vazirmatn-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/Vazirmatn-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/Vazirmatn-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/Vazirmatn-Bold.woff2", weight: "700", style: "normal" },
    { path: "../../public/fonts/Vazirmatn-ExtraBold.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-vazirmatn",
  display: "swap",
  preload: true,
});

/** Inter برای متن انگلیسی — نام‌های لاتین، شناسه‌ها و اعداد میلادی */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

/**
 * ⚠️ کل این اپ از ایندکس خارج است.
 *
 * بلاگ عمومی فومنت روی fa.fuwment.com در وردپرس است. این پروژه فقط
 * تولیدکننده‌ی محتواست و صفحه‌هایش نباید در نتایج جستجو بیایند — وگرنه
 * همان محتوا از دو دامنه منتشر می‌شود و محتوای تکراری برای دامنه‌ی اصلی
 * می‌سازد. robots.ts هم همین را در سطح فایل robots.txt تکرار می‌کند.
 */
export const metadata: Metadata = {
  title: {
    default: "استودیوی محتوای فومنت",
    template: "%s | استودیوی فومنت",
  },
  description: "ابزار داخلی تولید محتوای فومنت — سیستم مولتی‌ایجنت",
  robots: { index: false, follow: false, nocache: true },
};

/** لاک‌آپ افقی برند — نشانه از public/fuwment-mark.png + نام */
function BrandMark() {
  return (
    <span className="inline-flex select-none items-center gap-2.5">
      <Image
        src="/fuwment-mark.png"
        alt=""
        width={36}
        height={36}
        priority
        className="h-9 w-9 shrink-0 object-contain"
      />
      <span className="text-xl font-extrabold leading-none tracking-tight text-mist">
        فومنت
      </span>
    </span>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={`${vazirmatn.variable} ${inter.variable}`}>
      <body className="flex min-h-dvh flex-col font-sans">
        {/* هدر سرمه‌ای — رنگ پایه‌ی برند، ۶۰٪ سهم بصری از همین‌جا شروع می‌شود */}
        <header className="sticky top-0 z-40 border-b border-navy-deep bg-navy">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5" aria-label="فومنت — خانه">
              <BrandMark />
              <span className="hidden text-caption text-slateblue sm:inline">
                استودیوی محتوا
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/blog"
                className="rounded-btn px-3 py-2 font-medium text-slateblue transition-colors hover:bg-navy-card hover:text-mist"
              >
                پیش‌نمایش مقاله‌ها
              </Link>
              {/* ⚠️ ناوبری است، نه اقدام — پس نارنجی نمی‌گیرد.
                  تنها دکمه‌ی نارنجی هر صفحه باید اقدام اصلی همان صفحه باشد. */}
              <Link
                href="/studio"
                className="mr-1 rounded-btn bg-navy-card px-4 py-2 font-medium text-mist transition-colors hover:bg-teal hover:text-ink"
              >
                استودیو
              </Link>
            </nav>
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <footer className="border-t border-navy-deep bg-navy text-mist">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-caption text-slateblue sm:flex-row sm:px-6">
            <span>© فومنت (Fuwment)</span>
            <span>ابزار داخلی تولید محتوا — منتشرنشده</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
