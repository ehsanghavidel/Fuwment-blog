/**
 * ارتباط منبع با مقاله‌ی بلاگ — حوزه‌ی قضایی و مسیر (v3.7).
 *
 * ⚠️ درس از سومین اجرای زنده: مقاله‌ی «گلوبال تلنت بریتانیا» منابعی درباره‌ی
 * ویزای Global Talent / National Innovation **استرالیا** چاپ کرد. علت:
 * `selectSources` فقط امتیاز مرتبط‌بودنِ Tavily را می‌دید — یعنی شباهت متن
 * با کوئری. «Global Talent» در هر دو کشور یک نام است، پس صفحه‌ی استرالیایی
 * امتیاز بالا می‌گرفت. هیچ لایه‌ای کشور یا مسیر را نمی‌سنجید.
 *
 * این فایل قطعی و بدون شبکه است (بدون `server-only`، تا تست آفلاین بخواندش).
 * عمداً محافظه‌کار است: فقط نشانه‌های **بی‌ابهامِ** کشور دیگر یا مسیر دیگر
 * را رد می‌کند؛ هر چیزی که نشانه‌ی بریتانیا هم دارد می‌ماند (قاعده‌ی ۲ —
 * چک قطعیِ غلط بدتر از نبودنش است).
 */

export type SourceCandidate = { title: string; url: string; content?: string };

/**
 * همه‌ی مقاله‌های بلاگ فومنت درباره‌ی بریتانیاست (دو مسیر برند هر دو
 * ویزای بریتانیا هستند). اگر روزی مقصد دیگری اضافه شد، این باید از بریف
 * بیاید.
 */
export const BLOG_JURISDICTION = "UK" as const;

/**
 * کد کشورِ دامنه‌هایی که هرگز منبع قاعده‌ی مهاجرت بریتانیا نیستند.
 * `.gov` بدون پسوند کشور، دولت فدرال آمریکاست (uscis.gov).
 */
const FOREIGN_CC_TLDS = new Set([
  "au", "ca", "nz", "ie", "in", "sg", "ae", "de", "fr", "nl", "us", "za", "hk", "my", "ph", "pk", "ng",
]);

/** نشانه‌ی بی‌ابهامِ حوزه‌ی قضایی دیگر — در عنوان/آدرس رد قطعی است */
const FOREIGN_MARKERS: RegExp[] = [
  /\baustralia(?:n)?\b/i,
  /\bnational innovation visa\b/i,
  /\bsubclass\s*\d{3}\b/i,
  /\bdepartment of home affairs\b/i,
  /\bglobal talent (?:independent|employer sponsored)\b/i,
  /\bcanad(?:a|ian)\b/i,
  /\bircc\b/i,
  /\bexpress entry\b/i,
  /\bnew zealand\b/i,
  /\buscis\b/i,
  /\b(?:o-1|eb-1|eb-2|h-1b)\b/i,
  /\bblue card\b/i,
  /\bgolden visa\b/i,
  /\bsingapore\b/i,
  /استرالیا/,
  /کانادا/,
  /نیوزیلند/,
  /آمریکا|ایالات متحده/,
  /امارات|دبی/,
  /آلمان/,
  /سنگاپور/,
];

/** نشانه‌ی بریتانیا — اگر هست، اشاره‌ی گذرا به کشور دیگر در متن منبع را رد نمی‌کند */
const UK_MARKERS: RegExp[] = [
  /\bUK\b/,
  /\bU\.K\.?/,
  /\bunited kingdom\b/i,
  /\bbritain\b/i,
  /\bbritish\b/i,
  /\bhome office\b/i,
  /\bgov\.uk\b/i,
  /\btech nation\b/i,
  /\bukri\b/i,
  /\bengland\b/i,
  /\blondon\b/i,
  /بریتانیا|انگلستان|انگلیس|لندن/,
];

/**
 * مسیرهای دیگرِ بریتانیا که در مقاله‌ی یک مسیر **منبع گمراه‌کننده**‌اند —
 * مهم‌ترینش آستانه‌ی حقوقِ Skilled Worker که در مقاله‌ی گلوبال تلنت به
 * «آستانه‌ی درآمدی» تبدیل می‌شود. فقط وقتی عنوان مسیر دیگر را نام برده و
 * مسیر خودِ مقاله را نه.
 */
const ROUTE_RULES: Record<string, { self: RegExp; others: RegExp } | undefined> = {
  "global-talent": {
    self: /global talent|exceptional (?:talent|promise)|گلوبال تلنت/i,
    others: /skilled worker|health and care|high potential|scale-?up visa|graduate visa|student visa|family visa|spouse visa|innovator founder/i,
  },
  "innovator-founder": {
    self: /innovator|founder|start-?up|اینوویتور|فاندر/i,
    others: /skilled worker|health and care|high potential|graduate visa|student visa|family visa|spouse visa|global talent/i,
  },
};

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * آیا این منبع به مقاله‌ی بلاگِ این مسیر ربط دارد؟
 *
 * برمی‌گرداند `null` اگر می‌ماند، یا دلیل ردشدن (برای لاگ `[researcher]`).
 */
export function irrelevanceReason(source: SourceCandidate, route?: string): string | null {
  const host = hostOf(source.url);
  if (!host) return "آدرس نامعتبر";

  const labels = host.split(".");
  const tld = labels[labels.length - 1];
  if (FOREIGN_CC_TLDS.has(tld)) return `دامنه‌ی کشور دیگر (.${tld})`;
  if (tld === "gov") return "دامنه‌ی دولت آمریکا (.gov)";

  let path = "";
  try {
    path = decodeURIComponent(new URL(source.url).pathname).replace(/[-_/]+/g, " ");
  } catch {
    /* بدون مسیر */
  }
  const head = `${source.title} ${path}`;
  const body = source.content ?? "";

  const foreignInHead = FOREIGN_MARKERS.find((re) => re.test(head));
  if (foreignInHead) return `کشور دیگر در عنوان/آدرس (${head.match(foreignInHead)?.[0]})`;

  const foreignInBody = FOREIGN_MARKERS.find((re) => re.test(body));
  if (foreignInBody && !UK_MARKERS.some((re) => re.test(head) || re.test(body))) {
    return `متن درباره‌ی کشور دیگر است و هیچ نشانه‌ای از بریتانیا ندارد (${body.match(foreignInBody)?.[0]})`;
  }

  const rule = route ? ROUTE_RULES[route] : undefined;
  if (rule && rule.others.test(source.title) && !rule.self.test(source.title)) {
    return `مسیر دیگری از بریتانیا در عنوان (${source.title.match(rule.others)?.[0]})`;
  }

  return null;
}

/**
 * کوئری کشفِ منبع رسمیِ **جاری** برای هر مسیر — فقط برای پیداکردن صفحه‌ی
 * مسیر/واجد شرایط بودن و قواعد مهاجرت روی GOV.UK، نه برای تزریق ادعا.
 * گزارش‌های ارزیابیِ تاریخی هم رسمی‌اند، ولی جای راهنمای جاری را نمی‌گیرند.
 */
export const OFFICIAL_DISCOVERY_QUERY: Record<string, string | undefined> = {
  "global-talent": "Global Talent visa eligibility guidance Immigration Rules",
  "innovator-founder": "Innovator Founder visa eligibility guidance Immigration Rules",
};
