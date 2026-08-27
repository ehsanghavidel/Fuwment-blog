"use client";

import type { Slide } from "@/lib/store/types";
import {
  CANVAS,
  COLOR,
  COUNTER_BASELINE_FROM_BOTTOM,
  LIST_MARKER,
  OPACITY,
  PAD,
  SAFE_INSET,
  TYPE,
  OPTICAL_TOP_SHARE,
  accentFor,
  blockAlignFor,
  blocksFor,
  gapAfter,
  roleFor,
  type Block,
  type BlockLevel,
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
 * ⚠️ ساختارِ بلوک‌ها هم از همان‌جا می‌آید — `blocksFor()` و `gapAfter()`
 * دقیقاً همان دو تابعی هستند که رندرکننده صدا می‌زند. اینجا هیچ منطقِ
 * «کدام چیدمان یعنی چه بلوک‌هایی» یا «چه فاصله‌ای بعد از کدام بلوک»
 * تکرار نشده — فقط عددهای پیکسلیِ CSS به‌جای پیکسلِ canvas.
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

/** رنگِ متنِ هر بلوک — نسخه‌ی CSS از همان قاعده‌ی رندرکننده (`colorFor`) */
function colorForBlock(level: BlockLevel, accent: string): string {
  if (level === "kicker") return accent;
  if (level === "body") return rgba(COLOR.fg, OPACITY.body);
  return COLOR.fg; // heading, display
}

export function CarouselPreview({
  slides,
  language = "fa",
}: {
  slides: Slide[];
  /** جهت و تراز از زبانِ پست می‌آید، نه از حدسِ محتوا — دقیقاً مثلِ رندرکننده */
  language?: "fa" | "en";
}) {
  if (slides.length === 0) return null;
  const rtl = language === "fa";

  return (
    <div
      className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3"
      role="list"
      aria-label="پیش‌نمایش اسلایدهای کاروسل"
    >
      {slides.map((slide, i) => {
        const role = roleFor(i, slides.length);
        const accent = accentFor(role);
        const blocks: Block[] = blocksFor(slide);

        return (
          <figure
            key={i}
            role="listitem"
            dir={rtl ? "rtl" : "ltr"}
            className="relative shrink-0 snap-center overflow-hidden rounded-xl2 shadow-raised"
            style={{
              width: s(CANVAS.width),
              height: s(CANVAS.height),
              background: COLOR.bg,
              color: COLOR.fg,
              paddingInline: s(PAD.x),
              paddingTop: s(PAD.top),
              paddingBottom: s(PAD.bottom),
              /*
                ناحیه‌ی چیدمان کل فضای بین دو پدینگ است و بلوک‌ها یا
                وسطش می‌نشینند یا ته آن. همان محاسبه‌ای که رندرکننده
                صریح انجام می‌دهد.
              */
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/*
              فاصله‌گذارها نسبت مرکز نوری را می‌سازند: ۴۵٪ بالا، ۵۵٪
              پایین. `justifyContent: center` نمی‌توانست — آن ۵۰/۵۰
              می‌دهد و بلوک را کمی افتاده نشان می‌داد.
              در حالت پایین‌لنگر، تمام فضا به بالا می‌رود.
            */}
            <div
              style={{
                flexGrow: blockAlignFor(role) === "bottom" ? 1 : OPTICAL_TOP_SHARE,
              }}
            />

            <div>
              {blocks.map((block, bi) => (
                <div
                  key={bi}
                  dir={rtl ? "rtl" : "ltr"}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: block.marker ? s(LIST_MARKER.gap) : undefined,
                    marginBottom: s(gapAfter(blocks, bi)),
                  }}
                >
                  {/*
                    نشانگرِ هندسیِ بندِ فهرست — یک دایره‌ی CSS، نه
                    کاراکترِ یونیکد. جهتِ ردیفِ flex از `dir` می‌آید، پس
                    در RTL خودبه‌خود سمتِ راست (شروع) می‌نشیند و در LTR
                    سمتِ چپ — بدونِ دو سیستمِ جدا برای دو زبان.
                  */}
                  {block.marker && (
                    <span
                      aria-hidden
                      style={{
                        flexShrink: 0,
                        width: s(LIST_MARKER.size),
                        height: s(LIST_MARKER.size),
                        borderRadius: "50%",
                        background: accent,
                      }}
                    />
                  )}
                  <span
                    dir="auto"
                    style={{
                      display: "block",
                      fontSize: s(TYPE[block.level].size),
                      fontWeight: TYPE[block.level].weight,
                      lineHeight: TYPE[block.level].lineHeight,
                      color: colorForBlock(block.level, accent),
                    }}
                  >
                    {block.text}
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                flexGrow: blockAlignFor(role) === "bottom" ? 0 : 1 - OPTICAL_TOP_SHARE,
              }}
            />

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
              {rtl
                ? `${(i + 1).toLocaleString("fa-IR")}/${slides.length.toLocaleString("fa-IR")}`
                : `${i + 1}/${slides.length}`}
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
