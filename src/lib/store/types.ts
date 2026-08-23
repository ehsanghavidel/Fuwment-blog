/**
 * تایپ‌های مشترک لایه‌ی ذخیره‌سازی.
 *
 * نکته‌ی آموزشی: کل سیستم فقط با این interface کار می‌کند (الگوی Adapter).
 * دو پیاده‌سازی داریم: Supabase (برای پروداکشن) و حافظه‌ی موقت (برای اجرای
 * محلی بدون هیچ تنظیمی). ایجنت‌ها هیچ‌وقت مستقیم به دیتابیس وصل نمی‌شوند.
 */

export type PostStatus = "draft" | "published";

export type FaqItem = { question: string; answer: string };

export type Post = {
  id: string;
  runId: string | null;
  title: string;
  slug: string;
  excerpt: string;
  /** متن کامل مقاله به مارک‌داون */
  contentMd: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  faq: FaqItem[];
  /** امتیاز نهایی ویراستار (۰ تا ۱۰۰) */
  score: number | null;
  status: PostStatus;
  createdAt: string;
  publishedAt: string | null;
  /**
   * شناسه‌ی پست در وردپرس، بعد از انتقال موفق.
   *
   * دو نقش دارد: محافظ «تکراری نفرست»، و علامت اینکه این پست در وردپرس
   * هست. حالتِ «منتشرشده ولی wpPostId خالی» یعنی هنوز نرفته — به همین
   * دلیل ستون جداگانه‌ای برای خطا لازم نشد.
   */
  wpPostId: number | null;
  /** لینک ویرایش در پیشخوان وردپرس */
  wpEditLink: string | null;
};

export type StepStatus = "running" | "done" | "error" | "skipped";

/** رکورد یک گام از پایپ‌لاین — برای نمایش زنده در استودیو */
export type StepRecord = {
  /** شناسه‌ی ایجنت، مثل idea-scout یا writer */
  agent: string;
  /** نام فارسی برای نمایش */
  label: string;
  status: StepStatus;
  /** خلاصه‌ی یک‌خطی از کاری که انجام شد */
  summary: string;
  /** خروجی کامل گام (JSON) برای بررسی دانشجو */
  output: unknown;
  startedAt: string;
  finishedAt: string | null;
};

export type RunStatus = "running" | "done" | "error";

/**
 * نوع اجرا. هر نوع، ارکستریتور خودش را دارد (فازهای بعدی: کمپین چندکاناله).
 * عمداً در دیتابیس فقط text است و check constraint ندارد، چون با هر نوع
 * جدید باید constraint را drop/recreate می‌کردیم.
 */
export type RunKind = "blog" | "repurpose" | "instagram" | "reels" | "linkedin" | "campaign";

export type PipelineRun = {
  id: string;
  kind: RunKind;
  status: RunStatus;
  /** موضوع پیشنهادی کاربر (اختیاری — اگر خالی باشد ایده‌یاب آزاد است) */
  topicHint: string | null;
  steps: StepRecord[];
  /** خروجی اجرای بلاگ — تکی */
  postId: string | null;
  /** ورودی اجرای بازآفرینی — پست بلاگ مبدأ */
  sourcePostId: string | null;
  /** خروجی اجرای بازآفرینی — چند خروجی دارد، برای همین آرایه است */
  socialPostIds: string[];
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
};

/* ── محتوای شبکه‌های اجتماعی ────────────────────────────── */

export type SocialPlatform = "instagram" | "linkedin";
/** ریلز هم پلتفرمش instagram است؛ همین فیلد فرقشان را می‌گوید */
export type SocialFormat = "carousel" | "post" | "reels";
export type SocialStatus = "draft" | "approved";

/**
 * فیلدهای مخصوص هر قالب که ستون ثابت ندارند.
 * ریلز: متن روی تصویر، کپشن جدا از اسکریپت، و دلیل انتخاب CTA.
 */
export type SocialExtras = {
  /** متن کوتاهی که روی فریم قلاب نوشته می‌شود */
  onScreenText?: string;
  /** کپشن پیشنهادی — در ریلز جدا از خودِ اسکریپت است */
  caption?: string;
  /** چرا این CTA انتخاب شد (یک جمله، بیرون از اسکریپت) */
  ctaReason?: string;
};

/** یک اسلاید کاروسل — فقط برای اینستاگرام */
export type Slide = {
  /** خط کوچک بالای اسلاید، مثل «قدم دوم» */
  kicker: string;
  /** تیتر درشت — کوتاه، چون باید در اندازه‌ی بندانگشتی خوانده شود */
  heading: string;
  /** یکی دو جمله توضیح */
  text: string;
  /** صحنه‌ی فیزیکی پس‌زمینه — فقط کاور؛ نبودش یعنی بدون تصویر */
  imageSubject?: string;
};

