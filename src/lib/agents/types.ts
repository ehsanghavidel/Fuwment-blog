import { z } from "zod";
import type { BrandRoute } from "@/lib/company";
import { LIMITS_BY_LAYOUT, LIST_JOINER, MAX_LIST_ITEMS } from "@/lib/slide-spec";
import type { ListSlide, Slide, StandardSlide } from "@/lib/store/types";

/**
 * قرارداد خروجی هر ایجنت — با Zod تعریف می‌شود.
 *
 * نکته‌ی آموزشی: در سیستم مولتی‌ایجنت، خروجی هر ایجنت «ورودی» ایجنت بعدی
 * است. اگر این قرارداد شل باشد، خطای یک ایجنت به همه‌ی زنجیره سرایت می‌کند.
 * اسکیمای صریح + اعتبارسنجی، همان کاری است که interface در کد معمولی می‌کند.
 */

/* ── ۱. ایده‌یاب ─────────────────────────────────────────── */

export const IdeaSchema = z.object({
  title: z.string().min(4),
  angle: z.string(),
  searchIntent: z.string(),
  score: z.number().min(0).max(10),
  reason: z.string(),
});

export const IdeaScoutOutputSchema = z.object({
  ideas: z.array(IdeaSchema).min(3),
});

export type Idea = z.infer<typeof IdeaSchema>;
export type IdeaScoutOutput = z.infer<typeof IdeaScoutOutputSchema>;

/* ── ۲. استراتژیست ──────────────────────────────────────── */

/**
 * مسیرهای برند، به‌شکل قابل مصرف برای Zod.
 *
 * `satisfies` اینجا کار اصلی را می‌کند: BrandRoute در company.ts زندگی
 * می‌کند و اگر مسیر چهارمی به آن union اضافه شود، همین خط خطای کامپایل
 * می‌دهد. بدون آن، فهرست اینجا بی‌صدا از برند عقب می‌ماند.
 */
export const BRAND_ROUTES = [
  "brand",
  "global-talent",
  "innovator-founder",
] as const satisfies readonly BrandRoute[];

/**
 * پنج گروه مخاطب — دقیقاً همان‌هایی که در COMPANY_PROFILE شماره‌گذاری شده‌اند.
 * اگر آن فهرست عوض شد، این هم باید عوض شود (Zod نمی‌تواند از متن بخواند).
 */
export const AUDIENCE_GROUPS = [
  "digital-tech",
  "academic-research",
  "arts-culture",
  "engineering-medical",
  "entrepreneurship",
] as const;

/**
 * هفت مرحله‌ی سفر مخاطب — بخش ۰۳ راهنمای برند (نسخه‌ی ۳.۵).
 *
 * قانون تولید محتوای برندگاید: پیش از ساخت هر محتوا باید مشخص باشد برای
 * کدام گروه و کدام مرحله است. اگر پاسخ هرکدام «همه» بود، محتوا آماده نیست.
 *
 * ⚠️ پیش از این، سه‌تایی استاندارد (awareness/consideration/decision) اینجا
 * بود با این توضیح که برندگاید فهرستی ندارد. آن توضیح غلط بود — جدول
 * هفت‌ردیفی در بخش ۰۳ هست.
 */
export const JOURNEY_STAGES = [
  "unaware",     // ۱. ناآگاه — «اصلاً همچین ویزایی هست؟» این مرحله نباید بفروشد.
  "curious",     // ۲. کنجکاو — «من هم می‌توانم؟» کمک به خودارزیابی.
  "evaluating",  // ۳. سنجش — «به کی اعتماد کنم؟» نشان‌دادن راهنما.
  "decision",    // ۴. تصمیم — «ارزش هزینه‌اش را دارد؟» روشن‌کردن مسیر و ریسک.
  "in-journey",  // ۵. همراهی — «الان کجای کارم؟» کاهش اضطراب حین مسیر.
  "success",     // ۶. موفقیت — «حالا چه؟» نام‌گذاری لحظه‌ی تحول.
  "referral",    // ۷. معرفی — «به کی بگویم؟» آسان‌کردن معرفی.
] as const;

export const BriefSchema = z.object({
  title: z.string(),
  audience: z.string(),
  /** کدام مسیر برند — تعیین‌کننده‌ی CTAهای مجاز */
  route: z.enum(BRAND_ROUTES),
  /** کدام‌یک از پنج گروه مخاطب */
  audienceGroup: z.enum(AUDIENCE_GROUPS),
  /** کدام مرحله از سفر مخاطب */
  journeyStage: z.enum(JOURNEY_STAGES),
  searchIntent: z.string(),
  primaryKeyword: z.string(),
  secondaryKeywords: z.array(z.string()).min(2).max(8),
  outline: z
    .array(
      z.object({
        heading: z.string(),
        points: z.array(z.string()),
      })
    )
    .min(3),
  targetWordCount: z.number().min(600).max(3000),
  /** متن دعوت به اقدام، همان‌طور که در پایان مقاله می‌آید */
  cta: z.string(),
  /**
   * شناسه‌ی CTA انتخاب‌شده از BRAND_CTAS — همان قراردادی که ریلز دارد.
   *
   * جدا از `cta` است چون آن یکی متن آزاد است و قابل بررسی نیست؛ این یکی
   * با allowedCtaIds(route) چک قطعی می‌شود و جلوی ساختن CTAی خودسر را
   * می‌گیرد. سقف طول اینجا معنی ندارد، پس فقط min برای رد خروجی ناقص.
   */
  ctaId: z.string().min(2),
});

