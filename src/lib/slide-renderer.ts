import { createCanvas, loadImage, GlobalFonts, type SKRSContext2D } from "@napi-rs/canvas";
import path from "path";
import type { Slide } from "./store/types";
import {
  CANVAS,
  COLOR,
  CONTENT_WIDTH,
  COUNTER_BASELINE_FROM_BOTTOM,
  IMAGE_SCRIM,
  LIST_MARKER,
  LIST_MARKER_INDENT,
  OPACITY,
  PAD,
  SAFE_INSET,
  TYPE,
  accentFor,
  blockAlignFor,
  blockHeightPx,
  blockTopPx,
  blocksFor,
  gapAfter,
  isInsideSafeArea,
  lineHeightPx,
  roleFor,
  type Block,
  type BlockLevel,
  type MeasuredBlock,
  type SlideRole,
} from "./slide-spec";

/**
 * رندرکننده‌ی اسلاید — JSON می‌گیرد، PNG می‌دهد. همین.
 *
 * ⚠️ عمداً هیچ ورودی/خروجی‌ای ندارد: نه Supabase، نه شبکه، نه فایل‌سیستم
 * (جز خواندن فونت). یعنی در Node خالص قابل تست است — و همان کاری که
 * CLAUDE.md برای «تست منطق خالص» توصیف کرده رویش جواب می‌دهد.
 *
 * ⚠️ `server-only` هم ندارد، به همین دلیل. اگر بگیرد، دیگر نمی‌شود با
 * tsc جدا کامپایلش کرد و در Node اجرا کرد. حفاظت واقعی جای دیگری است:
 * `@napi-rs/canvas` یک ماژول بومی است و اگر کسی در کامپوننت کلاینت
 * import کند، بیلد بلند می‌شکند.
 *
 * ── چرا canvas و نه satori یا Playwright ──
 *
 * satori الگوریتم Bidi یونیکد را پیاده نکرده: «یک دو سه چهار» را با
 * ترتیب کلمه‌ی برعکس رندر می‌کند. خروجی در نگاه اول درست به نظر
 * می‌رسد ولی جمله‌ها بی‌معنی‌اند — بدترین نوع شکست.
 *
 * Playwright درست کار می‌کند ولی Chromium (~۱۷۰MB) در سقف حجم توابع
 * جا نمی‌شود. `@napi-rs/canvas` (~۲۶MB) هم Bidi درست دارد، هم
 * `measureText` برای شکست خط، و هم `woff2` را مستقیم می‌خواند.
 */

export type RenderOptions = {
  /** جهت و تراز از زبان می‌آید، نه از محتوا */
  language: "fa" | "en";
  /**
   * تصویر پس‌زمینه — فقط برای کاور.
   *
   * ⚠️ نبودش حالت عادی است، نه خطا: کاور همان پس‌زمینه‌ی سرمه‌ای را
   * می‌گیرد. کاور بدون تصویر از کاور با تصویرِ بی‌ربط بهتر است.
   */
  backgroundImage?: Buffer;
  /** راهنمای ناحیه‌ی امن را روی تصویر بکش — فقط برای بازبینی چشمی */
  debugSafeArea?: boolean;
};

/* ── فونت ────────────────────────────────────────────────── */

/**
 * وزیرمتن برای هر دو زبان.
 *
 * پوشش لاتینش کامل است (۱۳۳۳ گلیف، `ABCXYZabcxyz0123` همه موجود)، پس
 * Inter لازم نیست. اگر روزی خروجی انگلیسی بصری ضعیف بود، آن‌وقت
 * تصمیمِ افزودن Inter گرفته می‌شود — با نگاه به یک PNG واقعی، نه از قبل.
 *
 * `next/font/google` به کار نمی‌آید: فایل‌هایش موقع بیلد در
 * `.next/static/media` با نام هش‌دار می‌نشینند و مسیر پایداری ندارند.
 */
const FAMILY = "FuwmentSlide";
let fontsReady = false;