export type SocialCheckRecord = { name: string; pass: boolean; note: string };

/**
 * یک قطعه محتوای اجتماعی.
 *
 * چرا جدول و تایپ جدا از Post؟ چون posts.slug یکتا و اجباری است (کپشن
 * اسلاگ ندارد) و metaTitle/faq برای یک کپشن بی‌معنی‌اند. راه دیگر یعنی
 * nullable کردن نیمی از جدول بلاگ.
 *
 * چرا این تایپ «تخت» است و union تفکیک‌شده نیست؟ چون union هر mapper و هر
 * map() در UI را مجبور به narrow کردن می‌کرد — هزینه‌ی زیاد برای سود کم.
 * انضباطِ شکلِ داده جایی می‌نشیند که ارزان و غیرقابل‌دورزدن است: constraint
 * دیتابیس (social_posts_shape) و اسکیمای zod ایجنت‌ها.
 */
export type SocialPost = {
  id: string;
  runId: string | null;
  sourcePostId: string | null;
  platform: SocialPlatform;
  format: SocialFormat;
  /** عنوان داخلی برای فهرست استودیو — منتشر نمی‌شود */
  title: string;
  /** کپشن اینستاگرام، متن پست لینکدین، یا اسکریپت کامل ریلز */
  body: string;
  /** فقط کاروسل اسلاید دارد — این قرارداد در دیتابیس هم قفل شده */
  slides: Slide[];
  hashtags: string[];
  cta: string;
  /** فیلدهای مخصوص قالب (فعلاً فقط ریلز) */
  extras: SocialExtras;
  /**
   * زبان خروجی.
   *
   * ستونش از فاز دوزبانه‌سازی در دیتابیس بود ولی به این تایپ نرسیده
   * بود. رندرکننده لازمش دارد: جهت و تراز متن از زبان می‌آید، نه از
   * محتوا — تشخیص از روی متن روی جمله‌ی کوتاهِ ترکیبی اشتباه می‌کند.
   */
  language: "fa" | "en";
  /**
   * مسیر تصویرهای رندرشده در Supabase Storage، به ترتیب اسلاید.
   *
   * آرایه‌ی خالی یعنی «هنوز رندر نشده» — یک حالت معتبر، نه خرابی.
   * فقط کاروسل تصویر دارد.
   */
  imagePaths: string[];
  /**
   * زمان آخرین رندر موفق.
   *
   * دو کار می‌کند: کلید شکستن کش در URL نمایش (`?v=`)، چون فایل‌ها با
   * upsert روی مسیر ثابت می‌نشینند و پیش‌فرض کش Storage یک ساعت است؛ و
   * در آینده، مبنای تشخیص کهنه‌بودن تصویر نسبت به متن.
   */
  renderedAt: string | null;
  /**
   * هفته‌ی محتوایی‌ای که این محتوا از آن آمده.
   *
   * nullable است چون هر محتوای اجتماعی به هفته تعلق ندارد — اجرای دستی
   * استودیو، کمپین و بازآفرینی همه null می‌گیرند.
   */
  weekId: string | null;
  /** خروجی چک‌های قطعی (social-checks) برای نمایش در استودیو */
  checks: SocialCheckRecord[];
  score: number | null;
  status: SocialStatus;
  createdAt: string;
  approvedAt: string | null;
};

/* ── کمپین چندکاناله ────────────────────────────────────── */

export type CampaignChannel = "blog" | "instagram" | "linkedin" | "reels";

/**
 * روایت مادر کمپین.
 *
 * مثل Slide/SlideSchema: شکل داده اینجا (لایه‌ی ذخیره‌سازی) تعریف می‌شود و
 * اعتبارسنجی‌اش در agents/types.ts با zod. لایه‌ی store به ایجنت‌ها وابسته
 * نمی‌شود.
 */
export type CampaignNarrativeData = {
  bigIdea: string;
  audience: string;
  tension: string;
  resolution: string;
  pillars: string[];
  blogAngle: string;
  instagramAngle: string;
  linkedinAngle: string;
  reelsAngle: string;
};

/** اجرای هر کانال، با شناسه‌ی رکورد pipeline_runs خودش */
export type CampaignRunRef = {
  channel: CampaignChannel;
  runId: string;
  status: RunStatus;
};

export type Campaign = {
  id: string;
  theme: string;
  /** تا وقتی استراتژیست تمام نشده، خالی است */
  narrative: CampaignNarrativeData | null;
  runIds: CampaignRunRef[];
  status: RunStatus;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
};

/* ── هفته‌ی محتوایی ──────────────────────────────────────── */

/**
 * یک اسلات از هفته — پیکربندی شبکه به‌علاوه‌ی چیزی که برنامه‌ریز ساخته.
 *
 * مثل CampaignNarrativeData: شکل داده اینجا تعریف می‌شود و اعتبارسنجی‌اش
 * با zod در agents/types.ts. لایه‌ی store به ایجنت‌ها وابسته نمی‌شود.
 */
