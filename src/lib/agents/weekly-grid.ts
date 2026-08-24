import type { BrandRoute } from "./brand-cta";
import { AUDIENCE_GROUPS } from "./types";

/**
 * شبکه‌ی هفتگی — پیکربندی برند، نه خروجی مدل.
 *
 * ⚠️ تصمیم مرکزی برنامه‌ریز: این چهار فیلد هرگز از مدل پرسیده نمی‌شوند.
 *
 * دلیلش نسبت محتواست. برندگاید ۷۰٪ آموزش، ۲۰٪ اثبات و ۱۰٪ فروش مستقیم
 * را الزام کرده. اگر contentType را مدل انتخاب کند، هر هفته چیز دیگری
 * می‌دهد و این نسبت هرگز تضمین نمی‌شود. با شبکه، نسبت ساختاری است —
 * قابل نقض نیست چون اصلاً پرسیده نمی‌شود.
 *
 * همان استدلال route و language: تصمیم اجرا، نه قضاوت مدل.
 *
 * روز صفر شنبه است، مطابق src/lib/week.ts.
 * انگلیسی route="brand" می‌گیرد چون مخاطبش نهاد و شریک بین‌المللی است،
 * نه متقاضی یک مسیر مشخص — پس audienceGroup هم ندارد.
 */

export type ContentType = "education" | "proof" | "sales";

export type WeeklySlotConfig = {
    /** ۰ = شنبه … ۶ = جمعه */
    day: number;
    dayLabel: string;
    language: "fa" | "en";
    route: BrandRoute;
    audienceGroup: (typeof AUDIENCE_GROUPS)[number] | null;
    contentType: ContentType;
};

export const WEEKLY_GRID: readonly WeeklySlotConfig[] = [
    { day: 0, dayLabel: "شنبه", language: "fa", route: "global-talent", audienceGroup: "digital-tech", contentType: "education" },
    { day: 1, dayLabel: "یکشنبه", language: "fa", route: "global-talent", audienceGroup: "academic-research", contentType: "education" },
    { day: 2, dayLabel: "دوشنبه", language: "en", route: "brand", audienceGroup: null, contentType: "education" },
    { day: 3, dayLabel: "سه‌شنبه", language: "fa", route: "innovator-founder", audienceGroup: "entrepreneurship", contentType: "proof" },
    { day: 4, dayLabel: "چهارشنبه", language: "fa", route: "global-talent", audienceGroup: "engineering-medical", contentType: "education" },
    { day: 5, dayLabel: "پنجشنبه", language: "en", route: "brand", audienceGroup: null, contentType: "education" },
    { day: 6, dayLabel: "جمعه", language: "fa", route: "global-talent", audienceGroup: "arts-culture", contentType: "sales" },
] as const;

/** توضیح نوع محتوا برای تزریق به پرامپت برنامه‌ریز */
export const CONTENT_TYPE_BRIEFING: Record<ContentType, string> = {
    education:
        "آموزشی — چیزی یاد بده که مخاطب بعدش بتواند کاری بکند. این محتوا نباید بفروشد.",
    proof:
        "اثبات — نشان بده مسیر واقعی است و چطور کار می‌کند. مثال ملموس، بدون آمار ساختگی.",
    sales:
        "فروش مستقیم — دعوت روشن به قدم بعدی. تنها جای هفته که اجازه‌ی فروش دارد.",
};
/* ── خانواده‌ی صحنه‌ی کاور ─────────────────────────────────── */

