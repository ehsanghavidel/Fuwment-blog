import "server-only";
import { z } from "zod";
import { runAgentJSON } from "@/lib/ai";
import { BLOCKED_SOURCE_DOMAINS, COMPANY_NAME, COMPANY_PROFILE } from "@/lib/company";
import { lessonsBlockFor } from "./lessons";
import { clampText, ResearchSchema, type Brief, type Research, type Source } from "./types";

/**
 * ایجنت ۳ — پژوهشگر (Researcher)
 *
 * وظیفه: جمع‌آوری ماده‌ی خام مقاله — فکت‌ها، مثال‌ها و سؤال‌های رایج —
 * تا نویسنده از خودش «نبافد» (کاهش توهم).
 *
 * نکته‌ی آموزشی — الگوی «مدل تصمیم می‌گیرد، کد اجرا می‌کند»:
 * اگر کلید Tavily موجود باشد، مرحله‌ی اول از مدل «کوئری جستجو» می‌گیریم
 * (تصمیم با LLM)، ولی خودِ جستجو را با fetch معمولی در کد انجام می‌دهیم
 * (اجرای قطعی). این تفکیک از دادنِ ابزار آزاد به مدل قابل‌اعتمادتر است.
 * بدون کلید، پژوهشگر به دانش خود مدل تکیه می‌کند و پایپ‌لاین نمی‌شکند.
 */

const QueriesSchema = z.object({ queries: z.array(z.string()).min(2).max(4) });

/**
 * سقف منابعِ ضمیمه‌شده به مقاله.
 *
 * تا ۴ کوئری × ۳ نتیجه = حداکثر ۱۲ نتیجه. فهرست ۱۲تایی زیر یک مقاله‌ی
 * ۱۲۰۰ کلمه‌ای بیشتر شبیه لاگ است تا منبع، پس بعد از حذف تکراری‌ها می‌بُریم.
 */
const MAX_SOURCES = 6;

/**
 * دامنه‌هایی که هیچ‌وقت منبع قابل استناد نیستند.
 *
 * برخلاف BLOCKED_SOURCE_DOMAINS (که تصمیم کسب‌وکاری است و در company.ts
 * زندگی می‌کند)، این فهرست ساختاری است: یک ریل اینستاگرام یا تاپیک انجمن،
 * فارغ از اینکه چه کسی نوشته‌اش، سند شرایط ویزا نیست.
 */
const SOCIAL_AND_FORUM_DOMAINS = [
  "instagram.com",
  "tiktok.com",
  "youtube.com",
  "youtu.be",
  "facebook.com",
  "x.com",
  "twitter.com",
  "pinterest.com",
  // ⚠️ لینکدین در فهرست شما نبود؛ اضافه‌اش کردم چون پست لینکدین هم مثل
  //    ریل اینستاگرام، سند نیست. اگر مخالفید همین یک خط را بردارید.
  "linkedin.com",
  // انجمن‌ها و پرسش‌وپاسخ
  "reddit.com",
  "quora.com",
  "t.me",
  "telegram.me",
];

/**
 * دامنه‌های نهادهای رسمی — در رتبه‌بندی امتیاز اضافه می‌گیرند.
 *
 * ⚠️ این فهرست را خودتان بازبینی کنید؛ نهادهای اندورس‌کننده عوض می‌شوند.
 */
const OFFICIAL_DOMAINS = [
  // Tech Nation — اندورس‌کننده‌ی رسمی مسیر دیجیتال تک. در مه ۲۰۲۵ قرارداد
  // سه‌ساله‌ی تازه گرفت؛ از اوت ۲۰۲۵ فقط رویه‌ی ارسال به فرم استاندارد
  // وزارت کشور روی gov.uk منتقل شده، نه خودِ نقش اندورس‌کنندگی.
  "technation.io",
  "ukri.org",
  "royalsociety.org",
  "raeng.org.uk",
  "thebritishacademy.ac.uk",
  "artscouncil.org.uk",
  "britishfashioncouncil.co.uk",
  "pact.co.uk",
  "architecture.com",
];

