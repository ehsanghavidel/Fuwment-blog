import { createCanvas, loadImage, GlobalFonts, type SKRSContext2D, type Image } from "@napi-rs/canvas";
import path from "path";
import { readFileSync } from "fs";
import type { Slide } from "./store/types";
import { PALETTE } from "./brand/visual";
import { LIGHT_BG, isIconId, type VisualFamily } from "./brand/graphics";
import { roleFor, type SlideRole } from "./slide-spec";
import { STORY_CANVAS, STORY_SAFE, STICKER_ZONE, storyRoleFor } from "./story-spec";
import { wrapText } from "./slide-renderer";

/**
 * قالب روشنِ گرافیکی — مرحله‌ی ۱ (پیش‌نمایش)، تصمیم مالک ۲۰۲۶-۱۰-۰۹.
 *
 * دو خانواده، هر دو از روی نمونه‌هایی که مالک فرستاد:
 * - `editorial` (الف): زمینه‌ی کرم، تیتر درشت راست‌چین با خط‌زیرِ دست‌کشیده‌ی
 *   نارنجی، هواپیما و خطِ مسیر بالا، تصویرسازی روی نیم‌دایره‌ی هلویی،
 *   کارت‌های ستونی برای فهرست، امضای FUWMENT وسط پایین. برای داده و گزارش.
 * - `playful` (ب): زمینه‌ی روشن، لکه‌های گوشه، هایلایتِ ماژیکی پشت تیتر،
 *   خط‌های تزئینی، آیکونِ دورنگ وسط. برای نکته و آموزش.
 *
 * ⚠️ هنوز به پایپ‌لاین وصل نیست. `slide-renderer.ts` (قالب سرمه‌ای v3.7)
 * دست‌نخورده است و تا مرحله‌ی ۳ هر خروجیِ واقعی از همان می‌آید.
 *
 * ⚠️ متن **همیشه** با کد و فونت برند کشیده می‌شود، هرگز داخل تصویرِ مدل:
 * مدل تصویری حروف فارسی را جابه‌جا می‌کشد و چک‌های قطعی فقط متن را
 * می‌بینند، نه پیکسل را. تصویر/آیکون فقط عنصر گرافیکی است.
 *
 * تصمیم‌های مالک که این قالب از راهنمای v3.7 فاصله می‌گیرد: زمینه‌ی روشن
 * به‌جای ۶۰٪ سرمه‌ای، نارنجی به‌عنوان رنگ تأکید (هایلایت/خط‌زیر/تزئین) نه
 * فقط اقدام، تصویرسازی به‌جای عکس ادیتوریال، و اجازه‌ی هواپیما/چمدان.
 * رنگ‌ها از پالت اختصاصی فومنت‌اند (`FUWMENT_COLORS`) — سبزِ نمونه‌ها همان
 * سبزفیروزه‌ای #197065 برند است.
 *
 * ⚠️ نارنجی روی زمینه‌ی روشن کنتراست ۲٫۳ دارد — **فقط گرافیک، هرگز متن**
 * (جدول کنتراست راهنما). متن روی کادر نارنجی جوهری است (۷٫۴).
 */

export type LightFamily = "editorial" | "playful";

export type LightAssets = {
  /** آیکون/تصویرسازی اصلی فریم (SVG یا PNG) */
  hero?: Buffer;
  /** `hero` تصویرسازیِ مدل است، نه آیکون — سایه‌ی خودش را دارد، سایه‌ی دوم نمی‌گیرد */
  heroIsIllustration?: boolean;
  /** آیکون دوم کنار اصلی — مثلاً «ذخیره» + «ارسال» روی فریم آخر */
  heroSecondary?: Buffer;
  /** یک آیکون برای هر بندِ فهرست، به همان ترتیب — جای خالی یعنی بی‌آیکون */
  itemIcons?: (Buffer | undefined)[];
  /** فقط خانواده‌ی الف — هواپیمای بالای قاب (تصمیم مالک: هواپیما/چمدان مجاز) */
  plane?: Buffer;
};

export type LightRenderOptions = {
  family: LightFamily;
  format: "carousel" | "story";
  language: "fa" | "en";
  index: number;
  total: number;
  /** عبارتی از تیتر که هایلایت/خط‌زیر می‌گیرد. نبودش = خط آخر تیتر */
  highlight?: string;
  assets?: LightAssets;
  /** فقط استوری — ناحیه‌ی پایین برای استیکر خالی می‌ماند */
  hasSticker?: boolean;
};

/* ── توکن‌ها ─────────────────────────────────────────────── */

/** چهار رنگ پالت اختصاصی فومنت — از `brand/visual.ts`، تنها منبع hex */
export const FUWMENT_COLORS = {
  orange: PALETTE.orange,
  teal: PALETTE.teal,
  grey: PALETTE.grey,
  navy: PALETTE.navy,
} as const;

/**
 * توکن‌های قالب روشن — همه از همان چهار رنگ یا ته‌رنگشان روی زمینه.
 *
 * کنتراست روی زمینه‌ی #FBF7F1 (WCAG): سرمه‌ای ۱۱٫۵ · سبزفیروزه‌ای ۵٫۵ (AA،
 * پس برای متن ریز مجاز) · نارنجی ۲٫۳ و خاکستری ۱٫۶ → **فقط گرافیک، هرگز
 * متن**. متن روی کادر نارنجی سرمه‌ای است (۴٫۹)، نه سفید.
 */