export type Brief = z.infer<typeof BriefSchema>;

/* ── ۳. پژوهشگر ─────────────────────────────────────────── */

export const ResearchSchema = z.object({
  keyFacts: z.array(z.string()).min(3),
  examples: z.array(z.string()),
  commonQuestions: z.array(z.string()).min(2),
  angleNotes: z.string(),
});

/** یک منبع وب — عنوان و آدرس، همان‌طور که جستجو برگردانده */
export type Source = { title: string; url: string };

/**
 * خروجی پژوهشگر = آنچه مدل تولید می‌کند + منابعی که کد جمع کرده.
 *
 * ⚠️ `sources` عمداً در ResearchSchema نیست. URLها واقعیت‌اند و از پاسخ
 * Tavily می‌آیند؛ اگر از مدل بخواهیم بازتابشان دهد، تنها کاری که اضافه
 * کرده‌ایم باز کردن در به روی URL جعلی است. مدل هیچ‌وقت منبع نمی‌سازد —
 * کد ضمیمه‌شان می‌کند. همان اصلِ «کار قطعی را به مدل نسپار».
 */
export type Research = z.infer<typeof ResearchSchema> & { sources: Source[] };

/* ── ۵. ویراستار ────────────────────────────────────────── */

export const ReviewSchema = z.object({
  /** امتیاز کل ۰ تا ۱۰۰ */
  score: z.number().min(0).max(100),
  /** امتیاز هر معیار روبریک، ۰ تا ۱۰ */
  rubric: z.object({
    clarity: z.number().min(0).max(10),
    brandVoice: z.number().min(0).max(10),
    usefulness: z.number().min(0).max(10),
    structure: z.number().min(0).max(10),
    persian: z.number().min(0).max(10),
  }),
  /** فهرست مشکلات مشخص که نویسنده باید اصلاح کند */
  issues: z.array(z.string()),
  verdict: z.enum(["approve", "revise"]),
});

export type Review = z.infer<typeof ReviewSchema>;

/* ── ۶. متخصص سئو ───────────────────────────────────────── */

/**
 * کوتاه‌کردن قطعی متن تا سقف کاراکتر — ترجیحاً روی مرز کلمه.
 *
 * نکته‌ی آموزشی: طول رشته یک محدودیتِ کاملاً قطعی است و LLM‌ها (به‌ویژه در
 * فارسی) نمی‌توانند کاراکتر بشمارند. پس به‌جای `.max()` که خروجیِ چند کاراکتر
 * بلندتر را با استثنا رد می‌کند و کل اجرا را می‌کُشد، همین‌جا در کد مهارش
 * می‌کنیم. همان اصلِ «کار قطعی را به مدل نسپار» که در seo-checks هم دیدیم.
 */
export function clampText(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  // یک کاراکتر برای «…» کنار می‌گذاریم و تا آخرین فاصله عقب می‌رویم تا وسط کلمه نبُریم
  const slice = t.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  const base = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  return base.trimEnd() + "…";
}

export const SeoOutputSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "اسلاگ باید حروف کوچک انگلیسی و خط تیره باشد"),
  // سقف طول با clampText مهار می‌شود، نه با رد کردن؛ min برای رد خروجیِ ناقص می‌ماند
  // (نوشتنِ «بلندتر» کاری است که مدل قابل‌اعتماد انجام می‌دهد، برخلاف شمارش کاراکتر).
  metaTitle: z.string().min(10).transform((s) => clampText(s, 65)),
  metaDescription: z.string().min(50).transform((s) => clampText(s, 160)),
  excerpt: z.string().min(30),
  keywords: z.array(z.string()).min(3).max(10),
  faq: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .min(2)
    .max(6),
});

export type SeoOutput = z.infer<typeof SeoOutputSchema>;

/* ── ۸. منتقد (خودبهبودی) ───────────────────────────────── */

/**
 * ایجنت‌هایی که می‌توانند «درس» بگیرند.
 *
 * قاعده: فقط ایجنت‌هایی که پرامپت دارند. ناشر و منتقد اینجا نیستند چون
 * کدِ قطعی‌اند یا خودشان درس‌ساز‌ند — درس دادن به آن‌ها بی‌معنی است.
 *
 * ⚠️ اگر ایجنت جدیدی ساختی و اینجا اضافه‌اش نکردی، منتقد برایش هیچ درسی
 * تولید نمی‌کند و هیچ خطایی هم نمی‌بینی: z.enum خروجی را رد می‌کند، یک
 * retry می‌خورد، شکست می‌خورد، و try/catch گام منتقد آن را قورت می‌دهد.
 */
export const AGENT_IDS = [
  "idea-scout",
  "strategist",
  "researcher",
  "writer",
  "editor",
  "seo",
  // فاز ۴ — محتوای شبکه‌های اجتماعی
  "repurposer",
  "social-idea-scout",
  "instagram-strategist",
  "linkedin-angle-finder",
  "instagram-writer",
  "linkedin-writer",
  "reels-writer",
  "social-editor",
  // فاز ۴، استوری
  "story-angle-finder",
  "story-writer",
  // فاز ۵ — کمپین چندکاناله
  "campaign-strategist",
  // فاز ۷ — برنامه‌ریزی هفتگی
  "weekly-planner",
] as const;