/** هاستی که برای قفل‌کردن کوئری رسمی به Tavily داده می‌شود */
const OFFICIAL_QUERY_HOST = "www.gov.uk";

/**
 * فقط دامنه‌ی مرکزی gov.uk رسمی حساب می‌شود.
 *
 * ⚠️ درس از یک اجرای واقعی: تطبیق پسوندی `gov.uk` هر زیردامنه‌ای را رسمی
 * می‌کرد، از جمله شوراهای محلی — و دستور جلسه‌ی یک کمیته‌ی نظارتی شهرداری
 * (`www.london.gov.uk`) به صدر فهرست منابع یک مقاله‌ی ویزا رفت. زیردامنه‌ی
 * gov.uk بودن یعنی «نهاد عمومی بریتانیا»، نه «مرجع این موضوع».
 */
function isCentralGovUk(host: string): boolean {
  return host === "gov.uk" || host === "www.gov.uk";
}

/**
 * امتیاز اضافه‌ی منبع رسمی.
 *
 * عمداً «اضافه» است و نه «اول فهرست»: امتیاز مرتبط‌بودنِ Tavily در نتایج
 * واقعی بین ۰٫۸۰ تا ۰٫۸۹ می‌چرخد، پس ۰٫۱۵ کافی است که یک صفحه‌ی رسمیِ
 * مرتبط از یک صفحه‌ی تجاریِ مرتبط جلو بزند — ولی کافی نیست که یک صفحه‌ی
 * رسمیِ بی‌ربط را بالا بکشد. مرتب‌سازیِ «همه‌ی رسمی‌ها اول»، دقیقاً همان
 * چیزی بود که دستور جلسه‌ی شهرداری را به صدر برد.
 */
const OFFICIAL_BONUS = 0.15;

/**
 * کف مرتبط‌بودن. نتیجه‌ی زیر این حد اصلاً وارد فهرست نمی‌شود، حتی اگر
 * رسمی باشد. اگر Tavily امتیاز نداد، خنثی فرض می‌کنیم تا نبودِ یک فیلد
 * اختیاری باعث خالی‌شدن فهرست نشود.
 */
const MIN_RELEVANCE = 0.5;

/** سقف طول عنوان منبع */
const MAX_SOURCE_TITLE = 80;

type SearchResult = { title: string; url: string; content: string; score: number | null };

/**
 * آیا هاست زیر این دامنه است؟
 *
 * تطبیق پسوندی است تا `www.instagram.com` هم با `instagram.com` بگیرد،
 * ولی مرز نقطه را رعایت می‌کند: `notinstagram.com` نباید تطبیق بخورد.
 */
function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * پیشوندهایی که در gov.uk «ظرف» هستند، نه راهنما.
 *
 * لازم‌اند چون قاعده‌ی «اولین قطعه‌ی مسیر = راهنما» برای این‌ها فاجعه است:
 * `/guidance/a` و `/guidance/b` دو سند کاملاً جدا هستند، ولی هر دو به
 * `guidance` جمع می‌شدند و یکی‌شان بی‌دلیل حذف می‌شد.
 */
const GOV_UK_CONTAINERS = [
  "guidance",
  "government",
  "browse",
  "help",
  "world",
  "topic",
  "collections",
  "publications",
  "news",
  "statistics",
];