export const LIGHT = {
  bg: LIGHT_BG,
  ink: FUWMENT_COLORS.navy,
  body: FUWMENT_COLORS.navy,
  /** متن ریز — کیکر و امضا */
  muted: FUWMENT_COLORS.teal,
  /** خط‌های نازک تزئینی و جداکننده */
  line: FUWMENT_COLORS.grey,
  /** خاکستریِ ۲۵٪ روی زمینه */
  card: "#EDEAE5",
  /** نارنجیِ ۲۰٪ روی زمینه — نیم‌دایره‌ی پشت تصویر */
  peach: "#FAE1C6",
  /** نارنجیِ ۳۲٪ روی زمینه — هایلایت ماژیکی */
  brush: "#F9D4AD",
  /** خاکستریِ ۴۰٪ روی زمینه — سایه‌ی زیر آیکون */
  shadow: "#E5E2DF",
  orange: FUWMENT_COLORS.orange,
  teal: FUWMENT_COLORS.teal,
  /** سطح پرشده‌ی آیکون — طیف روشنِ همان نارنجی */
  iconFill: "#FBB04A",
  onOrange: FUWMENT_COLORS.navy,
} as const;

/** مرکزِ روشن‌ترِ گرادیان «Penumbra» (شعاعی) هر رنگ */
const PENUMBRA_CENTER = { teal: "#25A08D", orange: "#FDBA5C" } as const;

const FAMILY_FA = "FuwmentLight";
const FAMILY_EN = "FuwmentLightEn";
let fontsReady = false;

/**
 * وزیرمتن ۴۰۰ تا ۹۰۰. وزن Black (۹۰۰) برای تیترِ درشتِ نمونه‌هاست — همان
 * فونت برند، فونت سومی اضافه نمی‌شود (راهنما: «دو فونت، بیشتر نه»).
 * نبودِ فایل Black بی‌صدا به ExtraBold برمی‌گردد.
 */
export function registerLightFonts(opts: { fontDir?: string; blackFontPath?: string } = {}): void {
  if (fontsReady) return;
  const dir = opts.fontDir ?? path.join(process.cwd(), "public", "fonts");
  for (const f of ["Vazirmatn-Regular", "Vazirmatn-Medium", "Vazirmatn-SemiBold", "Vazirmatn-Bold", "Vazirmatn-ExtraBold"]) {
    GlobalFonts.registerFromPath(path.join(dir, `${f}.woff2`), FAMILY_FA);
  }
  const black = opts.blackFontPath ?? path.join(dir, "Vazirmatn-Black.woff2");
  try {
    GlobalFonts.registerFromPath(black, FAMILY_FA);
  } catch {
    console.error(`[slide-light] فونت Black پیدا نشد (${black}) — تیتر با ExtraBold کشیده می‌شود`);
  }
  for (const f of ["Inter-Regular", "Inter-Medium", "Inter-Bold"]) {
    GlobalFonts.registerFromPath(path.join(dir, `${f}.woff2`), FAMILY_EN);
  }
  fontsReady = true;
}

function font(weight: number, size: number, language: "fa" | "en"): string {
  return `${weight} ${size}px ${language === "fa" ? FAMILY_FA : FAMILY_EN}`;
}

/**
 * آیکون دورنگِ Phosphor (duotone) → رنگ برند. مسیرِ `opacity="0.2"` سطح
 * پرشده است و نارنجی روشن می‌گیرد؛ بقیه خطِ سرمه‌ای. همان ظاهرِ «خط تیره +
 * سطح نارنجی» نمونه‌ی ب.
 */
export function brandDuotoneSvg(svg: string, line: string = LIGHT.ink, fill: string = LIGHT.iconFill): Buffer {
  return Buffer.from(
    svg
      .replace('fill="currentColor"', `fill="${line}" width="512" height="512"`)
      .replace(/opacity="0\.2"/g, `fill="${fill}"`)
  );
}

/**
 * زمینه‌ی تصویرسازیِ مدل را شفاف می‌کند تا روی نیم‌دایره/لکه‌های قالب بنشیند.
 *
 * مدل تصویری PNG شفاف نمی‌دهد؛ پرامپت زمینه‌ی تخت به رنگ قالب می‌خواهد و
 * این تابع از لبه‌ها پر می‌کند (flood fill): هر پیکسلِ متصل به لبه که به
 * رنگ گوشه نزدیک است شفاف می‌شود. فقط از لبه — پس سطح‌های روشنِ **داخل**
 * شیء (بدنه‌ی کرم چمدان) دست نمی‌خورند حتی اگر هم‌رنگ زمینه باشند.
 * لبه‌ی نزدیک به آستانه نیمه‌شفاف می‌شود تا دندانه نزند.
 *
 * ⚠️ آستانه عمداً ۶ است، نه بیشتر. زمینه‌ی خروجی مدل تقریباً تخت است (±۲)،
 * ولی بدنه‌ی کرم چمدان فقط ~۱۶ واحد با آن فاصله داشت: آستانه‌ی ۲۶ در اولین
 * آزمایش (۲۰۲۶-۱۰-۱۲) نیمی از چمدان و کاغذ توصیه‌نامه را پاک کرد.
 */