export type WeeklySlotData = {
  /** ۰ = شنبه … ۶ = جمعه */
  day: number;
  language: "fa" | "en";
  route: string;
  audienceGroup: string | null;
  contentType: string;
  journeyStage: string;
  topic: string;
  hook: string;
  painPoint: string;
};

/** اجرای هر اسلات، با شناسه‌ی رکورد pipeline_runs خودش */
export type WeekRunRef = {
  day: number;
  runId: string;
  status: RunStatus;
};

/**
 * هفته‌ی محتوایی — والدِ هفت اجرای اینستاگرام.
 *
 * دقیقاً الگوی Campaign: والد جدول خودش را دارد و فرزندها رکورد
 * pipeline_runs معمولی با kind واقعی خودشان می‌گیرند. RunKind دست نمی‌خورد.
 */
export type ContentWeek = {
  id: string;
  /** شنبه‌ی همان هفته به وقت تهران، YYYY-MM-DD — با src/lib/week.ts */
  weekStart: string;
  /** تا وقتی برنامه‌ریز تمام نشده، خالی است */
  plan: WeeklySlotData[];
  runIds: WeekRunRef[];
  status: RunStatus;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
};

export type LessonSource = "critic" | "human";

/** «درس» = حافظه‌ی بلندمدت سیستم؛ سوخت خودبهبودی */
export type Lesson = {
  id: string;
  /** درس برای کدام ایجنت است */
  agent: string;
  lesson: string;
  source: LessonSource;
  active: boolean;
  createdAt: string;
};

/**
 * بازخورد روی چه چیزی؟
 *
 * پیش از این فقط پست بلاگ بود و ستون post_id کافی. با آمدن سه قالب
 * اجتماعی، به‌جای یک جدول بازخورد برای هر نوع، هدف را «نوع + شناسه»
 * کردیم — همان الگویی که در بقیه‌ی سیستم هم هست: یک بار تعمیم، نه یک
 * بار به‌ازای هر قالب.
 */
export type FeedbackTarget = "post" | "social";

export type Feedback = {
  id: string;
  targetType: FeedbackTarget;
  targetId: string;
  rating: "up" | "down";
  comment: string;
  createdAt: string;
};

/** قرارداد لایه‌ی ذخیره‌سازی — هر دو پیاده‌سازی باید دقیقاً همین را ارائه کنند */
export interface BlogStore {
  // پست‌ها
  createPost(post: Post): Promise<void>;
  updatePost(id: string, patch: Partial<Post>): Promise<void>;
  getPost(id: string): Promise<Post | null>;
  getPostBySlug(slug: string): Promise<Post | null>;
  listPosts(opts?: { status?: PostStatus }): Promise<Post[]>;

  // اجراهای پایپ‌لاین
  createRun(run: PipelineRun): Promise<void>;
  updateRun(id: string, patch: Partial<PipelineRun>): Promise<void>;
  getRun(id: string): Promise<PipelineRun | null>;
  listRuns(limit?: number): Promise<PipelineRun[]>;

  // محتوای شبکه‌های اجتماعی
  createSocialPost(post: SocialPost): Promise<void>;
  updateSocialPost(id: string, patch: Partial<SocialPost>): Promise<void>;
  getSocialPost(id: string): Promise<SocialPost | null>;
  listSocialPosts(opts?: {
    sourcePostId?: string;
    platform?: SocialPlatform;
  }): Promise<SocialPost[]>;

  // کمپین‌های چندکاناله
  createCampaign(c: Campaign): Promise<void>;
  updateCampaign(id: string, patch: Partial<Campaign>): Promise<void>;
  getCampaign(id: string): Promise<Campaign | null>;
  listCampaigns(limit?: number): Promise<Campaign[]>;

  // هفته‌های محتوایی
  createWeek(week: ContentWeek): Promise<void>;
  updateWeek(id: string, patch: Partial<ContentWeek>): Promise<void>;
  getWeek(id: string): Promise<ContentWeek | null>;
  /** محافظ «دوباره نساز» — ستون week_start در دیتابیس unique است */
  getWeekByStart(weekStart: string): Promise<ContentWeek | null>;

  // درس‌ها (حافظه‌ی خودبهبودی)
  addLesson(lesson: Lesson): Promise<void>;
  listLessons(opts?: { agent?: string; activeOnly?: boolean }): Promise<Lesson[]>;
  deactivateLesson(id: string): Promise<void>;

  // بازخورد انسانی
  addFeedback(fb: Feedback): Promise<void>;
  listFeedback(opts?: { targetType?: FeedbackTarget; targetId?: string }): Promise<Feedback[]>;
}
