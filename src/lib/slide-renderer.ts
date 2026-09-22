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
import {
  STORY_CANVAS,
  STORY_SAFE,
  STORY_PAD,
  STORY_CONTENT_WIDTH,
  STICKER_ZONE,
  storyRoleFor,
  storyBlockTopPx,
  type StoryRole,
} from "./story-spec";

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
 *
 * ── Stage ۲: هسته‌ی مشترکِ کاروسل و استوری ──
 *
 * `drawFrame` (خصوصی، پایین‌تر) تنها جایی است که واقعاً پیکسل می‌کشد.
 * `renderSlide`/`renderCarousel` (کاروسل، بومِ ۱۰۸۰×۱۳۵۰) و
 * `renderStoryFrame`/`renderStory` (استوری، بومِ ۱۰۸۰×۱۹۲۰) هر دو فقط
 * هندسه‌ی خودشان را می‌سازند (از `slide-spec` یا `story-spec`) و به
 * `drawFrame` می‌دهند. امضا و رفتارِ `renderSlide`/`renderCarousel`
 * **عیناً** همان قبل است — پارامترهایی که به `drawFrame` می‌فرستند با
 * قبل بایت‌به‌بایت یکی است، پس خروجیِ کاروسل تغییر نمی‌کند.
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

/**
 * گزینه‌های رندرِ استوری — جدا از `RenderOptions` کاروسل، چون
 * `debugSafeArea` اینجا معنای دیگری دارد (خطِ افقیِ بالا/پایین، نه
 * قابِ برشِ گرید) و یک گزینه‌ی دیگر هم دارد که کاروسل اصلاً ندارد.
 */