/**
 * تنوع بصری کاورهای یک هفته — پیکربندی قطعی، نه خروجی مدل.
 *
 * ── چرا اینجا و نه در برنامه‌ریز ──
 *
 * همان استدلال `contentType` چند خط بالاتر. تمایز یک ویژگی در سطح
 * **مجموعه** است و هفت اجرای موازی همدیگر را نمی‌بینند — همان کوریِ
 * ضدتکرار که در weekly-planner.ts توضیح داده شده. اگر صحنه را هر اجرا
 * خودش انتخاب کند، هیچ‌چیز جلوی هفت کاور شبیه‌به‌هم را نمی‌گیرد.
 *
 * دلیل قاطع‌تر: برنامه‌ریز موقع تصمیم هنوز متن کاروسل را ندیده. اگر
 * صحنه‌ی کامل را از او بخواهیم دارد حدس می‌زند. «خانواده» دقیقاً همان
 * مقدار اطلاعاتی است که در آن لحظه پشتوانه دارد؛ صحنه‌ی مشخص را
 * کپی‌رایتر انتخاب می‌کند که محتوای واقعی را می‌بیند.
 *
 * ── چرخش و هم‌خوانی با مخاطب، هر دو با هم ──
 *
 * ⚠️ این دو در نگاه اول متناقض‌اند: مخاطبِ هر روز در WEEKLY_GRID ثابت
 * است، پس اگر یک فهرست واحد را روی روزها بچرخانیم، «کارگاه هنری» یک
 * هفته به arts-culture می‌رسد و هفته‌ی بعد به academic-research.
 *
 * تناقض واقعی نیست — محورِ چرخش غلط بود. چرخش **داخل استخر خودِ همان
 * مخاطب** انجام می‌شود، نه بین روزها. یکشنبه همیشه academic-research
 * است و همیشه صحنه‌ی آکادمیک می‌گیرد؛ فقط هر هفته یکی دیگر از استخر
 * خودش. پس هیچ‌کدام از دو قید فدای دیگری نمی‌شود.
 *
 * ── چرا استخر برند چهارتایی است ──
 *
 * دوشنبه و پنجشنبه هر دو `audienceGroup: null` دارند و از یک استخر
 * می‌خورند. با آفستِ `(weekIndex + day)` هرگز به یک خانه نمی‌افتند، ولی
 * استخر سه‌تایی فاصله‌ی کافی نمی‌داد. چهارتا شد.
 */

/**
 * محور فاصله‌ی بصری.
 *
 * ⚠️ این تگ **تزئینی نیست** — `assertSceneVariety` رویش قفل است.
 * دو خانواده که هر دو `surface` باشند («میز و کاغذ») تنوعی نمی‌سازند،
 * حتی اگر شیء رویشان فرق کند.
 */
export type VisualGroup =
  /** سطحِ کار: میز، کاغذ، ابزار روی سطح */
  | "surface"
  /** فضای داخلیِ خالی: اتاق، صندلی، دیوار */
  | "interior"
  /** بنا و نمای بیرونیِ ساخته‌شده */
  | "architecture"
  /** آستانه: در، پله، راهرو — گذر، نه مقصد */
  | "threshold"
  /** نور، آسمان، مه، بافت طبیعی */
  | "nature"
  /** تک‌شیء در نمای نزدیک */
  | "object";

export type SceneFamily = {
  group: VisualGroup;
  /** توصیف یک‌خطی که مستقیم به پرامپت کپی‌رایتر می‌رود */
  hint: string;
};

/** کلید استخر: گروه مخاطب، یا «brand» برای روزهای بی‌مخاطبِ انگلیسی */
type PoolKey = NonNullable<WeeklySlotConfig["audienceGroup"]> | "brand";