export const CriticOutputSchema = z.object({
  overallScore: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  /** درس‌هایی که باید در اجراهای بعدی رعایت شوند — حداکثر ۳ تا، هرکدام برای یک ایجنت */
  lessons: z
    .array(
      z.object({
        agent: z.enum(AGENT_IDS),
        lesson: z.string().min(10),
      })
    )
    .max(3),
});

/* ── فاز ۴: محتوای شبکه‌های اجتماعی ──────────────────────── */

/**
 * ایده‌ی محتوای اجتماعی — خروجی «ایده‌یاب اجتماعی».
 *
 * چرا اسکیمای جدا و نه استفاده از IdeaSchema با یک پارامتر کانال؟
 * چون IdeaSchema فیلد `searchIntent` دارد و هر سه معیار امتیازدهی ایده‌یاب
 * بلاگ حول «آیا این را در گوگل جستجو می‌کنند؟» می‌چرخد. برای فید
 * اینستاگرام این سؤال بی‌معنی است؛ سؤال درست «آیا اسکرول را متوقف
 * می‌کند؟» است. یک flag روی ایده‌یاب یعنی یک فیلد بی‌معنا در اسکیما
 * به‌علاوه‌ی پرامپت شاخه‌دار — دو ایجنت کوتاه و صریح بهتر است.
 */
export const SocialIdeaSchema = z.object({
  title: z.string().min(4),
  /** قلاب پیشنهادی — همان جمله‌ای که اسکرول را متوقف می‌کند */
  hook: z.string().min(10),
  /** دردی از مخاطب که این ایده به آن می‌پردازد */
  painPoint: z.string(),
  score: z.number().min(0).max(10),
  reason: z.string(),
});

export const SocialIdeaScoutOutputSchema = z.object({
  ideas: z.array(SocialIdeaSchema).min(3),
});

export type SocialIdea = z.infer<typeof SocialIdeaSchema>;

/* ── بریف و خروجی‌های اجتماعی ────────────────────────────── */

/**
 * بریف اجتماعی — خروجی «بازآفرین».
 *
 * چرا یک بریف مشترک برای هر دو پلتفرم؟ چون پیام باید یکی باشد و فقط
 * لباسش عوض شود. اگر هر کپی‌رایتر مستقیم از روی مقاله می‌نوشت، دو محتوای
 * بی‌ربط درمی‌آمد. همان نقشی که BriefSchema در پایپ‌لاین بلاگ دارد.
 */
export const SocialBriefSchema = z.object({
  /** تنها ایده‌ای که ارزش انتقال به فید را دارد */
  coreMessage: z.string().min(20),
  audience: z.string(),
  /** هر نکته یک «ادعا»ی مستقل، نه یک تیتر */
  keyPoints: z.array(z.string()).min(3).max(6),
  /** زاویه‌ی قلاب — درد مخاطب، نه موضوع مقاله */
  hookAngle: z.string().min(10),
  /** شاهد/مثال، فقط از دل مقاله‌ی مبدأ */
  proofPoint: z.string(),
  cta: z.string(),

  /* ── فیلدهای برنامه‌ریزی (فاز ۲) ─────────────────────────
   *
   * ⚠️ هر چهارتا عمداً اختیاری‌اند. `SocialBriefSchema` چهار تولیدکننده
   * دارد و سه‌تایشان (repurposer، instagram-strategist،
   * linkedin-angle-finder) خروجی مدل‌اند. فیلد اجباری بدون هماهنگ‌کردن
   * پرامپتشان یعنی runAgentJSON دو بار تلاش می‌کند و بعد throw — تا شش
   * فراخوانی سوخته و یک اجرای مرده.
   *
   * اجبار جای دیگری اعمال می‌شود: چک قطعی، فقط در مسیر اینستاگرام.
   * همان الگوی runBriefChecks که در بلاگ داریم.
   */

  /** تصمیم اجراست، نه قضاوت مدل — به‌صورت قطعی چسبانده می‌شود */
  route: z.enum(BRAND_ROUTES).optional(),

  /** پیش‌فرض دارد، پس بعد از parse همیشه موجود است */
  language: z.enum(["fa", "en"]).default("fa"),

  /** کدام‌یک از پنج گروه مخاطب — قضاوت مدل */
  audienceGroup: z.enum(AUDIENCE_GROUPS).optional(),

  /** کدام مرحله از هفت مرحله‌ی سفر — قضاوت مدل */
  journeyStage: z.enum(JOURNEY_STAGES).optional(),
});

export type SocialBrief = z.infer<typeof SocialBriefSchema>;

/**
 * سقف طول هر بخش اسلاید، به‌تفکیکِ چیدمان.
 *
 * ⚠️ تعریفش به `@/lib/slide-spec` منتقل شد، چون رندرکننده هم لازمش
 * دارد و آن فایل سمت ایجنت‌ها نیست. اینجا فقط re-export می‌شود تا
 * importهای موجود (پرامپت کپی‌رایتر، چک قطعی، ناشر) نشکنند.
 */
export { SLIDE_LIMITS, LIMITS_BY_LAYOUT, LIST_JOINER, MAX_LIST_ITEMS } from "@/lib/slide-spec";

/**
 * فیلدهای مشترکِ هر سه چیدمان — با `SlideCommon` در `store/types.ts`
 * هم‌شکل. با **spread** پخش می‌شود، نه `.extend()`، چون
 * `z.discriminatedUnion` عضوهایش را باید `ZodObject` ببیند.
 */