/** آیا این آدرس نسخه‌ی چاپی است؟ */
function isPrintUrl(url: string): boolean {
  try {
    return /\/print\/?$/.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

/**
 * کلید یکتاسازی — دو صفحه از یک راهنما باید یک کلید بگیرند.
 *
 * ⚠️ چرا URL کامل کافی نیست: راهنماهای gov.uk چندصفحه‌ای‌اند و هر فصل
 * آدرس خودش را دارد. با کلیدِ URL کامل، سه فصل از یک راهنما سه «منبع»
 * جدا حساب می‌شدند و کل فهرست را پر می‌کردند — در حالی که برای خواننده
 * یک منبع‌اند.
 *
 * جمع‌کردن فقط برای gov.uk انجام می‌شود. در سایت‌های دیگر، دو مقاله‌ی
 * متفاوت زیر یک مسیر (`/blog/a` و `/blog/b`) واقعاً دو منبع‌اند و
 * جمع‌کردنشان یکی را بی‌دلیل می‌انداخت.
 */
function canonicalKey(url: string): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }

  /**
   * ⚠️ `www.` باید حذف شود، وگرنه کل یکتاسازی بی‌صدا از کار می‌افتد.
   *
   * درس از یک اجرای واقعی: دو منبع با عنوان دقیقاً یکسان در فهرست آمدند.
   * علتش این بود که کلید، هاستِ خام را در خودش داشت، پس
   * `gov.uk/global-talent-digital-technology` و
   * `www.gov.uk/global-talent-digital-technology` دو صفحه‌ی متفاوت حساب
   * می‌شدند. isCentralGovUk هر دو شکل را می‌پذیرفت و همین توهم درستی
   * می‌ساخت — ولی کلیدِ یکتاسازی جای دیگری ساخته می‌شد.
   *
   * این فقط مشکل gov.uk نیست: هر سایتی با و بدون `www` قابل دسترسی است.
   */
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const segments = u.pathname.split("/").filter(Boolean);

  if (isCentralGovUk(host) && segments.length > 1) {
    const depth = GOV_UK_CONTAINERS.includes(segments[0]) ? 2 : 1;
    return `${host}/${segments.slice(0, depth).join("/")}`;
  }

  return `${host}/${segments.join("/")}`;
}

/**
 * جستجوی وب با Tavily.
 *
 * ⚠️ درس واقعی: نسخه‌ی اول این تابع `if (!res.ok) return []` بود و هیچ
 * لاگی نداشت. کلید در .env.local یک حرف اضافه داشت (`ttvly-` به‌جای
 * `tvly-`)، Tavily با ۴۰۱ جواب می‌داد، و پایپ‌لاین بی‌هیچ نشانه‌ای
 * می‌گفت «جستجو بدون نتیجه». یعنی تفاوتِ «کلید خراب است» و «چیزی پیدا
 * نشد» به بیرون درز نمی‌کرد — بدترین نوع شکست، چون شبیه کارکرد عادی است.
 *
 * حالا شکست بی‌صدا نیست: وضعیت HTTP و پیام خودِ Tavily لاگ می‌شوند.
 * همچنان `[]` برمی‌گردانیم (نه throw) چون طبق طراحی این فایل، جستجوی وب
 * اختیاری است و نبودش نباید اجرا را بکُشد.
 */
