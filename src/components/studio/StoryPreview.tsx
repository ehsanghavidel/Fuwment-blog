"use client";

import type { Slide } from "@/lib/store/types";
import {
  COLOR,
  LIST_MARKER,
  OPACITY,
  OPTICAL_TOP_SHARE,
  TYPE,
  blocksFor,
  gapAfter,
  type Block,
  type BlockLevel,
} from "@/lib/slide-spec";
import {
  STORY_CANVAS,
  STORY_PAD,
  storyRegion,
  storyRoleFor,
  storyBlockAlignFor,
} from "@/lib/story-spec";

/**
 * پیش‌نمایشِ استوری — آینه‌ی `CarouselPreview.tsx`، همان قاعده: هیچ عددِ
 * چیدمانی اینجا نوشته نشده، همه از `story-spec.ts` می‌آید (که خودش
 * توکن‌های تایپوگرافی/رنگ را از `slide-spec.ts` می‌گیرد، بدونِ تکرار).
 *
 * ⚠️ منطقِ لنگرِ عمودی اینجا CSS/flex است، نه پیکسلِ مطلق — ولی همان
 * قاعده‌ای که `storyBlockTopPx` در رندرکننده پیاده می‌کند: ناحیه‌ی مجاز
 * (`storyRegion`) به‌جای `PAD.top/PAD.bottom` پدینگ می‌شود، و سه لنگر
 * (`top`/`center`/`bottom`) با نسبتِ فاصله‌گذارهای flex ساخته می‌شوند —
 * دقیقاً همان نسبتِ ۴۵/۵۵ که کاروسل برای «وسط» استفاده می‌کند.
 *
 * ⚠️ بدونِ شماره‌ی صفحه — همان قراردادِ رندرکننده‌ی استوری.
 *
 * ⚠️ هیچ UIِ بومیِ استیکر اینجا رسم نمی‌شود. `stickerFrames` فقط برای
 * تصمیمِ «این فریم ناحیه‌اش کوتاه شود یا نه» استفاده می‌شود؛ محتوای
 * استیکر (سؤال/گزینه/لینک) مسئولیتِ `SocialPostCard` است، جدا از قاب.
 */

const PREVIEW_WIDTH = 200;
const SCALE = PREVIEW_WIDTH / STORY_CANVAS.width;

const s = (px: number) => `${(px * SCALE).toFixed(2)}px`;

function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function colorForBlock(level: BlockLevel, accent: string): string {
  if (level === "kicker") return accent;
  if (level === "body") return rgba(COLOR.fg, OPACITY.body);
  return COLOR.fg;
}

/** رنگِ تأکید — فقط نقشِ cta نارنجی می‌گیرد، عیناً قاعده‌ی کاروسل */
function accentForStoryRole(role: ReturnType<typeof storyRoleFor>): string {
  return role === "cta" ? COLOR.action : COLOR.accent;
}

export function StoryPreview({
  frames,
  language = "fa",
  stickerFrames,
}: {
  frames: Slide[];
  /** جهت و تراز از زبانِ پست می‌آید، نه از حدسِ محتوا — دقیقاً مثلِ رندرکننده */
  language?: "fa" | "en";
  /** اندیس‌های صفرمبناییِ فریم‌هایی که استیکر دارند — فقط برای رزروِ فضا */
  stickerFrames?: ReadonlySet<number>;
}) {
  if (frames.length === 0) return null;
  const rtl = language === "fa";

  return (
    <div
      className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3"
      role="list"
      aria-label="پیش‌نمایشِ فریم‌های استوری"
    >
      {frames.map((frame, i) => {
        const role = storyRoleFor(i, frames.length);
        const align = storyBlockAlignFor(role);
        const accent = accentForStoryRole(role);
        const hasSticker = stickerFrames?.has(i) ?? false;
        const region = storyRegion(hasSticker);
        const blocks: Block[] = blocksFor(frame);

        const topGrow = align === "top" ? 0 : align === "bottom" ? 1 : OPTICAL_TOP_SHARE;
        const bottomGrow = align === "top" ? 1 : align === "bottom" ? 0 : 1 - OPTICAL_TOP_SHARE;

        return (
          <figure
            key={i}
            role="listitem"
            dir={rtl ? "rtl" : "ltr"}
            className="relative shrink-0 snap-center overflow-hidden rounded-xl2 shadow-raised"
            style={{
              width: s(STORY_CANVAS.width),
              height: s(STORY_CANVAS.height),
              background: COLOR.bg,
              color: COLOR.fg,
              paddingInline: s(STORY_PAD.x),
              paddingTop: s(region.top),
              paddingBottom: s(STORY_CANVAS.height - region.bottom),
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ flexGrow: topGrow }} />

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

            <div style={{ flexGrow: bottomGrow }} />

            {/* راهنمای ناحیه‌ی رزروشده‌ی استیکر — فقط بصری، هیچ متنی رسم نمی‌شود */}
            {hasSticker && (
              <span
                aria-hidden
                title="ناحیه‌ی رزروشده‌ی استیکر"
                style={{
                  position: "absolute",
                  insetInline: 0,
                  bottom: 0,
                  height: s(STORY_CANVAS.height - region.bottom),
                  borderTop: `1px dashed ${rgba(COLOR.accent, 0.4)}`,
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