const SLIDE_COMMON = {
  kicker: z.string(),
  heading: z.string().min(3),
  /**
   * صحنه‌ی فیزیکیِ پس‌زمینه — فقط برای اسلاید کاور استفاده می‌شود.
   *
   * ⚠️ روی **هر سه چیدمان** موجود است، نه فقط `standard`. کاور می‌تواند
   * `standard` یا `statement` باشد و `storage.ts` (`post.slides[0]?.imageSubject`)
   * از هر چیدمانی همین فیلد را می‌خواند — محدودکردنش به یک شاخه یعنی
   * تولیدِ تصویرِ AI برای نیمی از کاورها بی‌صدا خاموش می‌شود.
   *
   * ⚠️ `.optional()` عمدی است. اگر مدل ندهد یا چیز بی‌ربطی بدهد،
   * تصویری ساخته نمی‌شود و کاور همان پس‌زمینه‌ی سرمه‌ای را می‌گیرد.
   * کاور بدون تصویر از کاور با تصویرِ بی‌ربط بهتر است.
   *
   * روی بوم نوشته نمی‌شود، پس در `SLIDE_LIMITS` نیست.
   */
  imageSubject: z.string().optional(),
} as const;

/**
 * جاافتادنِ `layout` در خروجیِ مدل را می‌بخشد — فقط جاافتادن، نه مقدارِ
 * نامعتبر.
 *
 * ⚠️ `z.discriminatedUnion` دیسکریمیناتورِ اختیاری نمی‌پذیرد؛ نبودِ
 * `layout` یعنی ردِ کلِ اسکیما. `runAgentJSON` دو تلاش با بازخوردِ خطا
 * دارد، ولی اگر بازهم نداد، کلِ اجرا `throw` می‌خورد — در مسیرِ هفتگی
 * یعنی یکی از هفت اجرا می‌میرد برای یک فیلدِ ساختاری که مدل هنوز کامل
 * یاد نگرفته. قاعده‌ی ۲ در CLAUDE.md: چکِ قطعیِ غلط بدتر از نبودِ چک.
 *
 * اگر `layout` هست ولی نامعتبر است (مثلاً `"quote"`)، اینجا دست نمی‌زند
 * — به schema سپرده می‌شود تا رد شود. تبدیلِ خاموشِ مقدارِ نامعتبر یعنی
 * گم‌شدنِ یک باگِ واقعیِ پرامپت پشتِ یک fallback.
 */
function withDefaultLayout(raw: unknown): unknown {
  if (raw && typeof raw === "object" && !("layout" in raw)) {
    console.log("[slide-layout] مدل فیلد layout را برنگرداند — پیش‌فرض: standard");
    return { ...raw, layout: "standard" };
  }
  return raw;
}

/**
 * یک اسلاید کاروسل — `discriminatedUnion` روی `layout`.
 *
 * ⚠️ اینجا عمداً `clampText` نیست — و این از یک باگ واقعی درآمد.
 *
 * نسخه‌ی قبلی سقف‌ها را با `.transform` می‌بُرید. سه پیامد داشت:
 *
 * ۱. متنِ بریده با «…» در دیتابیس می‌نشست، نه فقط در نمایش. یعنی
 *    رندرکننده‌ی تصویر هم همان متن بریده را می‌گرفت و سه‌نقطه به خودِ
 *    کاروسل منتقل می‌شد.
 * ۲. ویراستار از تیترهای بریده شکایت می‌کرد — درست، ولی نویسنده
 *    مقصر نبود؛ کد بریده بودشان.
 * ۳. و بدتر: چکِ «طول متن اسلایدها» در social-checks **مرده** بود.
 *    clampText همیشه ≤۴۰ برمی‌گرداند، پس شرط `charCount > 40` هرگز
 *    درست نمی‌شد و چک همیشه سبز بود. اطمینان کاذب.
 *
 * حالا سقف در پرامپت صریح است، چک زنده است و شکستنش یک دور بازنویسی
 * می‌سازد، و `clampSlides` در ناشر فقط تور نجات است برای وقتی که مدل
 * بعد از بازنویسی هم کوتاه ننوشته.
 */
export const SlideSchema = z.preprocess(
  withDefaultLayout,
  z.discriminatedUnion("layout", [
    z.object({ ...SLIDE_COMMON, layout: z.literal("standard"), text: z.string() }),
    z.object({ ...SLIDE_COMMON, layout: z.literal("statement") }),
    z.object({
      ...SLIDE_COMMON,
      layout: z.literal("list"),
      items: z.array(z.string()).min(2).max(MAX_LIST_ITEMS),
    }),
  ])
);

/**
 * تور نجاتِ ناشر — آخرین خط دفاع، نه مسیر عادی. چیدمان‌آگاه: هر واریانت
 * فقط فیلدهای خودش را می‌بُرد.
 *
 * ⚠️ عمداً بعد از حلقه‌ی بازنویسی اجرا می‌شود، نه پیش از چک‌ها. اگر
 * جای چک بنشیند، دوباره همان چکِ مرده را می‌سازد.
 *
 * `kicker` چک قطعی ندارد (سنجشش خطای کاذب می‌داد و به پرامپت سپرده
 * شده)، پس تنها مهارش همین‌جاست.
 *
 * ⚠️ در ناشر باید **قبل از** `guardPositionLayout` اجرا شود؛ ترتیبِ
 * برعکس یعنی بندهای هنوز نبریده به هم می‌چسبند و بعد از پیوستن بریده
 * می‌شوند — دقیقاً همان ازدست‌رفتنِ محتوایی که `guardPositionLayout`
 * برای جلوگیری از آن نوشته شده.
 */
