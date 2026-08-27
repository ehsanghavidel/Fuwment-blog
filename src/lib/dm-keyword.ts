/**
 * رجیستری کلیدواژه‌ی دایرکت — منطق خالص (فاز ۵).
 *
 * ⚠️ عمداً `server-only` ندارد (الگوی `social-format.ts`). این ماژول به
 * دیتابیس، محیط، یا مدل وصل نیست — فقط تابع خالص. لایه‌ی store (اتمی‌بودن،
 * ۲۳۵۰۵) و لایه‌ی ارکستریشن (حلقه‌ی رزرو، throw) در فازهای بعدی روی همین
 * توابع سوار می‌شوند، نه اینجا.
 *
 * قرارداد کامل در پلن فاز ۵ قفل شده؛ اینجا فقط پیاده‌سازی است.
 */

import type { BrandRoute } from "@/lib/company";

/* ── قالب متعارف ─────────────────────────────────────────── */

/** حروفِ بزرگِ ASCII، ۴ تا ۱۲ کاراکتر، شروع با حرف — نسخه‌ی اپلیکیشنِ همان CHECK دیتابیس */
export const DM_KEYWORD_RE = /^[A-Z][A-Z0-9]{3,11}$/;

export const RESERVED_KEYWORDS: ReadonlySet<string> = new Set([
  "INFO",
  "HELP",
  "START",
  "STOP",
  "VISA",
  "GUIDE",
  "HELLO",
  "SALAM",
  "LINK",
  "MORE",
  "FREE",
  "YES",
  "NO",
]);

/**
 * ورودیِ خام را به قالبِ متعارف می‌برد یا `null` برمی‌گرداند.
 *
 * ⚠️ رشته‌ی خامِ کاربر هرگز نباید ذخیره شود — فقط خروجیِ این تابع.
 * `trim` + `toUpperCase` روی حروفِ فارسی بی‌اثر است (فارسی حالت ندارد)،
 * پس فقط ورودیِ لاتین را نرمال می‌کند؛ ورودیِ فارسی همچنان با regex رد
 * می‌شود چون بیرون از `A-Z0-9` است.
 */
export function canonicalizeKeyword(input: string): string | null {
  const canonical = input.trim().toUpperCase();
  if (!DM_KEYWORD_RE.test(canonical)) return null;
  if (RESERVED_KEYWORDS.has(canonical)) return null;
  return canonical;
}

/* ── استخرهای معنایی ─────────────────────────────────────── */

/**
 * `BrandRoute` از `company.ts` بازاستفاده شده، نه یک union جدید — سه مسیرِ
 * قفل‌شده‌ی این فاز دقیقاً همان سه مقدارِ موجود در `BrandRoute` است
 * (`brand` · `global-talent` · `innovator-founder`).
 */
const KEYWORD_POOLS: Record<BrandRoute, readonly [string, string, string, string]> = {
  "global-talent": ["TALENT", "EVIDENCE", "ENDORSE", "IMPACT"],
  "innovator-founder": ["FOUNDER", "VENTURE", "SCALE", "PITCH"],
  brand: ["ROUTE", "COMPASS", "READY", "MAPOUT"],
};

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/** ۳۰ نویسه، بدونِ حروف/رقم‌های مبهم روی کیبوردِ موبایل: بدونِ I L O U 0 1 */
const FALLBACK_ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";

/**
 * مشتقِ قطعیِ سه‌کاراکتری از `postId` — لایه‌ی سومِ کاندید.
 *
 * فقط سه بایتِ `n*3 .. n*3+2` از UUID خوانده می‌شود، نه کلِ آن؛ خروجی
 * برای همان `postId` و همان `n` همیشه یکسان است. `n` باید ۰ تا ۴ باشد
 * (۱۶ بایتِ UUID اجازه‌ی حداکثر پنج بلوکِ سه‌بایتی می‌دهد).
 */
export function idSuffix(postId: string, n: number): string {
  if (!UUID_RE.test(postId)) {
    throw new Error(`[dm-keyword] postId نامعتبر است، UUID انتظار می‌رفت: ${postId}`);
  }
  if (!Number.isInteger(n) || n < 0 || n > 4) {
    throw new Error(`[dm-keyword] n باید عددِ صحیحِ ۰ تا ۴ باشد: ${n}`);
  }
  const hex = postId.replace(/-/g, "");
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16));
  const start = n * 3;
  let out = "";
  for (let i = start; i < start + 3; i++) {
    out += FALLBACK_ALPHABET[bytes[i] % FALLBACK_ALPHABET.length];
  }
  return out;
}