async function tavilySearch(
  query: string,
  /**
   * محدودکردن جستجو به این هاست‌ها.
   *
   * ⚠️ باید هاست کامل باشد («www.gov.uk»)، نه دامنه‌ی کوتاه («gov.uk») —
   * Tavily هاست را دقیق تطبیق می‌دهد و با «gov.uk» فیلتر بی‌صدا بی‌اثر
   * می‌شود و نتایج غیررسمی برمی‌گردند. با آزمایش مستقیم API تأیید شد.
   *
   * قرینه‌اش، `exclude_domains`، عمداً استفاده نمی‌شود: در آزمایش، حذف
   * یوتیوب نتایج را بدتر کرد (اینستاگرام و فیس‌بوک جایش آمدند). فیلترِ
   * حذف را سمت خودمان انجام می‌دهیم که قطعی است.
   */
  includeHosts?: string[]
): Promise<SearchResult[]> {
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        max_results: 3,
        search_depth: "basic",
        ...(includeHosts?.length ? { include_domains: includeHosts } : {}),
      }),
    });

    if (!res.ok) {
      // پیام خطای واقعی Tavily را می‌خوانیم؛ «۴۰۱» به‌تنهایی نمی‌گوید چرا
      const detail = await res.text().catch(() => "");
      console.error(
        `[tavily] ${res.status} ${res.statusText} برای کوئری «${query}» — ${detail.slice(0, 300)}`
      );
      return [];
    }

    const data = await res.json();
    const results: SearchResult[] = (data.results ?? []).map((r: any) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      content: String(r.content ?? "").slice(0, 800),
      // امتیاز مرتبط‌بودن Tavily — مبنای رتبه‌بندی فهرست منابع
      score: typeof r.score === "number" ? r.score : null,
    }));

    const scope = includeHosts?.length ? ` [محدود به ${includeHosts.join("، ")}]` : "";
    console.log(`[tavily] «${query}»${scope} → ${results.length} نتیجه`);
    return results;
  } catch (err) {
    // خطای شبکه یا JSON خراب — قبلاً کل گام پژوهشگر را می‌کُشت
    console.error(
      `[tavily] فراخوانی برای کوئری «${query}» شکست خورد: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return [];
  }
}

/**
 * تمیزکردن عنوان منبع.
 *
 * عنوان‌های Tavily اغلب از خودِ صفحه می‌آیند و دنباله‌ی بریده دارند
 * («… | Criteria & Success ...»، «Committee, 31 ...»). آن دنباله نه
 * اطلاعاتی اضافه می‌کند نه در فهرست خوب دیده می‌شود.
 */
/** جداکننده‌هایی که ته عنوان بی‌معنی‌اند */
const TRAILING_SEPARATORS = "[\\s,;:|·(–—-]";

function cleanTitle(raw: string): string {
  const t = raw
    // خط جدید و فاصله‌ی چندتایی — عنوان باید یک خط بماند
    .replace(/\s+/g, " ")
    .trim()
    // دنباله‌ی بریده‌ی خودِ منبع: «...» یا «…» با هر جداکننده‌ای قبلش
    .replace(new RegExp(`${TRAILING_SEPARATORS}*(?:\\.{3}|…)\\s*$`, "u"), "")
    // جداکننده‌ی سرگردانِ ته عنوان، بعد از حذف دنباله
    .replace(new RegExp(`\\s*${TRAILING_SEPARATORS}\\s*$`, "u"), "")
    .trim();

  /**
   * ⚠️ ترتیب اینجا مهم است و یک بار اشتباه بود.
   *
   * clampText وقتی می‌بُرد، خودش «…» می‌چسباند — و اگر برشْ درست بعد از یک
   * جداکننده‌ی وسط عنوان بیفتد، همان دنباله‌ی زشتی را می‌سازد که بالاتر
   * پاکش کردیم: «… (Global Talent visa) :…». یعنی منشأ «…» اصلاً منبع
   * نبود، خودمان بودیم. پس بعد از بریدن، جداکننده‌ی چسبیده به «…» را هم
   * برمی‌داریم.
   */
  return clampText(t, MAX_SOURCE_TITLE).replace(
    new RegExp(`${TRAILING_SEPARATORS}+(?=…$)`, "u"),
    ""
  );
}

/**
 * از نتایج خام جستجو، فهرست منابع مقاله را می‌سازد.
 *
 * چهار کار، به همین ترتیب:
 * ۱. حذف — شبکه‌های اجتماعی، انجمن‌ها، دامنه‌های مسدودشده‌ی برند، و هر
 *    نتیجه‌ای که امتیاز مرتبط‌بودنش زیر کف است.
 * ۲. یکتاسازی — کوئری‌های مختلف اغلب به یک صفحه می‌رسند.
 * ۳. رتبه‌بندی — امتیاز مرتبط‌بودن به‌علاوه‌ی پاداش رسمی‌بودن. رسمی‌بودن
 *    وزن است، نه جواز عبور از صف؛ صفحه‌ی رسمیِ بی‌ربط بالا نمی‌آید.
 * ۴. بریدن — **بعد از** رتبه‌بندی، وگرنه سقف ممکن بود بهترین را بیندازد بیرون.
 *
 * اگر چیزی نماند، آرایه‌ی خالی برمی‌گردد و مقاله اصلاً بخش منابع نمی‌گیرد —
 * فهرست بی‌کیفیت بدتر از نبودِ فهرست است.
 */
function selectSources(results: SearchResult[]): Source[] {
  const blocked = [...SOCIAL_AND_FORUM_DOMAINS, ...BLOCKED_SOURCE_DOMAINS];
  // کلیدِ راهنما → بهترین نسخه‌ی دیده‌شده از همان راهنما
  const best = new Map<string, { source: Source; rank: number; official: boolean }>();
  let lowRelevance = 0;
  let printPages = 0;

  for (const r of results) {
    if (!r.url || !r.title) continue;

    const host = hostOf(r.url);
    if (!host) continue;
    if (blocked.some((d) => hostMatches(host, d))) continue;

    // نسخه‌ی چاپی قبل از یکتاسازی حذف می‌شود، نه بعدش: وگرنه ممکن بود
    // همان نسخه به‌عنوان نماینده‌ی راهنما انتخاب شود و خواننده را به
    // صفحه‌ی چاپ بفرستد.
    if (isPrintUrl(r.url)) {
      printPages++;
      continue;
    }

    // نبودِ امتیاز نباید نتیجه را حذف کند؛ خنثی حسابش می‌کنیم
    const score = r.score ?? MIN_RELEVANCE;
    if (score < MIN_RELEVANCE) {
      lowRelevance++;
      continue;
    }

    const official = isCentralGovUk(host) || OFFICIAL_DOMAINS.some((d) => hostMatches(host, d));
    const entry = {
      source: { title: cleanTitle(r.title), url: r.url },
      rank: score + (official ? OFFICIAL_BONUS : 0),
      official,
    };

    // از هر راهنما مرتبط‌ترین صفحه می‌ماند، نه اولین صفحه‌ای که رسیده
    const key = canonicalKey(r.url);
    const existing = best.get(key);
    if (!existing || entry.rank > existing.rank) best.set(key, entry);
  }

  const kept = [...best.values()];
  const dropped = results.length - kept.length;
  if (dropped > 0) {
    console.log(
      `[researcher] ${dropped} نتیجه کنار رفت (${lowRelevance} بی‌ربط، ${printPages} نسخه‌ی چاپی، بقیه فیلتر یا هم‌راهنما)`
    );
  }

  const ranked = kept.sort((a, b) => b.rank - a.rank).slice(0, MAX_SOURCES);

  /**
   * لاگ تشخیصی — عمداً چندخطی و با آدرس کامل.
   *
   * نسخه‌ی قبلی فقط hostname چاپ می‌کرد و همین یک بار تشخیص یک باگ واقعی
   * را کور کرد: دو صفحه از یک راهنما جدا حساب می‌شدند و در لاگ هر دو
   * «www.gov.uk» بودند، پس از ترمینال هیچ تفاوتی پیدا نبود.
   *
   * «کلید» همان چیزی است که یکتاسازی بر اساسش تصمیم می‌گیرد. اگر دو منبع
   * کلید یکسان داشتند یعنی باگ (باید جمع می‌شدند)، و اگر دو صفحه از یک
   * راهنما کلید متفاوت گرفتند یعنی canonicalKey جایی را نگرفته.
   */
  const lines = ranked.map(
    (k, i) =>
      `  ${i + 1}. ${k.rank.toFixed(2)} ${k.official ? "★" : " "} ${k.source.url}\n` +
      `       کلید: ${canonicalKey(k.source.url)}`
  );
  console.log(`[researcher] ${ranked.length} منبع نهایی:\n${lines.join("\n")}`);

  return ranked.map((k) => k.source);
}

export async function runResearcher(input: { brief: Brief }): Promise<Research> {
  const lessons = await lessonsBlockFor("researcher");
  const { brief } = input;

  const system = `تو «پژوهشگر» تیم محتوای ${COMPANY_NAME} هستی. ماده‌ی خام دقیق و قابل‌استناد برای نویسنده آماده می‌کنی. اغراق نمی‌کنی و آمار بی‌منبع نمی‌سازی.

${COMPANY_PROFILE}${lessons}`;

  // مرحله‌ی اختیاری: جستجوی واقعی وب
  let webContext = "";
  // بیرون از بلوک شرط زندگی می‌کند، چون بعد از تولید خروجی مدل هم لازمش داریم
  let sources: Source[] = [];
  if (process.env.TAVILY_API_KEY) {
    const { queries } = await runAgentJSON({
      agent: "researcher",
      system,
      prompt: `برای مقاله‌ای با این مشخصات، ۲ تا ۴ کوئری جستجوی وب طراحی کن (فارسی یا انگلیسی، هرکدام مؤثرتر است):
عنوان: ${brief.title}
کلمه‌ی کلیدی اصلی: ${brief.primaryKeyword}
مخاطب: ${brief.audience}`,
      schema: QueriesSchema,
      shapeHint: `{ "queries": ["کوئری اول", "کوئری دوم"] }`,
    });

    // کوئری‌ها را قبل از ارسال لاگ می‌کنیم: وقتی جستجو نتیجه نمی‌دهد،
    // اولین سؤال این است که مدل اصلاً دنبال چه گشته.
    console.log(`[researcher] ${queries.length} کوئری: ${queries.map((q) => `«${q}»`).join("، ")}`);

    /**
     * یک جستجوی اضافه که به gov.uk قفل شده.
     *
     * بدون این، جستجوی آزاد تقریباً همیشه سایت‌های وکالتی و مشاوره‌ای را
     * بالاتر از خودِ سند رسمی برمی‌گرداند — چون آن‌ها برای سئو بهینه شده‌اند
     * و gov.uk نیست. یک فراخوانی اضافه، قیمت کمی است برای اینکه مقاله
     * دست‌کم یک لینک به مرجع اصلی داشته باشد.
     */
    const allResults = (
      await Promise.all([
        ...queries.map((q) => tavilySearch(q)),
        tavilySearch(queries[0], [OFFICIAL_QUERY_HOST]),
      ])
    ).flat();
    if (allResults.length > 0) {
      webContext =
        `\n\nنتایج جستجوی وب (فقط به‌عنوان ماده‌ی خام؛ صحت‌سنجی با توست):\n` +
        allResults
          .map((r) => `- ${r.title} (${r.url})\n  ${r.content}`)
          .join("\n");

      sources = selectSources(allResults);
    }
  }

  const prompt = `بریف مقاله:
عنوان: ${brief.title}
مخاطب: ${brief.audience}
نیت جستجو: ${brief.searchIntent}
ساختار: ${brief.outline.map((s) => s.heading).join(" / ")}${webContext}

بر این اساس، ماده‌ی خام پژوهشی مقاله را آماده کن:
- keyFacts: نکته‌ها و فکت‌های کلیدی که مقاله باید بگوید (اگر آماری مطمئن نیستی، به‌جای عدد دقیق، روند یا اصل را بگو).
- examples: مثال‌های ملموس از فضای کسب‌وکار ایران که نویسنده بتواند استفاده کند.
- commonQuestions: سؤال‌هایی که مخاطب واقعاً درباره‌ی این موضوع دارد (برای بخش FAQ).
- angleNotes: توصیه‌ات به نویسنده برای متمایزکردن مقاله.`;

  const out = await runAgentJSON({
    agent: "researcher",
    system,
    prompt,
    schema: ResearchSchema,
    shapeHint: `{
  "keyFacts": ["فکت یا نکته کلیدی"],
  "examples": ["مثال ملموس"],
  "commonQuestions": ["سؤال رایج مخاطب"],
  "angleNotes": "توصیه‌ها به نویسنده"
}`,
  });

  // منابع از کد می‌آیند، نه از مدل — بدون کلید Tavily فهرست خالی می‌ماند
  // و مقاله هم فهرست منابع نمی‌گیرد.
  return { ...out, sources };
}