export function clampSlides(slides: Slide[]): Slide[] {
  return slides.map((s) => {
    const kicker = clampText(s.kicker, LIMITS_BY_LAYOUT[s.layout].kicker);
    const heading = clampText(s.heading, LIMITS_BY_LAYOUT[s.layout].heading);
    switch (s.layout) {
      case "standard":
        return { ...s, kicker, heading, text: clampText(s.text, LIMITS_BY_LAYOUT.standard.text) };
      case "statement":
        return { ...s, kicker, heading };
      case "list":
        return {
          ...s,
          kicker,
          heading,
          items: s.items
            .slice(0, LIMITS_BY_LAYOUT.list.maxItems)
            .map((item) => clampText(item, LIMITS_BY_LAYOUT.list.item)),
        };
      default: {
        const neverSlide: never = s;
        throw new Error(`چیدمانِ ناشناخته: ${JSON.stringify(neverSlide)}`);
      }
    }
  });
}

/**
 * تبدیلِ فهرست به استاندارد — بدون فراخوانیِ مدل، بدون ازدست‌رفتنِ محتوا.
 *
 * جداکننده‌ی `LIST_JOINER` عمداً خنثای اسکریپت است: بین دو رانِ فارسی
 * جهتِ RTL می‌گیرد و بین دو رانِ لاتین جهتِ LTR — پس یک تابع برای هر دو
 * زبان کافی است و هیچ شاخه‌ی زبانی لازم نمی‌شود.
 *
 * بریدن لازم نیست: `LIST_ITEM_LIMIT` (در `slide-spec.ts`) طوری از
 * `SLIDE_LIMITS.text` مشتق شده که بدترین حالت (۳ بندِ پُر) ۱۳۸ کاراکتر
 * شود — زیرِ سقفِ ۱۴۰.
 */
function listToStandard(s: ListSlide): StandardSlide {
  const { items, ...common } = s; // `common` هنوز layout:"list" دارد؛ زیر بازنویسی می‌شود
  return { ...common, layout: "standard", text: items.join(LIST_JOINER) };
}

/**
 * کاور و اسلاید آخر هرگز چیدمانِ `list` نمی‌مانند.
 *
 * کاور باید در گریدِ بندانگشتی خوانده شود و اسلاید آخر یک دعوت است، نه
 * یک سیاهه — پس تنزل می‌گیرند، نه چکِ مسدودکننده (هیچ دورِ بازنویسی
 * هزینه نمی‌کند). `statement` هیچ‌جا تنزل نمی‌گیرد؛ روی کاور و اسلاید
 * آخر کاملاً معتبر است.
 */
export function guardPositionLayout(slides: Slide[]): Slide[] {
  const last = slides.length - 1;
  return slides.map((s, i) =>
    s.layout === "list" && (i === 0 || i === last) ? listToStandard(s) : s
  );
}

export const InstagramCarouselSchema = z.object({
  title: z.string().min(4),
  /** ۱۲۵ کاراکتر اولش قبل از «... بیشتر» دیده می‌شود */
  caption: z.string().min(80).transform((s) => clampText(s, 2200)),
  // ⚠️ بازه‌ی ۵–۸ در constraint جدول social_posts هم هست (supabase/schema.sql).
  //    اگر یکی را عوض کردی، آن یکی را هم عوض کن.
  slides: z.array(SlideSchema).min(5).max(8),
  // ۳ تا ۵ هشتگ — هم‌راستا با لینکدین و ریلز، و با برندگاید (حداکثر ۸).
  // بازه‌ی قبلی min(8).max(15) بود، یعنی اسکیما ساختاراً قاعده‌ی برند را
  // نقض می‌کرد و اینستاگرام تنها قالبی بود که از بقیه جدا افتاده بود.
  // ⚠️ چک «تعداد هشتگ‌های کاروسل» در social-checks.ts هم با همین بازه می‌خواند.
  hashtags: z.array(z.string()).min(3).max(5),
  cta: z.string().min(5),
});

export type InstagramCarousel = z.infer<typeof InstagramCarouselSchema>;

export const LinkedInPostSchema = z.object({
  title: z.string().min(4),
  /** بدنه‌ی پست؛ پاراگراف‌ها با خط خالی از هم جدا می‌شوند */
  body: z.string().min(400).transform((s) => clampText(s, 2800)),
  hashtags: z.array(z.string()).min(3).max(5),
  cta: z.string().min(5),
});

export type LinkedInPost = z.infer<typeof LinkedInPostSchema>;

/* ── فاز ۵: کمپین چندکاناله ─────────────────────────────── */

/**
 * روایت مادر کمپین — چیزی که همه‌ی کانال‌ها از آن مشتق می‌شوند.
 *
 * چرا این لایه لازم است؟ بدون آن، اگر چهار پایپ‌لاین را با یک «موضوع»
 * مشترک اجرا کنیم، چهار محتوای بی‌ربط با یک برچسب مشترک می‌گیریم. روایت
 * مادر همان چیزی است که کمپین را از «چند تولید هم‌زمان» جدا می‌کند.
 */