const SCENE_POOLS: Record<PoolKey, readonly SceneFamily[]> = {
  "digital-tech": [
    { group: "object", hint: "کابل‌های مرتب‌شده‌ی یک رک در نمای نزدیک، بدون هیچ نمایشگر" },
    { group: "threshold", hint: "در نیمه‌باز یک اتاق تجهیزات، نور سرد از راهروی پشت" },
    { group: "nature", hint: "پنجره‌ی بزرگ رو به شهر در سپیده‌دم، اتاق پشت آن خالی" },
  ],
  "academic-research": [
    { group: "surface", hint: "دفترچه‌ی آزمایشگاه با نمودار دست‌نویس، کنار یک میکروسکوپ قدیمی" },
    { group: "architecture", hint: "نمای بیرونی یک ساختمان دانشگاهی آجری در نور بعدازظهر" },
    { group: "object", hint: "ردیف جلدهای کهنه‌ی کتاب در قفسه، نمای نزدیک با بافت پارچه" },
  ],
  "arts-culture": [
    { group: "interior", hint: "بوم نیمه‌کار روی سه‌پایه در کارگاه خالی، نور از پنجره‌ی سقفی" },
    { group: "object", hint: "قلم‌موهای شسته‌شده روی پارچه‌ی کتان، نمای نزدیک" },
    { group: "architecture", hint: "نمای بیرونی یک سالن نمایش قدیمی در نور کم" },
  ],
  "engineering-medical": [
    { group: "object", hint: "ابزار دقیق فلزی روی پارچه‌ی تمیز، نمای نزدیک" },
    { group: "threshold", hint: "راهروی خلوت یک مرکز درمانی با نور غیرمستقیم" },
    { group: "architecture", hint: "کلاه ایمنی روی نرده‌ی فلزی، پشت‌بام ساختمانی نیمه‌کاره در نور صبح" },
  ],
  entrepreneurship: [
    { group: "nature", hint: "آسمان صبح از میان دو ساختمان، نمای رو به بالا" },
    { group: "interior", hint: "وایت‌برد پاک‌شده با ردهای محو ماژیک، اتاق جلسه‌ی خالی" },
    { group: "object", hint: "یک صندلی تکی چوبی کنار دیوار ساده، نمای نزدیک" },
  ],
  brand: [
    { group: "threshold", hint: "پله‌های سنگی یک ساختمان قدیمی، بدون هیچ نشانه‌ی مکان" },
    { group: "interior", hint: "سالن انتظار خلوت با صندلی‌های چرمی و نور غیرمستقیم" },
    { group: "nature", hint: "مه صبحگاهی روی یک محوطه‌ی باز، بدون بنا" },
    { group: "architecture", hint: "نمای سنگی یک ساختمان اداری قدیمی در نور ملایم" },
  ],
};

/**
 * ⚠️ ترتیبِ داخل هر استخر **تصادفی نیست و دست‌چین هم نیست** — با جستجوی
 * کامل روی ۳۳۳٬۰۰۲ ترکیب پیدا شد، چون قید دست‌سازی برآورده نمی‌شد.
 *
 * دلیلش ساختار خودِ WEEKLY_GRID است: روزهای ۰، ۳ و ۶ همگی اندیس
 * `w % 3` می‌گیرند و روزهای ۱ و ۴ اندیس `(w+1) % 3` — یعنی سه استخر و
 * بعد دو استخر **قفلِ هم** حرکت می‌کنند. اولین جدولِ دست‌ساز در همان
 * هفته‌ی صفر سه‌تا `interior` داد و `assertSceneVariety` گرفتش.
 *
 * پس اگر یک صحنه را عوض کردی، جای گروهش را حدس نزن: چک را اجرا کن.
 */
/**
 * شماره‌ی هفته از روی `week_start`.
 *
 * ⚠️ از رشته‌ی `YYYY-MM-DD` حساب می‌شود، نه از `Date.now()` — وگرنه
 * رندرِ دوباره‌ی یک هفته‌ی قدیمی صحنه‌ی دیگری می‌گرفت و کاور با آنچه
 * قبلاً منتشر شده فرق می‌کرد. همان دلیلی که week.ts منطقه‌ی زمانی را
 * صریح می‌نویسد: نتیجه نباید به «الان» وابسته باشد.
 */
export function weekIndexOf(weekStart: string): number {
  const ms = Date.parse(`${weekStart}T12:00:00Z`);
  if (Number.isNaN(ms)) throw new Error(`week_start نامعتبر: ${weekStart}`);
  return Math.floor(ms / 604_800_000);
}