export function registerFonts(fontDir?: string): void {
  if (fontsReady) return;
  const dir = fontDir ?? path.join(process.cwd(), "public", "fonts");
  // ⚠️ هر سه وزن با **یک نام خانواده** ثبت می‌شوند. canvas وزن را از
  //    رشته‌ی font انتخاب می‌کند؛ اگر نام‌ها جدا باشند، `700 72px X`
  //    بی‌صدا به وزن نزدیک می‌رسد و تیتر نازک درمی‌آید.
  for (const [file, weight] of [
    ["Vazirmatn-Regular.woff2", 400],
    ["Vazirmatn-Medium.woff2", 500],
    ["Vazirmatn-Bold.woff2", 700],
  ] as const) {
    GlobalFonts.registerFromPath(path.join(dir, file), FAMILY);
    void weight;
  }
  fontsReady = true;
}

function font(level: keyof typeof TYPE): string {
  return `${TYPE[level].weight} ${TYPE[level].size}px ${FAMILY}`;
}

/** رنگِ متنِ هر بلوک — کیکر رنگِ نقش می‌گیرد، بدنه شفافیتِ روی‌تصویر، بقیه توپر */
function colorFor(level: BlockLevel, role: SlideRole, bodyOpacity: number): string {
  if (level === "kicker") return accentFor(role);
  if (level === "body") return withAlpha(COLOR.fg, bodyOpacity);
  return COLOR.fg; // heading, display
}

/* ── شکست خط ─────────────────────────────────────────────── */

/**
 * شکست خط روی مرز کلمه، با اندازه‌گیری واقعی.
 *
 * ⚠️ کلمه‌ای که خودش از عرض بلندتر است در همان خط می‌ماند و سرریز
 * می‌کند. عمداً: شکستن وسط کلمه‌ی فارسی چسبندگی حروف را می‌شکند و
 * نتیجه‌اش بدتر از سرریز است. سقف‌های `SLIDE_LIMITS` جلوی رسیدن به
 * این حالت را می‌گیرند.
 */