/**
 * فهرستِ کاندیدهای کلیدواژه برای یک پست — قطعی، یکتاسازی‌شده، حداکثر ۱۷.
 *
 * سه لایه: ۴ بذرِ معناییِ استخرِ مسیر، ۸ کاندیدِ عددی (`base2`..`base9`)،
 * و ۵ فال‌بکِ مشتق از `postId`. همه از `canonicalizeKeyword` رد می‌شوند —
 * نباید رد شوند (هر کاندید حداقل ۶ نویسه و بدونِ کلمه‌ی ممنوع است)، ولی
 * قرارداد همین را می‌گوید: اعتبارسنجی همیشه اجرا می‌شود، هرگز فرض نمی‌شود.
 *
 * ایندکسِ یکتای دیتابیس مرجعِ نهاییِ تصادم است، نه این تابع — این فقط
 * فهرستِ تلاش را می‌سازد.
 */
export function keywordCandidates(route: BrandRoute, postId: string): string[] {
  const pool = KEYWORD_POOLS[route];
  const base = pool[0];

  const raw: string[] = [
    ...pool,
    ...Array.from({ length: 8 }, (_, i) => `${base}${i + 2}`),
    ...Array.from({ length: 5 }, (_, n) => `${base}${idSuffix(postId, n)}`),
  ];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const candidate of raw) {
    const canonical = canonicalizeKeyword(candidate);
    if (canonical === null || seen.has(canonical)) continue;
    seen.add(canonical);
    out.push(canonical);
  }
  return out;
}

/* ── خطِ CTA و اعمالِ آن روی کپشن ────────────────────────── */

export const DM_LINE_SEPARATOR = "\n\n";

/** خطِ دقیقِ سیستم — پروتکل‌سطح، نه پیشنهاد. */
export function dmCtaLine(keyword: string, language: "fa" | "en"): string {
  return language === "fa"
    ? `کلمه «${keyword}» را در دایرکت برای ما بفرستید.`
    : `DM us the word "${keyword}".`;
}

function countOccurrences(haystack: string, needle: string): number {
  if (needle === "") return 0;
  let count = 0;
  let from = 0;
  for (;;) {
    const idx = haystack.indexOf(needle, from);
    if (idx === -1) return count;
    count++;
    from = idx + needle.length;
  }
}

/**
 * تعدادِ رخدادِ خطِ کاملِ سیستم در متن — نه توکنِ تنهای کلیدواژه.
 *
 * کپشنی که «TALENT» را جای دیگری هم به‌عنوانِ کلمه‌ی عادی دارد، به‌علاوه‌ی
 * یک خطِ سیستمِ کامل، باید دقیقاً ۱ بدهد — نه ۲. برابریِ رشته‌ای روی خطِ
 * کامل (بدونِ جداکننده) این تضمین را می‌دهد.
 */
export function countDmCtaLine(body: string, keyword: string, language: "fa" | "en"): number {
  return countOccurrences(body, dmCtaLine(keyword, language));
}

export type DmCtaFailureReason = "missing-old-line" | "duplicate-old-line" | "duplicate-new-line";

export type DmCtaResult = { ok: true; body: string } | { ok: false; reason: DmCtaFailureReason };

/**
 * تنها مسیرِ مجاز برای عوض‌کردنِ خطِ دایرکت در `body`.
 *
 * فقط رشته‌ی دقیقِ `SEP + dmCtaLine(oldKeyword, language)` لمس می‌شود؛
 * هیچ کپیِ دیگرِ اپراتور دست نمی‌خورد. اگر وضعیتِ فعلیِ متن با `oldKeyword`
 * نمی‌خواند (نه یک رخدادِ دقیق)، تابع بی‌صدا چیزی الحاق/حذف نمی‌کند —
 * شکستِ صریح برمی‌گرداند تا اپراتور خودش پست را ببیند.
 */
export function applyDmCta(input: {
  body: string;
  language: "fa" | "en";
  oldKeyword: string | null;
  newKeyword: string | null;
}): DmCtaResult {
  const { body, language, oldKeyword, newKeyword } = input;

  const oldSegment = oldKeyword !== null ? DM_LINE_SEPARATOR + dmCtaLine(oldKeyword, language) : null;
  const newSegment = newKeyword !== null ? DM_LINE_SEPARATOR + dmCtaLine(newKeyword, language) : null;

  if (oldSegment !== null) {
    const oldCount = countOccurrences(body, oldSegment);
    if (oldCount === 0) return { ok: false, reason: "missing-old-line" };
    if (oldCount > 1) return { ok: false, reason: "duplicate-old-line" };
  }

  // اگر گذار بی‌اثر است (همان کلیدواژه دوباره)، بررسیِ تکراری‌بودنِ خطِ
  // جدید معنی ندارد — همان خطِ قبلاً تأییدشده است.
  if (newSegment !== null && newSegment !== oldSegment) {
    const newCount = countOccurrences(body, newSegment);
    if (newCount > 0) return { ok: false, reason: "duplicate-new-line" };
  }

  if (oldSegment === newSegment) return { ok: true, body };
  if (oldSegment === null && newSegment !== null) return { ok: true, body: body + newSegment };
  if (oldSegment !== null && newSegment === null) return { ok: true, body: body.replace(oldSegment, "") };
  return { ok: true, body: body.replace(oldSegment as string, newSegment as string) };
}