export const CampaignNarrativeSchema = z.object({
  /** جمله‌ای که کل کمپین حول آن می‌چرخد */
  bigIdea: z.string().min(20),
  audience: z.string(),
  /** تنشی که کمپین به آن می‌پردازد */
  tension: z.string().min(10),
  /** پاسخ برند به آن تنش */
  resolution: z.string().min(10),
  /** ۳ تا ۵ ستون محتوایی که بین کانال‌ها تقسیم می‌شوند */
  pillars: z.array(z.string()).min(3).max(5),
  /** موضوع پیشنهادی برای مقاله‌ی بلاگ */
  blogAngle: z.string().min(10),
  /** زاویه‌ی کاروسل اینستاگرام */
  instagramAngle: z.string().min(10),
  /** مشاهده/زاویه‌ی پست لینکدین */
  linkedinAngle: z.string().min(10),
  /** زاویه‌ی ریلز — چیزی که باید گفته شود، نه خوانده */
  reelsAngle: z.string().min(10),
});

export type CampaignNarrative = z.infer<typeof CampaignNarrativeSchema>;

/* ── ریلز ───────────────────────────────────────────────── */

/**
 * اسکریپت ریلز — چیزی که قرار است بلند خوانده شود.
 *
 * سه بخش جدا نگه داشته می‌شوند (نه یک رشته‌ی یکپارچه) چون هر بخش قاعده‌ی
 * خودش را دارد و چک‌های قطعی باید بتوانند جداگانه بسنجندشان. چسباندنشان
 * به هم کارِ ناشر است — یعنی کد، نه مدل.
 */
export const ReelsScriptSchema = z.object({
  title: z.string().min(4),
  /** قلاب ۳ تا ۵ ثانیه‌ای — کوتاه، بدون سلام و مقدمه */
  hook: z.string().min(10).transform((s) => clampText(s, 220)),
  /** بدنه‌ی آموزشی */
  body: z.string().min(150),
  /** جمله‌ی دعوت به اقدام، همان‌طور که گفته می‌شود */
  cta: z.string().min(10),
  /** شناسه‌ی CTA انتخاب‌شده از فهرست brand-cta.ts */
  ctaId: z.string().min(2),
  /** یک جمله: چرا این CTA؟ — بیرون از اسکریپت */
  ctaReason: z.string().min(10),
  /** متن روی فریم قلاب — کوتاه، چون روی ویدیو خوانده می‌شود */
  onScreenText: z.string().min(3).transform((s) => clampText(s, 45)),
  /** کپشن پیشنهادی — در ریلز جدا از خودِ اسکریپت است */
  caption: z.string().min(40).transform((s) => clampText(s, 2200)),
  hashtags: z.array(z.string()).min(3).max(5),
});

export type ReelsScript = z.infer<typeof ReelsScriptSchema>;

/* ── استوری ─────────────────────────────────────────────── */

/**
 * استیکرِ تعاملیِ یک فریم — با `StorySticker` در `store/types.ts` هم‌شکل.
 *
 * ⚠️ `frame` صفرمبناست: `z.number().int().min(0)`. سقفِ بالا (کوچک‌تر از
 * تعدادِ واقعیِ فریم‌ها) اینجا سنجیده نمی‌شود — به تعدادِ فریمِ ستِ خاص
 * وابسته است، پس چکِ قطعیِ `< frames.length` در `runStoryChecks` (Stage ۱)
 * می‌آید، نه در اسکیما.
 */
export const StoryStickerSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("poll"),
    frame: z.number().int().min(0),
    question: z.string().min(3),
    options: z.tuple([z.string(), z.string()]),
  }),
  z.object({
    type: z.literal("question"),
    frame: z.number().int().min(0),
    prompt: z.string().min(3),
  }),
  z.object({
    type: z.literal("link"),
    frame: z.number().int().min(0),
    label: z.string().min(2),
    destination: z.string().min(2),
  }),
]);

/**
 * فریم‌ها: `imageSubject: null` روی فریم‌های غیرکاور (اندیس ≥ ۱) را به
 * «نبودِ فیلد» تبدیل می‌کند.
 *
 * چرا لازم است: مدل (Gemini) برای فیلدِ اختیاری به‌جای حذفِ کلید، مقدارِ
 * JSON ِ `null` می‌دهد — یک قراردادِ رایجِ سریال‌سازی. `z.string().optional()`
 * مقدارِ `null` را رد می‌کند، پس کپی‌رایترِ استوری هر دو تلاشش را می‌سوزاند و
 * اجرا می‌میرد (اجرای واقعیِ Vercel Preview `7ee0425c` — مسیرهای
 * `["frames", 1, "imageSubject"]` و `["frames", 2, "imageSubject"]`).
 *
 * چرا فقط فریم‌های ≥ ۱: تصویرِ AI فقط برایِ فریمِ اول ساخته می‌شود و ناشر
 * (`story-orchestrator.ts`) خودش `imageSubject` را از فریم‌های بعدی حذف
 * می‌کند — پس `null → حذفِ کلید` روی آن‌ها بی‌کم‌وکاست است.
 *
 * چرا فریمِ ۰ دست‌نخورده می‌ماند: `imageSubject` ِ کاور برای استوری واقعاً
 * لازم است — چکِ مسدودکننده‌ی «تصویر فریم اول» (`social-checks.ts`) و
 * محافظِ رندر (`storage.ts` → «رندر متوقف شد») هر دو نبودش را می‌گیرند.
 * `null` روی فریمِ ۰ باید همچنان سختگیرانه رد شود، نه بی‌صدا پذیرفته.
 */