export function wrapText(ctx: SKRSContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let line = words[0];

  for (const word of words.slice(1)) {
    const candidate = `${line} ${word}`;
    if (ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  lines.push(line);
  return lines;
}

/* ── رندر یک اسلاید ──────────────────────────────────────── */

export async function renderSlide(
  slide: Slide,
  ctx0: { index: number; total: number } & RenderOptions
): Promise<Buffer> {
  registerFonts();

  const { index, total, language, backgroundImage, debugSafeArea } = ctx0;
  const role: SlideRole = roleFor(index, total);
  const rtl = language === "fa";

  const canvas = createCanvas(CANVAS.width, CANVAS.height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = COLOR.bg;
  ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);

  /**
   * تصویر پس‌زمینه + لایه‌ی تیره.
   *
   * ⚠️ لایه گزینه نیست، قاعده است. آلفا و شفافیت بدنه از
   * `IMAGE_SCRIM` می‌آیند و آنجا با عدد توضیح داده شده‌اند: ۰٫۷۰ کف
   * AA را رد می‌کند و بدنه‌ی نیمه‌شفاف در هیچ آلفایی پاس نمی‌شود.
   *
   * تصویر «cover» جای می‌گیرد نه «contain»: بوم باید کامل پر شود،
   * حتی اگر لبه‌ای بریده شود. مدل ۱K می‌دهد و بوم ۱۰۸۰×۱۳۵۰ است.
   */
  let hasImage = false;
  if (backgroundImage) {
    try {
      const img = await loadImage(backgroundImage);
      const scale = Math.max(CANVAS.width / img.width, CANVAS.height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (CANVAS.width - w) / 2, (CANVAS.height - h) / 2, w, h);

      ctx.fillStyle = withAlpha(COLOR.bg, IMAGE_SCRIM.alpha);
      ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
      hasImage = true;
    } catch (err) {
      // تصویر خراب نباید اسلاید را بکشد — پس‌زمینه‌ی سرمه‌ای سر جایش است
      console.error(
        `[slide-renderer] تصویر پس‌زمینه بارگذاری نشد: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /** روی تصویر، بدنه شفاف نمی‌شود — دلیل عددی‌اش در IMAGE_SCRIM */
  const bodyOpacity = hasImage ? IMAGE_SCRIM.bodyOpacity : OPACITY.body;

  // جهت و تراز از زبان می‌آید. متن فارسی از راست شروع می‌شود، انگلیسی از چپ.
  ctx.direction = rtl ? "rtl" : "ltr";
  ctx.textAlign = rtl ? "right" : "left";
  const startX = rtl ? CANVAS.width - PAD.x : PAD.x;
  // بندهای فهرست از نشانگر عقب‌تر می‌نشینند — همان اندازه در هر دو جهت
  const listStartX = rtl ? startX - LIST_MARKER_INDENT : startX + LIST_MARKER_INDENT;
  const listWidth = CONTENT_WIDTH - LIST_MARKER_INDENT;

  /**
   * `top` بالای جعبه‌ی خط است، نه خط پایه. تبدیلش با `baseline()`
   * انجام می‌شود تا همه‌ی سطح‌ها یک قاعده داشته باشند.
   */
  const baseline = (top: number, level: BlockLevel) =>
    top + lineHeightPx(level) - TYPE[level].size * 0.25;

  /**
   * شکستِ خط، پیش از چیدمان — ارتفاعِ بلوک به تعدادِ خط وابسته است.
   *
   * ⚠️ بلوکِ بدونِ خط (متنِ خالی) کاملاً کنار گذاشته می‌شود — نه فقط از
   * ارتفاع، بلکه از محاسبه‌ی «فاصله‌ی قبل از بلوکِ بعدی» هم. این همان
   * رفتارِ رندرکننده‌ی قبلی برای `text` خالی بود (نه فاصله، نه ارتفاع)؛
   * اینجا کلی‌اش کردیم تا برای هر چیدمانی درست بماند.
   */
  const blocks: Block[] = blocksFor(slide);
  const wrapped = blocks
    .map((block) => {
      ctx.font = font(block.level);
      const lines = wrapText(ctx, block.text, block.marker ? listWidth : CONTENT_WIDTH);
      return { block, lines };
    })
    .filter(({ lines }) => lines.length > 0);

  const measured: MeasuredBlock[] = wrapped.map(({ block, lines }) => ({
    level: block.level,
    lineCount: lines.length,
  }));
  const blockHeight = blockHeightPx(measured);

  /**
   * لنگر عمودی — محاسبه‌اش در `slide-spec` است، نه اینجا.
   *
   * ⚠️ کیکر **داخل** بلوک است، نه لنگرشده به بالای قاب. و «وسط» یعنی
   * مرکز نوری (۴۵/۵۵)، نه مرکز هندسی — دلیل هر دو در `slide-spec`.
   */
  let top = blockTopPx(blockAlignFor(role), blockHeight);
  const blockLevels = wrapped.map(({ block }) => block);

  for (let i = 0; i < wrapped.length; i++) {
    const { block, lines } = wrapped[i];
    const x = block.marker ? listStartX : startX;

    ctx.font = font(block.level);
    ctx.fillStyle = colorFor(block.level, role, bodyOpacity);

    for (const [lineIndex, line] of lines.entries()) {
      if (block.marker && lineIndex === 0) {
        drawListMarker(ctx, { rtl, top, level: block.level, role });
      }
      ctx.fillText(line, x, baseline(top, block.level));
      top += lineHeightPx(block.level);
    }

    top += gapAfter(blockLevels, i);
  }

  // ── شماره‌ی اسلاید، گوشه‌ی مقابلِ شروع متن ──
  ctx.font = font("counter");
  ctx.fillStyle = withAlpha(COLOR.fg, OPACITY.counter);
  ctx.direction = "ltr";
  ctx.textAlign = rtl ? "left" : "right";
  const counter = rtl
    ? `${(index + 1).toLocaleString("fa-IR")}/${total.toLocaleString("fa-IR")}`
    : `${index + 1}/${total}`;
  ctx.fillText(
    counter,
    rtl ? PAD.x : CANVAS.width - PAD.x,
    CANVAS.height - COUNTER_BASELINE_FROM_BOTTOM
  );

  // ── محافظ ناحیه‌ی امن ──
  // ⚠️ نسخه‌ی اول یک «نوار تأکید» ۱۰×۴ بالای کیکر داشت که این محافظ را
  //    توجیه می‌کرد. در تصویر واقعی مثل یک خشِ تصادفی دیده می‌شد — نه
  //    عنصر طراحی — و در چیدمان انگلیسی بالای کیکر معلق می‌ماند. حذف شد.
  //    محافظ ماند، ولی حالا روی چیزی که واقعاً مهم است اجرا می‌شود:
  //    جعبه‌ی متن. امروز همیشه پاس می‌شود (پدینگ ۹۶ در برابر مرز ۳۴)،
  //    ولی اولین کسی که پدینگ را کم کند تا متن بزرگ‌تر جا شود، اینجا
  //    بلند می‌شکند به‌جای اینکه بعد از انتشار بفهمد.
  if (!isInsideSafeArea(PAD.x, CONTENT_WIDTH)) {
    throw new Error(
      `جعبه‌ی متن بیرون از ناحیه‌ی امن گرید است — ` +
        `متن ${PAD.x}..${PAD.x + CONTENT_WIDTH}، امن ${SAFE_INSET}..${CANVAS.width - SAFE_INSET}`
    );
  }

  if (debugSafeArea) drawSafeAreaGuide(ctx);

  return canvas.toBuffer("image/png");
}

/**
 * ⚠️ `backgroundImage` فقط به اسلاید **اول** داده می‌شود.
 *
 * کاور تنها چیزی است که در گرید پروفایل و در فید دیده می‌شود؛ بقیه
 * فقط بعد از سوایپ. تصویر برای همه یعنی هفت برابر هزینه برای چیزی که
 * اکثر بیننده‌ها هرگز نمی‌بینند.
 */
export async function renderCarousel(
  slides: Slide[],
  opts: RenderOptions
): Promise<Buffer[]> {
  const out: Buffer[] = [];
  for (const [i, slide] of slides.entries()) {
    out.push(
      await renderSlide(slide, {
        ...opts,
        backgroundImage: i === 0 ? opts.backgroundImage : undefined,
        index: i,
        total: slides.length,
      })
    );
  }
  return out;
}

/* ── کمکی‌ها ─────────────────────────────────────────────── */

function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * نشانگرِ هندسیِ یک بندِ فهرست — یک دایره‌ی توپر، نه کاراکترِ یونیکد.
 *
 * ⚠️ سمتِ نشانگر «سمتِ شروع» است، نه همیشه یک طرفِ ثابت: در RTL کنارِ
 * لبه‌ی راست (کنارِ `startX`، جایی که متن هم از همان‌جا شروع می‌شد)،
 * در LTR کنارِ لبه‌ی چپ. `x` قبلاً با همین قاعده در تماس‌گیرنده محاسبه
 * شده؛ اینجا فقط رسم می‌کند.
 */
function drawListMarker(
  ctx: SKRSContext2D,
  opts: { rtl: boolean; top: number; level: BlockLevel; role: SlideRole }
): void {
  const { rtl, top, level, role } = opts;
  const x = rtl
    ? CANVAS.width - PAD.x - LIST_MARKER.size / 2
    : PAD.x + LIST_MARKER.size / 2;
  const y = top + lineHeightPx(level) / 2;

  ctx.save();
  ctx.fillStyle = accentFor(role);
  ctx.beginPath();
  ctx.arc(x, y, LIST_MARKER.size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** راهنمای ناحیه‌ی امن — فقط برای بازبینی چشمی، هرگز در خروجی نهایی */
function drawSafeAreaGuide(ctx: SKRSContext2D): void {
  ctx.save();
  ctx.strokeStyle = "rgba(245,148,31,0.9)";
  ctx.setLineDash([16, 12]);
  ctx.lineWidth = 3;
  ctx.strokeRect(SAFE_INSET, 0, CANVAS.width - SAFE_INSET * 2, CANVAS.height);
  ctx.restore();
}
