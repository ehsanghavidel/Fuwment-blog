"use client";

import type { Slide } from "@/lib/store/types";

/**
 * پیش‌نمایش کاروسل — قاب‌های ۴:۵ با HTML/CSS، بدون تولید تصویر با AI.
 *
 * نسبت ۴:۵ (معادل ۱۰۸۰×۱۳۵۰) نسبت پیشنهادی فعلی اینستاگرام برای پست فید
 * است. پیش‌نمایش عمداً همان نسبت خروجی نهایی را دارد، وگرنه متنی که در
 * قاب مربع جا می‌شود در قاب عمودی جای دیگری می‌نشیند و پیش‌نمایش دروغ
 * می‌گوید — همان چیزی که اصلاً برای دیدنش ساخته شده.
 *
 * نکته‌ی آموزشی: کاری که اینجا لازم است «چیدمان قطعی با هویت برند» است، نه
 * خلاقیت تصویری. CSS این را رایگان، فوری و کاملاً یکدست انجام می‌دهد —
 * همان اصلِ «کار قطعی را به مدل نسپار» که در seo-checks و social-checks هم دیدیم.
 *
 * رنگ‌ها فقط از توکن‌های برند می‌آیند (سرمه‌ای/خنثی/فیروزه‌ای)، نه hex خام.
 */
export function CarouselPreview({ slides }: { slides: Slide[] }) {
  if (slides.length === 0) return null;

  return (
    <div
      dir="rtl"
      className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3"
      role="list"
      aria-label="پیش‌نمایش اسلایدهای کاروسل"
    >
      {slides.map((s, i) => (
        <figure
          key={i}
          role="listitem"
          className="relative flex aspect-[4/5] w-60 shrink-0 snap-center flex-col justify-between rounded-xl2 bg-pine p-6 pb-11 text-bone shadow-raised sm:w-64"
        >
          <span dir="auto" className="font-sans text-xs font-medium text-brass">
            {s.kicker}
          </span>

          {/*
            تیتر و متن یک بلوک‌اند، نه دو آیتم مستقل.
            در قاب مربع، justify-between سه آیتم را با فاصله‌ی قابل قبول
            پخش می‌کرد. با ۶۰ پیکسل ارتفاع بیشتر، همان چیدمان متن را از
            تیترش جدا می‌کرد. حالا فاصله‌ی اضافی یک‌جا بین کیکر و بلوک
            محتوا می‌نشیند — همان جایی که در طرح واقعی اسلاید هم می‌نشیند.
          */}
          <div className="space-y-2">
            <h4 dir="auto" className="font-heading text-lg font-bold leading-snug">
              {s.heading}
            </h4>

            <p dir="auto" className="font-sans text-sm leading-6 text-bone/80">
              {s.text}
            </p>
          </div>

          <span className="absolute bottom-4 left-5 font-sans text-xs text-bone/50">
            {(i + 1).toLocaleString("fa-IR")}/{slides.length.toLocaleString("fa-IR")}
          </span>

          {/* نوار برنجی روی اسلاید قلاب، برای اینکه اسلاید اول در نگاه اول پیدا باشد */}
          {i === 0 && <span className="absolute right-0 top-6 h-8 w-1 rounded-l bg-brass" />}
        </figure>
      ))}
    </div>
  );
}