function normalizeFrames(frames: unknown[]): unknown[] {
  return frames.map((frame, i) => {
    if (i === 0 || !frame || typeof frame !== "object") return frame;
    const f = frame as Record<string, unknown>;
    if ("imageSubject" in f && f.imageSubject === null) {
      console.log(`[story-normalize] imageSubject: null روی فریمِ ${i} حذف شد (قراردادِ JSON مدل)`);
      const { imageSubject: _drop, ...rest } = f;
      return rest;
    }
    return frame;
  });
}

/**
 * استیکرها: هر عنصر جداگانه با **همان `StoryStickerSchema` سختگیرانه**
 * سنجیده می‌شود؛ معتبر عیناً می‌ماند، نامعتبر با صدا حذف می‌شود.
 *
 * چرا حذف و نه ترمیم: استیکر متادیتای اختیاریِ رو به مخاطب است. `label` و
 * `destination` ِ یک لینک، سؤالِ یک نظرسنجی، متنِ یک question — هیچ‌کدام را
 * نمی‌شود از جای دیگری استنتاج کرد. ساختنشان یعنی سرِ خود لینک یا سؤالِ
 * جعلی تولید کردن. **هیچ مقداری اینجا اختراع نمی‌شود** — یا کامل بود و
 * ماند، یا ناقص بود و رفت.
 *
 * چرا اصلاً می‌بخشیم: یک استیکرِ ناقصِ **اختیاری** یک ستِ استوریِ کاملاً
 * سالم را می‌کُشت. اجرای واقعیِ Vercel Preview `aba454b2` — مدل
 * `{ type: "link", frame: n }` بدونِ `label`/`destination` داد و همه‌ی
 * محتوای دیگر معتبر بود، ولی هر دو تلاشِ `runAgentJSON` سوخت و اجرا مُرد.
 * هزینه‌ی از دست دادنِ یک نظرسنجی، در برابرِ هزینه‌ی از دست دادنِ کلِ ست.
 *
 * ⚠️ این بخشش **فقط برای متادیتای اختیاری** است. `title`/`setSummary`/
 * `frames`/`cta` و `imageSubject` ِ فریمِ ۰ همچنان سختگیرانه‌اند — نرمال‌ساز
 * هیچ نقصِ ساختاریِ هسته را نمی‌پوشاند.
 *
 * ⚠️ عنصرِ اصلی نگه داشته می‌شود، نه `result.data` — پارسِ نهاییِ
 * `z.array(StoryStickerSchema)` در اسکیمای بیرونی همان شیءِ کانونیک را
 * می‌سازد. اینجا فقط تصمیمِ «بماند یا برود» گرفته می‌شود.
 */
function normalizeStickers(stickers: unknown[]): unknown[] {
  return stickers.filter((sticker, i) => {
    const result = StoryStickerSchema.safeParse(sticker);
    if (result.success) return true;
    // نوع را فقط وقتی چاپ می‌کنیم که رشته باشد — وگرنه «؟» تا لاگ خودش خطا نسازد
    const raw = sticker as { type?: unknown } | null;
    const type = raw && typeof raw === "object" && typeof raw.type === "string" ? raw.type : "؟";
    const why = result.error.issues.map((iss) => `${iss.path.join(".") || "—"}: ${iss.message}`);
    console.log(
      `[story-normalize] استیکرِ نامعتبر حذف شد — اندیس ${i}، نوع «${type}» — ${why.join(" | ")}`
    );
    return false;
  });
}

/**
 * نرمال‌سازیِ مرزِ خروجیِ استوری — **تنها** درزِ نرمال‌سازیِ این مسیر.
 *
 * دو کارِ جدا را همین‌جا با هم انجام می‌دهد (فریم‌ها و استیکرها) تا
 * پیش‌پردازنده‌های موازی و پراکنده ساخته نشوند؛ هر دو یک مسئله‌ی واحدند:
 * قراردادِ سریال‌سازیِ JSON ِ مدل با قراردادِ سختگیرانه‌ی ذخیره‌سازی یکی نیست.
 *
 * چرا اینجا و نه در `ai.ts`: `runAgentJSON` مستقیم `schema.parse` می‌کند و
 * هیچ درزِ نرمال‌سازیِ مشترکی ندارد. این `preprocess` فقط دورِ
 * `InstagramStorySchema` است — `SlideSchema`، `StoryStickerSchema` و مسیرِ
 * کاروسل هیچ‌کدام دست نمی‌خورند. چون هم `runStoryWriter` و هم
 * `runStoryRevision` همین اسکیما را می‌دهند، یک مسیرِ نرمال‌سازی است، نه دو
 * کپی — و بازنویسی هم نمی‌تواند استیکرِ ناقص را برگرداند.
 *
 * ⚠️ بازگشتی نیست: `StoryStickerSchema` صدا زده می‌شود، نه
 * `InstagramStorySchema`. هرگز اسکیمای بیرونی را از داخلِ `preprocess`
 * خودش صدا نزن.
 */