/** خانواده‌ی صحنه‌ی یک اسلات در یک هفته‌ی مشخص */
export function sceneFamilyFor(slot: WeeklySlotConfig, weekStart: string): SceneFamily {
  const pool = SCENE_POOLS[slot.audienceGroup ?? "brand"];
  // آفست شامل `day` است تا دو روزِ هم‌استخر (دوشنبه و پنجشنبه) هرگز
  // در یک هفته به یک خانواده نیفتند.
  return pool[(weekIndexOf(weekStart) + slot.day) % pool.length];
}

/**
 * حداکثر تکرار یک گروه بصری در یک هفته.
 *
 * ⚠️ چرا ۲ و نه ۱: **اصل لانه‌کبوتری**. هفت روز داریم و پنج گروه بصری،
 * پس «همه متمایز» ریاضی‌اش ممکن نیست. سخت‌گیرترین قید ممکن همین است.
 */
const MAX_PER_GROUP = 2;

/**
 * `surface` سقف جداگانه دارد: **حداکثر یک بار**.
 *
 * این همان جاذبی است که کل مسئله از آن شروع شد — «لپ‌تاپ روی میز» در
 * دو اجرای پشت‌سرهم. میز و کاغذ همیشه جواب می‌دهد و برای همین همیشه
 * انتخاب می‌شود. یک بار در هفته کافی است.
 */
const MAX_SURFACE = 1;

/**
 * قفلِ تنوع بصری — روی **جدول ثابت** اجرا می‌شود، نه روی خروجی مدل.
 *
 * ⚠️ این استثنای قاعده‌ی ۲ نیست، بیرونِ آن است. «چک قطعیِ غلط بدتر از
 * نداشتن چک است» درباره‌ی چکی است که روی متنِ تولیدشده می‌افتد و
 * بازنویسی بی‌دلیل می‌سازد. این یکی روی داده‌ی خودمان است: یا برای همه‌ی
 * هفته‌ها پاس می‌شود یا برای همه شکست می‌خورد. خطای کاذب ندارد.
 *
 * برای همین `throw` می‌کند و در بارگذاری ماژول صدا می‌زند: استخری که
 * تنوع نمی‌سازد یک باگ پیکربندی است، و باگ پیکربندی باید بلند بشکند نه
 * اینکه هفته‌ها کاور شبیه‌به‌هم تولید کند (قاعده‌ی ۶).
 *
 * دوره‌ی چرخش ک.م.م اندازه‌ی استخرهاست؛ ۲۰۰ هفته با فاصله‌ی زیاد پوشش
 * می‌دهد و اگر کسی اندازه‌ی استخری را عوض کرد باز هم درست می‌ماند.
 */
export function assertSceneVariety(): void {
  for (const [key, pool] of Object.entries(SCENE_POOLS)) {
    if (pool.length < 3) throw new Error(`استخر صحنه‌ی «${key}» کمتر از ۳ خانواده دارد`);
    if (new Set(pool.map((f) => f.hint)).size !== pool.length)
      throw new Error(`استخر صحنه‌ی «${key}» خانواده‌ی تکراری دارد`);
  }

  for (let w = 0; w < 200; w++) {
    const chosen = WEEKLY_GRID.map((slot) => {
      const pool = SCENE_POOLS[slot.audienceGroup ?? "brand"];
      return pool[(w + slot.day) % pool.length];
    });

    const hints = new Set(chosen.map((f) => f.hint));
    if (hints.size !== chosen.length)
      throw new Error(`هفته‌ی ${w}: خانواده‌ی تکراری در یک هفته`);

    const counts = new Map<VisualGroup, number>();
    for (const f of chosen) counts.set(f.group, (counts.get(f.group) ?? 0) + 1);

    for (const [group, n] of counts) {
      const cap = group === "surface" ? MAX_SURFACE : MAX_PER_GROUP;
      if (n > cap)
        throw new Error(`هفته‌ی ${w}: گروه بصری «${group}» ${n} بار آمده (سقف ${cap})`);
    }
  }
}

// قفل در بارگذاری ماژول. دلیلش بالای خودِ تابع نوشته شده.
assertSceneVariety();
