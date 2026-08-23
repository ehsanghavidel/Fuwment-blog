"use client";

import type { Slide } from "@/lib/store/types";
import {
  CANVAS,
  COLOR,
  COUNTER_BASELINE_FROM_BOTTOM,
  GAP,
  OPACITY,
  PAD,
  SAFE_INSET,
  TYPE,
  accentFor,
  blockAlignFor,
  roleFor,
} from "@/lib/slide-spec";

/**
 * پیش‌نمایش کاروسل — همان مشخصاتِ رندرکننده، فقط کوچک‌شده.
 *
 * ⚠️ هیچ عدد چیدمانی اینجا نوشته نشده. همه از `slide-spec.ts` می‌آید و
 * در `SCALE` ضرب می‌شود. نسخه‌ی قبلی کلاس‌های تیلویند داشت (`p-6`،
 * `text-lg`، `leading-6`) که هیچ ربطی به عددهای ۱۰۸۰ نداشتند — یعنی
 * پیش‌نمایش چیزی را نشان می‌داد که خروجی نبود.
 *
 * حالا واگرایی **ساختاراً ممکن نیست**: اگر کسی پدینگ را در spec عوض
 * کند، هر دو با هم عوض می‌شوند.
 *
 * تنها چیزی که هنوز از تیلویند می‌آید ظرفِ بیرونی است (اسکرول افقی،
 * گوشه‌ی گرد، سایه) — که بخشی از رابط استودیوست، نه از خودِ اسلاید.
 */

/** عرض چیپ پیش‌نمایش بر حسب پیکسل مرورگر */
const PREVIEW_WIDTH = 260;
const SCALE = PREVIEW_WIDTH / CANVAS.width;

/** px واقعیِ اسلاید → px پیش‌نمایش */
const s = (px: number) => `${(px * SCALE).toFixed(2)}px`;

function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function CarouselPreview({ slides }: { slides: Slide[] }) {
  if (slides.length === 0) return null;

  return (
    <div
      className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3"
      role="list"
      aria-label="پیش‌نمایش اسلایدهای کاروسل"
    >
      {slides.map((slide, i) => {
        const role = roleFor(i, slides.length);
        const accent = accentFor(role);

        return (
          <figure
            key={i}
            role="listitem"
            dir="rtl"
            className="relative shrink-0 snap-center overflow-hidden rounded-xl2 shadow-raised"
            style={{
              width: s(CANVAS.width),
              height: s(CANVAS.height),
              background: COLOR.bg,
              color: COLOR.fg,
              paddingInline: s(PAD.x),
              paddingTop: s(PAD.top),
              paddingBottom: s(PAD.bottom),
              // چیدمان عمودی: کیکر بالا، بلوک محتوا پایین — همان چیزی که
              // رندرکننده صریح حسابش می‌کند.
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span
              dir="auto"
              style={{
                fontSize: s(TYPE.kicker.size),
                fontWeight: TYPE.kicker.weight,
                lineHeight: TYPE.kicker.lineHeight,
                color: accent,
              }}
            >
              {slide.kicker}
            </span>

            {/*
              ناحیه‌ی چیدمان: از زیر کیکر تا پدینگ پایین. بلوک یا وسطش
              می‌نشیند (کاور و میانی) یا ته آن (اقدام) — همان محاسبه‌ای
              که رندرکننده صریح انجام می‌دهد.
            */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: blockAlignFor(role) === "bottom" ? "flex-end" : "center",
              }}
            >
              <h4
                dir="auto"
                style={{
                  fontSize: s(TYPE.heading.size),
                  fontWeight: TYPE.heading.weight,
                  lineHeight: TYPE.heading.lineHeight,
                }}
              >
                {slide.heading}
              </h4>
              <p
                dir="auto"
                style={{
                  marginTop: s(GAP.headingToBody),
                  fontSize: s(TYPE.body.size),
                  fontWeight: TYPE.body.weight,
                  lineHeight: TYPE.body.lineHeight,
                  color: rgba(COLOR.fg, OPACITY.body),
                }}
              >
                {slide.text}
              </p>
            </div>

            <span
              dir="ltr"
              style={{
                position: "absolute",
                insetInlineEnd: s(PAD.x),
                bottom: s(COUNTER_BASELINE_FROM_BOTTOM - TYPE.counter.size),
                fontSize: s(TYPE.counter.size),
                fontWeight: TYPE.counter.weight,
                color: rgba(COLOR.fg, OPACITY.counter),
              }}
            >
              {(i + 1).toLocaleString("fa-IR")}/{slides.length.toLocaleString("fa-IR")}
            </span>

            {/*
              ناحیه‌ی امن گرید، فقط روی اسلاید اول.
              گرید پروفایل به ۳:۴ برش می‌زند و عملاً فقط همین اسلاید
              آنجا دیده می‌شود — پس همین یکی راهنما می‌گیرد.
            */}
            {role === "cover" && (
              <span
                aria-hidden
                title="ناحیه‌ی امن گرید پروفایل (۳:۴)"
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: s(SAFE_INSET),
                  right: s(SAFE_INSET),
                  border: `1px dashed ${rgba(COLOR.action, 0.55)}`,
                  pointerEvents: "none",
                }}
              />
            )}
          </figure>
        );
      })}
    </div>
  );
}