function normalizeStoryOutput(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const obj = { ...(raw as Record<string, unknown>) };

  if (Array.isArray(obj.frames)) obj.frames = normalizeFrames(obj.frames);

  // `stickers: null` = همان قراردادِ سریال‌سازیِ فیلدِ اختیاری. حذفِ کلید،
  // نه تبدیل به `[]`، تا با «اصلاً استیکر ندارد» یکسان شود.
  if ("stickers" in obj && obj.stickers === null) {
    console.log("[story-normalize] stickers: null حذف شد (قراردادِ JSON مدل)");
    delete obj.stickers;
  } else if (Array.isArray(obj.stickers)) {
    const kept = normalizeStickers(obj.stickers);
    // اگر همه حذف شدند، کلید هم می‌رود — ستی بدونِ استیکر، نه آرایه‌ی خالی
    if (kept.length === 0) delete obj.stickers;
    else obj.stickers = kept;
  }
  // `stickers` با هر شکلِ دیگری (شیء، رشته، عدد) دست‌نخورده رد می‌شود تا
  // اسکیما ردش کند — بخششِ ساختارِ ناشناخته شاهدی پشتش نیست.

  return obj;
}

/**
 * یک ستِ استوری — ۲ تا ۳ فریمِ مرتب که یک مینی‌روایتِ واحد می‌سازند.
 *
 * ⚠️ `frames` از همان `SlideSchema` استفاده می‌کند — بدونِ چیدمانِ چهارم.
 * افزودنِ واریانتِ `"story"` به `Slide` باعثِ شکستِ `blocksFor`/`slideText`/
 * `clampSlides`/`LIMITS_BY_LAYOUT` می‌شد؛ فریمِ استوری همان `standard` یا
 * `statement` یا `list` است.
 *
 * ⚠️ عمداً `caption` ندارد — استوری اصلاً کپشن ندارد. `setSummary` خلاصه‌ی
 * داخلیِ ست برای اپراتور است، نه متنِ قابلِ انتشار (نگاه کن به فیلدِ
 * `SocialPost.body` — همین‌جا می‌نشیند).
 *
 * ⚠️ `preprocess` فقط دو چیز را پاک می‌کند: `imageSubject: null` روی
 * فریم‌های غیرکاور، و استیکرهای اختیاریِ نامعتبر (توضیحِ کامل در
 * `normalizeStoryOutput`). ساختارِ خروجی و `InstagramStory` عوض نمی‌شود و
 * هر استیکری که می‌مانَد از همان `StoryStickerSchema` سختگیرانه رد شده.
 */
export const InstagramStorySchema = z.preprocess(
  normalizeStoryOutput,
  z.object({
    title: z.string().min(4),
    /** خلاصه‌ی داخلیِ ست — کپشن نیست، هرگز paste نمی‌شود */
    setSummary: z.string().min(20),
    // ⚠️ بازه‌ی ۲–۳ زیرمجموعه‌ی بازه‌ی مجازِ دیتابیس (۱–۳) است —
    //    social_posts_shape (تأییدشده روی دیتابیسِ زنده، مرداد ۱۴۰۵).
    frames: z.array(SlideSchema).min(2).max(3),
    stickers: z.array(StoryStickerSchema).optional(),
    cta: z.string().min(5),
  })
);

export type StorySticker = z.infer<typeof StoryStickerSchema>;
export type InstagramStory = z.infer<typeof InstagramStorySchema>;

/** روبریک ویراستار اجتماعی — معیارها عمداً با ویراستار بلاگ فرق دارند */
export const SocialReviewSchema = z.object({
  score: z.number().min(0).max(100),
  rubric: z.object({
    hook: z.number().min(0).max(10),
    platformFit: z.number().min(0).max(10),
    brandVoice: z.number().min(0).max(10),
    clarity: z.number().min(0).max(10),
    persian: z.number().min(0).max(10),
  }),
  issues: z.array(z.string()),
  verdict: z.enum(["approve", "revise"]),
});

export type SocialReview = z.infer<typeof SocialReviewSchema>;

export type CriticOutput = z.infer<typeof CriticOutputSchema>;

/* ── ۷. برنامه‌ریز هفتگی ─────────────────────────────────── */

/**
 * یک اسلات هفته — فقط چیزهایی که مدل تصمیم می‌گیرد.
 *
 * ⚠️ زبان، مسیر، گروه مخاطب و نوع محتوا اینجا نیستند. آن‌ها از
 * WEEKLY_GRID می‌آیند و در کد چسبانده می‌شوند. اگر از مدل پرسیده
 * شوند، نسبت ۷۰/۲۰/۱۰ برندگاید هرگز تضمین نمی‌شود.
 *
 * hook و painPoint اینجا هستند چون در مسیر هفتگی ایده‌یاب دور زده
 * می‌شود، و آن‌ها تنها جایی بودند که سیستم می‌پرسید «آیا این واقعاً
 * اسکرول را متوقف می‌کند؟». برنامه‌ریز آن کار را می‌کند، ولی یک بار
 * برای کل هفته و با دید کل شبکه.
 */
export const WeeklySlotSchema = z.object({
  day: z.number().int().min(0).max(6),
  journeyStage: z.enum(JOURNEY_STAGES),
  topic: z.string().min(10),
  hook: z.string().min(10),
  painPoint: z.string().min(10),
});

export const WeeklyPlanSchema = z.object({
  slots: z.array(WeeklySlotSchema).length(7),
});

export type WeeklySlot = z.infer<typeof WeeklySlotSchema>;
export type WeeklyPlan = z.infer<typeof WeeklyPlanSchema>;