export async function cutoutIllustration(buf: Buffer, tolerance = 6): Promise<Buffer> {
  const img = await loadImage(buf);
  const w = img.width;
  const h = img.height;
  const c = createCanvas(w, h);
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;

  // رنگ کلید = میانگین چهار گوشه
  const corners = [0, w - 1, (h - 1) * w, h * w - 1];
  const key = [0, 1, 2].map((ch) => corners.reduce((s, i) => s + px[i * 4 + ch], 0) / 4);
  const dist = (i: number) =>
    Math.sqrt((px[i * 4] - key[0]) ** 2 + (px[i * 4 + 1] - key[1]) ** 2 + (px[i * 4 + 2] - key[2]) ** 2);

  const soft = tolerance * 1.8;
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);

  while (stack.length) {
    const i = stack.pop()!;
    if (seen[i]) continue;
    seen[i] = 1;
    const d = dist(i);
    if (d > soft) continue;
    // داخل آستانه: کاملاً شفاف و ادامه‌ی پرکردن؛ نوار نرم: نیمه‌شفاف و توقف
    if (d <= tolerance) {
      px[i * 4 + 3] = 0;
      const x = i % w;
      if (x > 0) stack.push(i - 1);
      if (x < w - 1) stack.push(i + 1);
      if (i >= w) stack.push(i - w);
      if (i < (h - 1) * w) stack.push(i + w);
    } else {
      px[i * 4 + 3] = Math.round(255 * ((d - tolerance) / (soft - tolerance)));
    }
  }
  ctx.putImageData(data, 0, 0);

  // حاشیه‌ی شفاف بریده می‌شود — وگرنه شیء ۶۵٪ِ قاب مدل است و در جای آیکون ریز دیده می‌شود
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] > 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return c.toBuffer("image/png");
  const tw = maxX - minX + 1;
  const th = maxY - minY + 1;
  const trimmed = createCanvas(tw, th);
  trimmed.getContext("2d").drawImage(c, minX, minY, tw, th, 0, 0, tw, th);
  return trimmed.toBuffer("image/png");
}

/**
 * تصویر را با حفظ نسبت در جعبه می‌نشاند — پایینِ تصویر روی پایینِ جعبه،
 * افقی وسط. آیکون SVG مربع است و تغییری نمی‌کند؛ تصویرسازیِ بریده‌شده
 * دیگر کشیده نمی‌شود. بازه‌ی واقعیِ رسم‌شده را برمی‌گرداند (برای سایه).
 */
function fitSize(img: Image, boxW: number, boxH: number) {
  const scale = Math.min(boxW / img.width, boxH / img.height);
  return { w: img.width * scale, h: img.height * scale };
}

function drawFit(ctx: SKRSContext2D, img: Image, cx: number, bottom: number, boxW: number, boxH: number): void {
  const { w, h } = fitSize(img, boxW, boxH);
  ctx.drawImage(img, cx - w / 2, bottom - h, w, h);
}

/* ── هندسه ───────────────────────────────────────────────── */

type Frame = {
  W: number;
  H: number;
  /** ناحیه‌ی مجاز محتوا */
  top: number;
  bottom: number;
  padX: number;
  /** خط پایه‌ی امضای پایین */
  footerY: number;
};

function frameFor(opts: LightRenderOptions): Frame {
  if (opts.format === "story") {
    const W = STORY_CANVAS.width;
    const H = STORY_CANVAS.height;
    const bottomReserve = STORY_SAFE.bottom + (opts.hasSticker ? STICKER_ZONE : 0);
    return { W, H, top: STORY_SAFE.top + 40, bottom: H - bottomReserve - 90, padX: 96, footerY: H - STORY_SAFE.bottom - 24 };
  }
  return { W: 1080, H: 1350, top: 150, bottom: 1200, padX: 90, footerY: 1290 };
}

/** نقش فریم — کاور/میانی/آخر، از جایگاه (همان قاعده‌ی رندرکننده‌ی اصلی) */
function roleOf(opts: LightRenderOptions): SlideRole {
  if (opts.format === "story") {
    const r = storyRoleFor(opts.index, opts.total);
    return r === "hook" ? "cover" : r === "cta" ? "cta" : "middle";
  }
  return roleFor(opts.index, opts.total);
}

/* ── کمکی‌های رسم ─────────────────────────────────────────── */

async function load(buf?: Buffer): Promise<Image | undefined> {
  if (!buf) return undefined;
  try {
    return await loadImage(buf);
  } catch (err) {
    console.error(`[slide-light] تصویر/آیکون بارگذاری نشد: ${err instanceof Error ? err.message : String(err)}`);
    return undefined;
  }
}

/** هایلایت ماژیکی پشت یک خط — لبه‌ی کمی نامنظم، مثل قلم */
function drawBrush(ctx: SKRSContext2D, x1: number, x2: number, yTop: number, h: number): void {
  const steps = 14;
  ctx.save();
  ctx.fillStyle = LIGHT.brush;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const x = x1 + ((x2 - x1) * i) / steps;
    const y = yTop + Math.sin(i * 1.7) * 3;
    i === 0 ? ctx.moveTo(x - 6, y + 4) : ctx.lineTo(x, y);
  }
  for (let i = steps; i >= 0; i--) {
    const x = x1 + ((x2 - x1) * i) / steps;
    ctx.lineTo(x, yTop + h + Math.cos(i * 1.3) * 3);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** خط‌زیرِ دست‌کشیده‌ی نارنجی — یک قوسِ ملایم با سرِ گرد */
function drawSwoosh(ctx: SKRSContext2D, x1: number, x2: number, y: number, width = 8): void {
  ctx.save();
  ctx.strokeStyle = LIGHT.orange;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y + 4);
  ctx.quadraticCurveTo((x1 + x2) / 2, y - 8, x2, y + 2);
  ctx.stroke();
  ctx.restore();
}