export type StoryRenderOptions = {
  language: "fa" | "en";
  backgroundImage?: Buffer;
  /** خطِ راهنمای حاشیه‌ی امنِ بالا/پایینِ استوری — فقط برای بازبینی چشمی */
  debugSafeArea?: boolean;
  /** جعبه‌ی راهنمای ناحیه‌ی رزروشده‌ی استیکر — فقط برای بازبینی چشمی */
  debugStickerZone?: boolean;
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

/** رنگِ متنِ هر بلوک — کیکر رنگِ تأکید می‌گیرد، بدنه شفافیتِ روی‌تصویر، بقیه توپر */
function colorFor(level: BlockLevel, accentColor: string, bodyOpacity: number): string {
  if (level === "kicker") return accentColor;
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

/* ── هسته‌ی مشترکِ رسم (خصوصی) ───────────────────────────── */

type DrawFrameOptions = {
  canvasWidth: number;
  canvasHeight: number;
  padX: number;
  contentWidth: number;
  language: "fa" | "en";
  backgroundImage?: Buffer;
  /** بلوک‌های محتوا — از `blocksFor(slide)`، بدون تغییر بین کاروسل و استوری */
  blocks: Block[];
  /** رنگِ کیکر/نشانگرِ فهرست — از قبل با `accentFor`/معادلش تعیین شده */
  accentColor: string;
  /** لنگرِ عمودی — کاروسل از `blockTopPx`، استوری از `storyBlockTopPx` می‌آید */
  computeBlockTop: (blockHeight: number) => number;
  /** شماره‌ی صفحه — فقط کاروسل. نبودنش یعنی بدونِ شماره (استوری) */
  counter?: { index: number; total: number };
  /** چکِ ناحیه‌ی امنِ گرید پروفایل — فقط کاروسل معنی دارد */
  checkSafeArea?: boolean;
  /** لایه‌ی راهنمای بازبینیِ چشمی — قبل از `toBuffer`، فقط اگر داده شود */
  debugOverlay?: (ctx: SKRSContext2D) => void;
};

/**
 * تنها جایی که واقعاً پیکسل می‌کشد — پس‌زمینه، تصویر+لایه‌ی تیره، متنِ
 * بلوک‌ها، نشانگرِ فهرست، شماره‌ی صفحه‌ی اختیاری، و چکِ ناحیه‌ی امنِ
 * اختیاری. کاروسل و استوری هر دو فقط هندسه‌ی خودشان را می‌سازند و اینجا
 * را صدا می‌زنند؛ منطقِ کشیدن هرگز دوباره نوشته نمی‌شود.
 */
async function drawFrame(opts: DrawFrameOptions): Promise<Buffer> {
  const {
    canvasWidth,
    canvasHeight,
    padX,
    contentWidth,
    language,
    backgroundImage,
    blocks,
    accentColor,
    computeBlockTop,
    counter,
    checkSafeArea,
    debugOverlay,
  } = opts;
  const rtl = language === "fa";

  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = COLOR.bg;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  /**
   * تصویر پس‌زمینه + لایه‌ی تیره.
   *
   * ⚠️ لایه گزینه نیست، قاعده است. آلفا و شفافیت بدنه از
   * `IMAGE_SCRIM` می‌آیند و آنجا با عدد توضیح داده شده‌اند: ۰٫۷۰ کف
   * AA را رد می‌کند و بدنه‌ی نیمه‌شفاف در هیچ آلفایی پاس نمی‌شود.
   *
   * تصویر «cover» جای می‌گیرد نه «contain»: بوم باید کامل پر شود،
   * حتی اگر لبه‌ای بریده شود.
   */
  let hasImage = false;
  if (backgroundImage) {
    try {
      const img = await loadImage(backgroundImage);
      const scale = Math.max(canvasWidth / img.width, canvasHeight / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (canvasWidth - w) / 2, (canvasHeight - h) / 2, w, h);

      ctx.fillStyle = withAlpha(COLOR.bg, IMAGE_SCRIM.alpha);
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      hasImage = true;
    } catch (err) {
      // تصویر خراب نباید فریم را بکشد — پس‌زمینه‌ی سرمه‌ای سر جایش است
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
  const startX = rtl ? canvasWidth - padX : padX;
  // بندهای فهرست از نشانگر عقب‌تر می‌نشینند — همان اندازه در هر دو جهت
  const listStartX = rtl ? startX - LIST_MARKER_INDENT : startX + LIST_MARKER_INDENT;
  const listWidth = contentWidth - LIST_MARKER_INDENT;

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
   * ارتفاع، بلکه از محاسبه‌ی «فاصله‌ی قبل از بلوکِ بعدی» هم.
   */
  const wrapped = blocks
    .map((block) => {
      ctx.font = font(block.level);
      const lines = wrapText(ctx, block.text, block.marker ? listWidth : contentWidth);
      return { block, lines };
    })
    .filter(({ lines }) => lines.length > 0);

  const measured: MeasuredBlock[] = wrapped.map(({ block, lines }) => ({
    level: block.level,
    lineCount: lines.length,
  }));
  const blockHeight = blockHeightPx(measured);

  /** لنگر عمودی — کاروسل و استوری هر کدام قاعده‌ی خودشان را می‌فرستند */
  let top = computeBlockTop(blockHeight);
  const blockLevels = wrapped.map(({ block }) => block);

  for (let i = 0; i < wrapped.length; i++) {
    const { block, lines } = wrapped[i];
    const x = block.marker ? listStartX : startX;

    ctx.font = font(block.level);
    ctx.fillStyle = colorFor(block.level, accentColor, bodyOpacity);

    for (const [lineIndex, line] of lines.entries()) {
      if (block.marker && lineIndex === 0) {
        drawListMarker(ctx, { rtl, top, level: block.level, accentColor, canvasWidth, padX });
      }
      ctx.fillText(line, x, baseline(top, block.level));
      top += lineHeightPx(block.level);
    }

    top += gapAfter(blockLevels, i);
  }

  // ── شماره‌ی صفحه، فقط اگر داده شود (کاروسل دارد، استوری ندارد) ──
  if (counter) {
    ctx.font = font("counter");
    ctx.fillStyle = withAlpha(COLOR.fg, OPACITY.counter);
    ctx.direction = "ltr";
    ctx.textAlign = rtl ? "left" : "right";
    const counterText = rtl
      ? `${(counter.index + 1).toLocaleString("fa-IR")}/${counter.total.toLocaleString("fa-IR")}`
      : `${counter.index + 1}/${counter.total}`;
    ctx.fillText(
      counterText,
      rtl ? padX : canvasWidth - padX,
      canvasHeight - COUNTER_BASELINE_FROM_BOTTOM
    );
  }

  // ── محافظ ناحیه‌ی امن — فقط اگر خواسته شود (کاروسل) ──
  if (checkSafeArea && !isInsideSafeArea(padX, contentWidth)) {
    throw new Error(
      `جعبه‌ی متن بیرون از ناحیه‌ی امن گرید است — ` +
        `متن ${padX}..${padX + contentWidth}، امن ${SAFE_INSET}..${canvasWidth - SAFE_INSET}`
    );
  }

  if (debugOverlay) debugOverlay(ctx);

  return canvas.toBuffer("image/png");
}

/* ── رندر یک اسلاید کاروسل ───────────────────────────────── */

export async function renderSlide(
  slide: Slide,
  ctx0: { index: number; total: number } & RenderOptions
): Promise<Buffer> {
  registerFonts();

  const { index, total, language, backgroundImage, debugSafeArea } = ctx0;
  const role: SlideRole = roleFor(index, total);
  const blocks: Block[] = blocksFor(slide);

  return drawFrame({
    canvasWidth: CANVAS.width,
    canvasHeight: CANVAS.height,
    padX: PAD.x,
    contentWidth: CONTENT_WIDTH,
    language,
    backgroundImage,
    blocks,
    accentColor: accentFor(role),
    computeBlockTop: (h) => blockTopPx(blockAlignFor(role), h),
    counter: { index, total },
    checkSafeArea: true,
    debugOverlay: debugSafeArea ? drawSafeAreaGuide : undefined,
  });
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

/* ── رندر یک فریمِ استوری (Stage ۲) ──────────────────────── */

/**
 * همان اسلاید (`standard`/`statement`/`list`)، بومِ جدا (۱۰۸۰×۱۹۲۰) و
 * لنگرِ عمودیِ جدا (`story-spec.storyBlockTopPx`، نه `blockTopPx`
 * کاروسل). بدونِ شماره‌ی صفحه، بدونِ چکِ ناحیه‌ی امنِ گرید — آن قاعده
 * مخصوصِ برشِ ۳:۴ گرید پروفایل است و به استوری ربطی ندارد.
 */
export async function renderStoryFrame(
  slide: Slide,
  ctx0: { index: number; total: number; hasSticker: boolean } & StoryRenderOptions
): Promise<Buffer> {
  registerFonts();

  const { index, total, language, backgroundImage, hasSticker, debugSafeArea, debugStickerZone } =
    ctx0;
  const role: StoryRole = storyRoleFor(index, total);
  const blocks: Block[] = blocksFor(slide);
  // قاعده‌ی رنگ عیناً همان کاروسل است: فقط نقشِ cta نارنجی می‌گیرد.
  const accentColor = role === "cta" ? COLOR.action : COLOR.accent;

  const needsDebugOverlay = Boolean(debugSafeArea || debugStickerZone);

  return drawFrame({
    canvasWidth: STORY_CANVAS.width,
    canvasHeight: STORY_CANVAS.height,
    padX: STORY_PAD.x,
    contentWidth: STORY_CONTENT_WIDTH,
    language,
    backgroundImage,
    blocks,
    accentColor,
    computeBlockTop: (h) => storyBlockTopPx(role, h, hasSticker),
    counter: undefined,
    checkSafeArea: false,
    debugOverlay: needsDebugOverlay
      ? (ctx) => drawStoryDebugGuide(ctx, { hasSticker, debugSafeArea, debugStickerZone })
      : undefined,
  });
}

/**
 * ⚠️ `backgroundImage` فقط به فریمِ **اول** داده می‌شود — همان تصمیمِ
 * محصولیِ قفل‌شده‌ی Stage ۱ («تصویرِ AI فقط برای فریم ۰»)، همان الگوی
 * `renderCarousel`.
 *
 * `stickerFrames` مجموعه‌ی اندیس‌های صفرمبناییِ فریم‌هایی است که
 * استیکر دارند — فقط برای کوچک‌کردنِ ناحیه‌ی مجاز (`storyRegion`)،
 * هرگز برای رسمِ محتوای استیکر. متنِ استیکر اصلاً به این تابع داده
 * نمی‌شود؛ یعنی رسمِ UIِ بومیِ استیکر روی PNG **ساختاراً غیرممکن** است،
 * نه فقط ممنوع در پرامپت.
 */
export async function renderStory(
  frames: Slide[],
  opts: { stickerFrames?: ReadonlySet<number> } & StoryRenderOptions
): Promise<Buffer[]> {
  const { stickerFrames, ...rest } = opts;
  const out: Buffer[] = [];
  for (const [i, slide] of frames.entries()) {
    out.push(
      await renderStoryFrame(slide, {
        ...rest,
        backgroundImage: i === 0 ? rest.backgroundImage : undefined,
        index: i,
        total: frames.length,
        hasSticker: stickerFrames?.has(i) ?? false,
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
 * در LTR کنارِ لبه‌ی چپ. `canvasWidth`/`padX` پارامتر شدند تا هم بومِ
 * کاروسل و هم بومِ استوری از همین یک تابع استفاده کنند.
 */
function drawListMarker(
  ctx: SKRSContext2D,
  opts: {
    rtl: boolean;
    top: number;
    level: BlockLevel;
    accentColor: string;
    canvasWidth: number;
    padX: number;
  }
): void {
  const { rtl, top, level, accentColor, canvasWidth, padX } = opts;
  const x = rtl ? canvasWidth - padX - LIST_MARKER.size / 2 : padX + LIST_MARKER.size / 2;
  const y = top + lineHeightPx(level) / 2;

  ctx.save();
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(x, y, LIST_MARKER.size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** راهنمای ناحیه‌ی امنِ گرید پروفایل — فقط برای بازبینی چشمی، هرگز در خروجی نهایی */
function drawSafeAreaGuide(ctx: SKRSContext2D): void {
  ctx.save();
  ctx.strokeStyle = "rgba(245,148,31,0.9)";
  ctx.setLineDash([16, 12]);
  ctx.lineWidth = 3;
  ctx.strokeRect(SAFE_INSET, 0, CANVAS.width - SAFE_INSET * 2, CANVAS.height);
  ctx.restore();
}

/**
 * راهنمای استوری — خطِ افقیِ بالا/پایینِ حاشیه‌ی امن و جعبه‌ی ناحیه‌ی
 * رزروشده‌ی استیکر. فقط برای بازبینی چشمی؛ هرگز روی PNGِ واقعاً
 * آپلودشده صدا زده نمی‌شود (`storage.ts` هیچ‌وقت این دو پرچم را
 * `true` نمی‌فرستد).
 */
function drawStoryDebugGuide(
  ctx: SKRSContext2D,
  opts: { hasSticker: boolean; debugSafeArea?: boolean; debugStickerZone?: boolean }
): void {
  const { hasSticker, debugSafeArea, debugStickerZone } = opts;
  ctx.save();
  ctx.setLineDash([16, 12]);
  ctx.lineWidth = 3;

  if (debugSafeArea) {
    ctx.strokeStyle = "rgba(245,148,31,0.9)";
    ctx.beginPath();
    ctx.moveTo(0, STORY_SAFE.top);
    ctx.lineTo(STORY_CANVAS.width, STORY_SAFE.top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, STORY_CANVAS.height - STORY_SAFE.bottom);
    ctx.lineTo(STORY_CANVAS.width, STORY_CANVAS.height - STORY_SAFE.bottom);
    ctx.stroke();
  }

  if (debugStickerZone && hasSticker) {
    const zoneTop = STORY_CANVAS.height - STORY_SAFE.bottom - STICKER_ZONE;
    ctx.strokeStyle = "rgba(31,167,149,0.9)";
    ctx.strokeRect(0, zoneTop, STORY_CANVAS.width, STICKER_ZONE);
  }

  ctx.restore();
}