/** سه خطِ کوتاه تزئینی («جرقه») — نمونه‌ی ب دو طرف تیتر و جمله‌ی آخر دارد */
function drawSparks(ctx: SKRSContext2D, x: number, y: number, mirror = false): void {
  ctx.save();
  ctx.strokeStyle = LIGHT.orange;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  const dir = mirror ? -1 : 1;
  for (const [angle, len] of [
    [-130, 22],
    [-95, 28],
    [-60, 22],
  ] as const) {
    const a = (angle * Math.PI) / 180;
    const sx = x + Math.cos(a) * 16 * dir;
    const sy = y + Math.sin(a) * 16;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(a) * len * dir, sy + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.restore();
}

function drawShadow(ctx: SKRSContext2D, cx: number, y: number, w: number): void {
  ctx.save();
  ctx.fillStyle = LIGHT.shadow;
  ctx.beginPath();
  ctx.ellipse(cx, y, w / 2, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function roundRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** لکه‌های گوشه‌ی خانواده‌ی ب — سرمه‌ای بالا، نارنجی پایین، هرکدام با یک خط نازک */
function drawCornerBlobs(ctx: SKRSContext2D, f: Frame): void {
  const { W, H } = f;
  ctx.save();
  const tealGrad = ctx.createRadialGradient(90, 70, 10, 90, 70, 320);
  tealGrad.addColorStop(0, PENUMBRA_CENTER.teal);
  tealGrad.addColorStop(1, LIGHT.teal);
  ctx.fillStyle = tealGrad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(310, 0);
  ctx.bezierCurveTo(270, 80, 190, 130, 110, 160);
  ctx.bezierCurveTo(50, 185, 15, 225, 0, 270);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = LIGHT.orange;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(350, 0);
  ctx.bezierCurveTo(310, 110, 200, 175, 120, 205);
  ctx.bezierCurveTo(60, 228, 25, 262, 0, 310);
  ctx.stroke();

  const orangeGrad = ctx.createRadialGradient(W - 90, H - 80, 10, W - 90, H - 80, 330);
  orangeGrad.addColorStop(0, PENUMBRA_CENTER.orange);
  orangeGrad.addColorStop(1, LIGHT.orange);
  ctx.fillStyle = orangeGrad;
  ctx.beginPath();
  ctx.moveTo(W, H);
  ctx.lineTo(W - 330, H);
  ctx.bezierCurveTo(W - 300, H - 100, W - 210, H - 160, W - 120, H - 190);
  ctx.bezierCurveTo(W - 60, H - 210, W - 20, H - 250, W, H - 300);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = LIGHT.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(W - 430, H);
  ctx.bezierCurveTo(W - 330, H - 150, W - 160, H - 230, W, H - 380);
  ctx.stroke();
  ctx.restore();
}

/** هواپیما و خطِ مسیر خانواده‌ی الف */
function drawFlightPath(ctx: SKRSContext2D, f: Frame, plane?: Image): void {
  const px = f.W * 0.62;
  const py = f.top - 40;
  ctx.save();
  ctx.strokeStyle = LIGHT.orange;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(px + 55, py + 30);
  ctx.bezierCurveTo(px + 180, py + 110, px + 300, py + 150, f.W + 10, py + 160);
  ctx.stroke();
  if (plane) {
    ctx.translate(px, py);
    ctx.rotate((20 * Math.PI) / 180);
    ctx.drawImage(plane, -55, -55, 110, 110);
  }
  ctx.restore();
}

/* ── متن ─────────────────────────────────────────────────── */

type TextBlock = {
  lines: string[];
  weight: number;
  size: number;
  lineHeight: number;
  color: string;
};

function makeBlock(
  ctx: SKRSContext2D,
  text: string | undefined,
  o: { weight: number; size: number; lineHeight: number; color: string; maxWidth: number; language: "fa" | "en"; balance?: boolean }
): TextBlock | null {
  if (!text?.trim()) return null;
  ctx.font = font(o.weight, o.size, o.language);
  return { lines: o.balance ? balancedLines(ctx, text, o.maxWidth) : wrapText(ctx, text, o.maxWidth), weight: o.weight, size: o.size, lineHeight: o.lineHeight, color: o.color };
}

/**
 * شکست خطِ متوازن برای تیتر — بدون این، تیتر دوخطی اغلب یک واژه‌ی تنها
 * («دار»، «بدی؟») روی خط آخر می‌گذاشت. عرض را تا جایی کم می‌کند که تعداد
 * خط عوض نشود؛ پس خط‌ها هم‌اندازه‌تر می‌شوند و چیزی بریده نمی‌شود.
 */
function balancedLines(ctx: SKRSContext2D, text: string, maxWidth: number): string[] {
  const base = wrapText(ctx, text, maxWidth);
  if (base.length < 2) return base;
  let lo = maxWidth * 0.5;
  let hi = maxWidth;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    if (wrapText(ctx, text, mid).length === base.length) hi = mid;
    else lo = mid;
  }
  return wrapText(ctx, text, hi);
}

const blockHeight = (b: TextBlock | null) => (b ? b.lines.length * b.size * b.lineHeight : 0);

/** کدام خط تیتر هایلایت می‌گیرد — خطی که عبارت را دارد، وگرنه خط آخر */
function highlightLine(lines: string[], phrase?: string): number {
  if (phrase) {
    const i = lines.findIndex((l) => l.includes(phrase.trim()));
    if (i >= 0) return i;
  }
  return lines.length - 1;
}

type Align = "center" | "start";

/**
 * خط‌ها را می‌کشد و بازه‌ی افقی هر خط را برمی‌گرداند (برای هایلایت/خط‌زیر).
 * `start` در فارسی یعنی راست‌چین.
 */
function drawBlock(
  ctx: SKRSContext2D,
  b: TextBlock,
  o: { top: number; align: Align; f: Frame; language: "fa" | "en"; before?: (i: number, x1: number, x2: number, lineTop: number) => void }
): { bottom: number; spans: { x1: number; x2: number; top: number }[] } {
  const rtl = o.language === "fa";
  ctx.font = font(b.weight, b.size, o.language);
  ctx.direction = rtl ? "rtl" : "ltr";
  ctx.textAlign = o.align === "center" ? "center" : rtl ? "right" : "left";
  const anchor = o.align === "center" ? o.f.W / 2 : rtl ? o.f.W - o.f.padX : o.f.padX;
  const lh = b.size * b.lineHeight;
  const spans: { x1: number; x2: number; top: number }[] = [];
  let top = o.top;
  for (const [i, line] of b.lines.entries()) {
    const w = ctx.measureText(line).width;
    const x1 = o.align === "center" ? anchor - w / 2 : rtl ? anchor - w : anchor;
    spans.push({ x1, x2: x1 + w, top });
    o.before?.(i, x1, x1 + w, top);
    ctx.font = font(b.weight, b.size, o.language);
    ctx.fillStyle = b.color;
    ctx.fillText(line, anchor, top + lh * 0.5 + b.size * 0.35);
    top += lh;
  }
  return { bottom: top, spans };
}

/* ── رندر ────────────────────────────────────────────────── */

export async function renderLightFrame(slide: Slide, opts: LightRenderOptions): Promise<Buffer> {
  registerLightFonts();
  const f = frameFor(opts);
  const role = roleOf(opts);
  const canvas = createCanvas(f.W, f.H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = LIGHT.bg;
  ctx.fillRect(0, 0, f.W, f.H);

  const hero = await load(opts.assets?.hero);
  const heroSecondary = await load(opts.assets?.heroSecondary);
  const itemIcons = await Promise.all((opts.assets?.itemIcons ?? []).map((b) => load(b)));
  const plane = await load(opts.assets?.plane);

  if (opts.family === "playful") {
    await drawPlayful(ctx, slide, opts, f, role, { hero, heroSecondary, itemIcons, plane, heroIsIllustration: Boolean(opts.assets?.heroIsIllustration) });
  } else {
    await drawEditorial(ctx, slide, opts, f, role, { hero, heroSecondary, itemIcons, plane, heroIsIllustration: Boolean(opts.assets?.heroIsIllustration) });
  }
  return canvas.toBuffer("image/png");
}

type Loaded = {
  hero?: Image;
  heroSecondary?: Image;
  itemIcons: (Image | undefined)[];
  plane?: Image;
  heroIsIllustration: boolean;
};

function bodyTextOf(slide: Slide): string | undefined {
  return slide.layout === "standard" ? slide.text : undefined;
}

/* ── خانواده‌ی ب: playful ────────────────────────────────── */

async function drawPlayful(ctx: SKRSContext2D, slide: Slide, opts: LightRenderOptions, f: Frame, role: SlideRole, a: Loaded) {
  const lang = opts.language;
  const story = opts.format === "story";
  drawCornerBlobs(ctx, f);

  const maxW = f.W - f.padX * 2 - 40;
  const boxW = f.W - f.padX * 2 - 40;
  const items = slide.layout === "list" ? slide.items : [];
  // کاور بزرگ‌تر — تصویرسازیِ کاور مهم‌ترین عنصر بصری پست است و در گرید پروفایل دیده می‌شود
  const baseIcon = slide.layout === "statement" ? (story ? 420 : 300) : story ? 400 : 250;
  const fullIcon = a.hero ? (role === "cover" ? Math.round(baseIcon * 1.35) : baseIcon) : 0;

  /**
   * چیدمان با یک ضریب کوچک‌سازی. ⚠️ از اولین تست زنده (۲۰۲۶-۱۰-۱۲): بدنه‌ی
   * سه‌خطیِ کاور استوری از ناحیه‌ی مجاز بیرون زد و روی امضا و **ناحیه‌ی
   * استیکر** نشست — استیکرِ نظرسنجی روی متن می‌افتاد. پس اگر جا نشد، اول
   * آیکون تا ۵۵٪ و بعد متن تا ۷۵٪ کوچک می‌شود؛ هیچ متنی بریده نمی‌شود.
   */
  const layout = (iconScale: number, textScale: number) => {
    const z = (n: number) => Math.round(n * textScale);
    const headingSize = z(slide.layout === "statement" ? (story ? 108 : 88) : story ? 94 : 76);
    const kicker = makeBlock(ctx, slide.kicker, { weight: 600, size: z(story ? 40 : 34), lineHeight: 1.5, color: LIGHT.muted, maxWidth: maxW, language: lang });
    const heading = makeBlock(ctx, slide.heading, { weight: 900, size: headingSize, lineHeight: 1.5, color: LIGHT.ink, maxWidth: maxW, language: lang, balance: true });
    const body = makeBlock(ctx, bodyTextOf(slide), { weight: 500, size: z(story ? 54 : 44), lineHeight: 1.75, color: LIGHT.body, maxWidth: maxW - 40, language: lang });
    const iconSize = Math.round(fullIcon * iconScale);
    const iconBlock = iconSize ? iconSize + 50 : 0;
    // ⚠️ ارتفاع هر بند از تعداد خطش می‌آید — بند بلند دوخطی می‌شود، هرگز بریده نمی‌شود
    const itemSize = z(story ? 44 : 38);
    const itemLh = itemSize * 1.55;
    ctx.font = font(600, itemSize, lang);
    const itemLines = items.map((it) => wrapText(ctx, it, boxW - 150));
    const itemHs = itemLines.map((ls) => Math.max(z(story ? 118 : 104), ls.length * itemLh + 40));
    const listBlock = itemHs.reduce((s2, h) => s2 + h, 0) + Math.max(0, items.length - 1) * 22;
    const gap = z(story ? 64 : 48);
    const parts = [blockHeight(kicker), blockHeight(heading), iconBlock, blockHeight(body), listBlock].filter((h) => h > 0);
    const total = parts.reduce((s2, h) => s2 + h, 0) + gap * (parts.length - 1);
    return { kicker, heading, body, iconSize, iconBlock, itemSize, itemLh, itemLines, itemHs, gap, total };
  };

  const room = f.bottom - f.top;
  let L = layout(1, 1);
  for (let k = 0.95; L.total > room && k >= 0.55; k -= 0.05) L = layout(k, 1);
  for (let k = 0.95; L.total > room && k >= 0.75; k -= 0.05) L = layout(0.55, k);
  if (L.total > room) console.error(`[slide-light] محتوای اسلاید ${opts.index + 1} حتی با کوچک‌سازی جا نشد (${Math.round(L.total)} > ${room})`);
  const { kicker, heading, body, iconSize, iconBlock, itemSize, itemLh, itemLines, itemHs, gap } = L;

  let y = f.top + Math.max(0, (room - L.total) * 0.45);

  if (kicker) {
    const r = drawBlock(ctx, kicker, { top: y, align: "center", f, language: lang });
    const s = r.spans[0];
    drawSparks(ctx, s.x2 + 44, s.top + 40);
    drawSparks(ctx, s.x1 - 44, s.top + 40, true);
    y = r.bottom + gap * 0.6;
  }

  if (heading) {
    const hi = highlightLine(heading.lines, opts.highlight);
    const r = drawBlock(ctx, heading, {
      top: y,
      align: "center",
      f,
      language: lang,
      before: (i, x1, x2, lineTop) => {
        if (i === hi) drawBrush(ctx, x1 - 18, x2 + 18, lineTop + heading.size * 0.42, heading.size * 0.78);
      },
    });
    y = r.bottom + gap;
  }

  if (a.hero && iconSize) {
    const cx = f.W / 2;
    if (a.heroSecondary) {
      const s = iconSize * 0.8;
      drawShadow(ctx, cx - s * 0.6, y + s + 14, s * 0.8);
      drawShadow(ctx, cx + s * 0.6, y + s + 14, s * 0.8);
      drawFit(ctx, a.hero, cx - s * 0.65, y + s, s, s);
      drawFit(ctx, a.heroSecondary, cx + s * 0.65, y + s, s, s);
    } else {
      const { w } = fitSize(a.hero, iconSize * 1.25, iconSize);
      if (!a.heroIsIllustration) drawShadow(ctx, cx, y + iconSize + 10, Math.max(w * 0.8, iconSize * 0.5));
      drawFit(ctx, a.hero, cx, y + iconSize, iconSize * 1.25, iconSize);
    }
    y += iconBlock + gap - 50;
  }

  if (body) {
    const r = drawBlock(ctx, body, { top: y, align: "center", f, language: lang });
    const last = r.spans[r.spans.length - 1];
    // خط آخرِ کوتاه («کردی.») خط‌زیرِ ریز می‌ساخت — حداقل ۲۴۰ پیکسل، وسط همان خط
    const mid = (last.x1 + last.x2) / 2;
    const half = Math.max(120, (last.x2 - last.x1) / 2 - 20);
    drawSwoosh(ctx, mid - half, mid + half, last.top + body.size * body.lineHeight + 4, 6);
    y = r.bottom + gap;
  }

  if (items.length) {
    const x = (f.W - boxW) / 2;
    for (const [k, lines] of itemLines.entries()) {
      const itemH = itemHs[k];
      ctx.save();
      ctx.fillStyle = LIGHT.card;
      roundRect(ctx, x, y, boxW, itemH, 30);
      ctx.fill();
      // نشانگر: دایره‌ی نارنجی با تیکِ جوهری — سمتِ شروعِ متن
      const rtl = lang === "fa";
      const mx = rtl ? x + boxW - 58 : x + 58;
      ctx.fillStyle = LIGHT.orange;
      ctx.beginPath();
      ctx.arc(mx, y + itemH / 2, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = LIGHT.onOrange;
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(mx - 11, y + itemH / 2 + 1);
      ctx.lineTo(mx - 3, y + itemH / 2 + 9);
      ctx.lineTo(mx + 12, y + itemH / 2 - 8);
      ctx.stroke();
      ctx.restore();

      ctx.font = font(600, itemSize, lang);
      ctx.fillStyle = LIGHT.ink;
      ctx.direction = rtl ? "rtl" : "ltr";
      ctx.textAlign = rtl ? "right" : "left";
      const tx = rtl ? x + boxW - 108 : x + 108;
      let ly = y + (itemH - lines.length * itemLh) / 2;
      for (const line of lines) {
        ctx.fillText(line, tx, ly + itemLh / 2 + itemSize * 0.35);
        ly += itemLh;
      }
      y += itemH + 22;
    }
  }

  // امضای پایین — کوچک، گوشه‌ی چپ، مثل نمونه‌ی ب
  ctx.save();
  ctx.strokeStyle = LIGHT.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(56, f.footerY - 10);
  ctx.lineTo(116, f.footerY - 10);
  ctx.stroke();
  ctx.font = font(500, 30, "en");
  ctx.fillStyle = LIGHT.muted;
  ctx.direction = "ltr";
  ctx.textAlign = "left";
  ctx.fillText("Fuwment", 134, f.footerY);
  ctx.restore();
}

/* ── خانواده‌ی الف: editorial ────────────────────────────── */

async function drawEditorial(ctx: SKRSContext2D, slide: Slide, opts: LightRenderOptions, f: Frame, role: SlideRole, a: Loaded) {
  const lang = opts.language;
  const story = opts.format === "story";
  drawFlightPath(ctx, f, a.plane);

  const fullW = f.W - f.padX * 2;
  const hasSideArt = Boolean(a.hero) && slide.layout !== "list";
  const startY = f.top + (story ? 140 : 110);
  // زیرِ متن حداقل این‌قدر جا لازم است: تصویرسازی ≥۲۰۰ یا کارت‌های فهرست (~۳۰۰)
  const reserve = slide.layout === "list" ? 320 : hasSideArt ? 220 : 0;

  /**
   * همان کوچک‌سازیِ خانواده‌ی ب (توضیحش در drawPlayful): متن بلند نباید
   * تصویر یا کارت‌ها را از قاب بیرون بزند. فقط متن کوچک می‌شود، تا ۷۵٪.
   */
  const blocks = (k: number) => {
    const z = (n: number) => Math.round(n * k);
    const headingSize = z(slide.layout === "statement" ? (story ? 110 : 100) : story ? 96 : 88);
    return {
      kicker: makeBlock(ctx, slide.kicker, { weight: 600, size: z(36), lineHeight: 1.5, color: LIGHT.muted, maxWidth: fullW, language: lang }),
      heading: makeBlock(ctx, slide.heading, { weight: 900, size: headingSize, lineHeight: 1.35, color: LIGHT.ink, maxWidth: fullW, language: lang, balance: true }),
      // تصویرسازی همیشه زیرِ متن می‌نشیند، پس متن عرض کامل می‌گیرد
      body: makeBlock(ctx, bodyTextOf(slide), { weight: 600, size: z(story ? 50 : 46), lineHeight: 1.7, color: LIGHT.body, maxWidth: fullW, language: lang }),
      gapAfterHeading: z(story ? 70 : 50),
    };
  };
  const textHeight = (b: ReturnType<typeof blocks>) =>
    blockHeight(b.kicker) + 14 + blockHeight(b.heading) + b.gapAfterHeading + blockHeight(b.body) + 40;
  let B = blocks(1);
  for (let k = 0.95; startY + textHeight(B) + reserve > f.bottom && k >= 0.75; k -= 0.05) B = blocks(k);
  if (startY + textHeight(B) + reserve > f.bottom) {
    console.error(`[slide-light] متن اسلاید ${opts.index + 1} حتی با کوچک‌سازی جای تصویر/کارت را تنگ کرد`);
  }
  const { kicker, heading, body } = B;

  let y = startY;

  if (kicker) {
    y = drawBlock(ctx, kicker, { top: y, align: "start", f, language: lang }).bottom + 14;
  }

  if (heading) {
    const r = drawBlock(ctx, heading, { top: y, align: "start", f, language: lang });
    const hi = highlightLine(heading.lines, opts.highlight);
    const s = r.spans[hi];
    drawSwoosh(ctx, s.x1 + 10, Math.min(s.x2, s.x1 + Math.max(260, (s.x2 - s.x1) * 0.75)), s.top + heading.size * heading.lineHeight + 6, 9);
    y = r.bottom + B.gapAfterHeading;
  }

  if (body) {
    y = drawBlock(ctx, body, { top: y, align: "start", f, language: lang }).bottom + 40;
  }
  const textBottom = y;

  // فهرست → کارت‌های ستونی (راست به چپ در فارسی)، هرکدام با آیکون
  if (slide.layout === "list") {
    const n = slide.items.length;
    const gapX = 22;
    const cardW = (fullW - gapX * (n - 1)) / n;
    const cardSize = story ? 40 : 36;
    ctx.font = font(700, cardSize, lang);
    const cardLines = slide.items.map((it) => wrapText(ctx, it, cardW - 40));
    const maxLines = Math.max(...cardLines.map((l) => l.length));
    const cardH = 230 + maxLines * cardSize * 1.5 + 30;
    const cardTop = Math.max(y + 20, Math.min(story ? 900 : 700, f.bottom - cardH));
    for (const i of slide.items.keys()) {
      const col = lang === "fa" ? n - 1 - i : i;
      const x = f.padX + col * (cardW + gapX);
      ctx.save();
      ctx.fillStyle = LIGHT.card;
      roundRect(ctx, x, cardTop, cardW, cardH, 28);
      ctx.fill();
      ctx.restore();
      const icon = a.itemIcons[i];
      if (icon) ctx.drawImage(icon, x + cardW / 2 - 64, cardTop + 42, 128, 128);
      ctx.font = font(700, cardSize, lang);
      ctx.fillStyle = LIGHT.ink;
      ctx.direction = lang === "fa" ? "rtl" : "ltr";
      ctx.textAlign = "center";
      let ty = cardTop + 230;
      for (const line of cardLines[i]) {
        ctx.fillText(line, x + cardW / 2, ty);
        ty += cardSize * 1.5;
      }
    }
  }

  // تصویرسازی روی نیم‌دایره‌ی هلویی — پایینِ راست، مثل نمونه
  // ⚠️ همیشه زیرِ متن و کامل داخل قاب: اندازه از فضای باقی‌مانده می‌آید، نه عدد ثابت
  if (hasSideArt && a.hero) {
    const ground = f.bottom + 20;
    const s = Math.max(200, Math.min(story ? 520 : 420, ground - textBottom - 20));
    const cx = f.W - f.padX - s / 2;
    const r = s * 0.62;
    ctx.save();
    ctx.fillStyle = LIGHT.peach;
    ctx.beginPath();
    ctx.arc(cx + s * 0.08, ground, r, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    if (!a.heroIsIllustration) drawShadow(ctx, cx, ground, s * 0.75);
    drawFit(ctx, a.hero, cx, ground - 4, s, s);
  }

  // امضای FUWMENT وسط، با دو خط
  ctx.save();
  ctx.font = font(700, 34, "en");
  ctx.fillStyle = LIGHT.ink;
  ctx.direction = "ltr";
  ctx.textAlign = "center";
  ctx.letterSpacing = "6px";
  ctx.fillText("FUWMENT", f.W / 2, f.footerY);
  ctx.strokeStyle = LIGHT.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(70, f.footerY - 12);
  ctx.lineTo(f.W / 2 - 150, f.footerY - 12);
  ctx.moveTo(f.W / 2 + 150, f.footerY - 12);
  ctx.lineTo(f.W - 70, f.footerY - 12);
  ctx.stroke();
  ctx.restore();
}

/* ── سطح بالا: کل کاروسل / کل استوری ─────────────────────── */

const iconCache = new Map<string, Buffer>();

/**
 * آیکونِ برند از روی شناسه — فایل `public/icons/phosphor/{id}.svg`.
 *
 * ⚠️ شناسه‌ی ناشناخته یا فایلِ گم‌شده با لاگ `undefined` برمی‌گرداند، نه throw:
 * اسلاید بی‌آیکون هنوز کاملاً قابل انتشار است (قاعده‌ی ۶ — بی‌صدا نه).
 */
export function iconBuffer(id: string | undefined, colors?: { line?: string; fill?: string }): Buffer | undefined {
  if (!id) return undefined;
  if (!isIconId(id)) {
    console.error(`[slide-light] آیکون ناشناخته: «${id}»`);
    return undefined;
  }
  const key = `${id}|${colors?.line ?? ""}|${colors?.fill ?? ""}`;
  const hit = iconCache.get(key);
  if (hit) return hit;
  try {
    const svg = readFileSync(path.join(process.cwd(), "public", "icons", "phosphor", `${id}.svg`), "utf8");
    const buf = brandDuotoneSvg(svg, colors?.line, colors?.fill);
    iconCache.set(key, buf);
    return buf;
  } catch (err) {
    console.error(`[slide-light] فایل آیکون «${id}» خوانده نشد: ${err instanceof Error ? err.message : String(err)}`);
    return undefined;
  }
}

/**
 * عناصر گرافیکیِ هر اسلاید/فریم از روی داده‌ی ذخیره‌شده.
 *
 * - اسلاید اول: تصویرسازیِ کاور اگر هست، وگرنه آیکونِ خودش.
 * - اسلاید آخرِ خانواده‌ی ب بی‌آیکون: «ذخیره + ارسال» کنار هم، مثل نمونه‌ی مالک.
 * - list: آیکون هر بند (`itemIcons`).
 * - خانواده‌ی الف: هواپیمای نارنجیِ بالای قاب.
 */
function assetsFor(slide: Slide, index: number, total: number, family: VisualFamily, illustration?: Buffer): LightAssets {
  const last = index === total - 1;
  const pair = family === "playful" && last && !slide.icon;
  return {
    hero: index === 0 && illustration ? illustration : pair ? iconBuffer("bookmark-simple") : iconBuffer(slide.icon),
    heroIsIllustration: index === 0 && Boolean(illustration),
    heroSecondary: pair ? iconBuffer("paper-plane-tilt") : undefined,
    itemIcons: slide.layout === "list" ? (slide.itemIcons ?? []).map((id) => iconBuffer(id)) : undefined,
    plane: family === "editorial" ? iconBuffer("airplane-tilt", { line: LIGHT.orange, fill: LIGHT.orange }) : undefined,
  };
}

/**
 * کل کاروسل با قالب روشن.
 *
 * ⚠️ `illustration` باید **از قبل شفاف‌شده** باشد (`cutoutIllustration`) —
 * `storage.ts` نسخه‌ی شفاف را ذخیره می‌کند تا رندر دوباره نه پول بدهد نه
 * دوباره پردازش کند.
 */
export async function renderLightCarousel(
  slides: Slide[],
  opts: { family: VisualFamily; language: "fa" | "en"; illustration?: Buffer }
): Promise<Buffer[]> {
  const out: Buffer[] = [];
  for (const [i, slide] of slides.entries()) {
    out.push(
      await renderLightFrame(slide, {
        family: opts.family,
        format: "carousel",
        language: opts.language,
        index: i,
        total: slides.length,
        highlight: slide.highlight,
        assets: assetsFor(slide, i, slides.length, opts.family, opts.illustration),
      })
    );
  }
  return out;
}

/** کل استوری با قالب روشن — ناحیه‌ی استیکر روی فریم‌های استیکردار خالی می‌ماند */
export async function renderLightStory(
  frames: Slide[],
  opts: { family: VisualFamily; language: "fa" | "en"; illustration?: Buffer; stickerFrames?: ReadonlySet<number> }
): Promise<Buffer[]> {
  const out: Buffer[] = [];
  for (const [i, frame] of frames.entries()) {
    out.push(
      await renderLightFrame(frame, {
        family: opts.family,
        format: "story",
        language: opts.language,
        index: i,
        total: frames.length,
        highlight: frame.highlight,
        hasSticker: opts.stickerFrames?.has(i) ?? false,
        assets: assetsFor(frame, i, frames.length, opts.family, opts.illustration),
      })
    );
  }
  return out;
}
