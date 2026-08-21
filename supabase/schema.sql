-- ───────────────────────────────────────────────
-- آرکان — سیستم بلاگ مولتی‌ایجنت (فاز ۳)
-- این فایل را در SQL Editor داشبورد Supabase اجرا کنید.
-- ───────────────────────────────────────────────

-- پست‌های بلاگ (خروجی نهایی پایپ‌لاین)
create table if not exists posts (
  id            uuid primary key,
  run_id        uuid,
  title         text not null,
  slug          text not null unique,
  excerpt       text not null default '',
  content_md    text not null,
  meta_title    text not null default '',
  meta_description text not null default '',
  keywords      jsonb not null default '[]',
  faq           jsonb not null default '[]',
  score         int,
  status        text not null default 'draft' check (status in ('draft','published')),
  created_at    timestamptz not null default now(),
  published_at  timestamptz
);

-- اجراهای پایپ‌لاین (برای نمایش زنده و تاریخچه)
-- steps: آرایه‌ای از رکورد گام‌ها (jsonb) — ساده‌تر از جدول جدا، برای این مقیاس کافی است
create table if not exists pipeline_runs (
  id           uuid primary key,
  status       text not null default 'running' check (status in ('running','done','error')),
  topic_hint   text,
  steps        jsonb not null default '[]',
  post_id      uuid,
  error        text,
  created_at   timestamptz not null default now(),
  finished_at  timestamptz
);

-- درس‌ها = حافظه‌ی بلندمدت خودبهبودی
-- هر درس به یک ایجنت خاص تعلق دارد و در اجراهای بعدی به پرامپت او تزریق می‌شود.
create table if not exists lessons (
  id          uuid primary key,
  agent       text not null,
  lesson      text not null,
  source      text not null check (source in ('critic','human')),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- بازخورد انسانی روی پست‌ها (ورودی خام خودبهبودی)
create table if not exists post_feedback (
  id          uuid primary key,
  post_id     uuid not null,
  rating      text not null check (rating in ('up','down')),
  comment     text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists idx_posts_status on posts(status);
create index if not exists idx_lessons_agent on lessons(agent) where active;

-- ───────────────────────────────────────────────
-- فاز ۴ — محتوای شبکه‌های اجتماعی
-- ───────────────────────────────────────────────

-- خروجی پایپ‌لاین بازآفرینی: کاروسل اینستاگرام و پست لینکدین.
--
-- چرا جدول جدا و نه یک ستون content_type روی posts؟ چون posts.slug یکتا و
-- not null است (کپشن اسلاگ ندارد) و ستون‌های meta_title/faq برای یک کپشن
-- بی‌معنی‌اند. راه دیگر یعنی nullable کردن نیمی از جدول بلاگ.
create table if not exists social_posts (
  id              uuid primary key,
  run_id          uuid,
  -- پست بلاگی که این محتوا از آن بازآفرینی شده
  source_post_id  uuid,
  platform        text not null check (platform in ('instagram','linkedin')),
  -- reels هم روی پلتفرم instagram می‌نشیند؛ format است که فرقشان را می‌گوید
  format          text not null check (format in ('carousel','post','reels')),
  -- عنوان داخلی برای فهرست استودیو — منتشر نمی‌شود
  title           text not null default '',
  -- کپشن اینستاگرام یا متن کامل پست لینکدین
  body            text not null default '',
  -- فقط برای کاروسل: [{ "kicker": "...", "heading": "...", "text": "..." }]
  slides          jsonb not null default '[]',
  hashtags        jsonb not null default '[]',
  cta             text not null default '',
  -- خروجی چک‌های قطعی (social-checks) برای نمایش در استودیو
  checks          jsonb not null default '[]',
  -- فیلدهای مخصوص هر قالب که جای ثابتی در جدول ندارند.
  -- برای ریلز: { onScreenText, caption, ctaReason }
  -- چرا jsonb و نه چند ستون جدید؟ چون هر قالب جدید ستون‌های خودش را
  -- می‌خواهد و جدول به‌سرعت پر از ستون‌های همیشه-خالی می‌شد.
  extras          jsonb not null default '{}',
  score           int,
  -- «approved» یعنی انسان تأییدش کرده برای انتشار دستی؛ انتشار خودکار نداریم.
  status          text not null default 'draft' check (status in ('draft','approved')),
  created_at      timestamptz not null default now(),
  approved_at     timestamptz,

  -- قرارداد شکل داده را همین‌جا قفل می‌کنیم: کاروسل حتماً ۵ تا ۸ اسلاید دارد
  -- و پست تک‌متنی حتماً صفر. این تنها جایی است که نمی‌شود دورش زد.
  -- ⚠️ همین بازه در InstagramCarouselSchema (src/lib/agents/types.ts) هم هست؛
  --    اگر یکی را عوض کردی، آن یکی را هم عوض کن.
  constraint social_posts_shape check (
    (format = 'carousel' and jsonb_array_length(slides) between 5 and 8)
    or (format in ('post','reels') and jsonb_array_length(slides) = 0)
  )
);

-- ── افزودن قالب ریلز به جدولی که از قبل ساخته شده ──
-- چون ابزار migration نداریم، تغییر constraint را با drop/add انجام می‌دهیم.
-- «drop … if exists» قبل از «add»، کل بلوک را دوباره‌اجراپذیر می‌کند.
alter table social_posts add column if not exists extras jsonb not null default '{}';

alter table social_posts drop constraint if exists social_posts_format_check;
alter table social_posts add constraint social_posts_format_check
  check (format in ('carousel','post','reels'));

alter table social_posts drop constraint if exists social_posts_shape;
alter table social_posts add constraint social_posts_shape check (
  (format = 'carousel' and jsonb_array_length(slides) between 5 and 8)
  or (format in ('post','reels') and jsonb_array_length(slides) = 0)
);

-- اجرای بازآفرینی دو خروجی دارد، نه یکی؛ پس post_id تکی کافی نیست.
-- kind عمداً check constraint ندارد: با هر نوع اجرای جدید (کمپین چندکاناله
-- در فازهای بعد) باید drop/recreate می‌شد. اتحادش در TS کنترل می‌شود.
alter table pipeline_runs add column if not exists kind text not null default 'blog';
alter table pipeline_runs add column if not exists source_post_id uuid;
alter table pipeline_runs add column if not exists social_post_ids jsonb not null default '[]';

create index if not exists idx_social_posts_status on social_posts(status);
create index if not exists idx_social_posts_source on social_posts(source_post_id);

-- ── عمومی‌کردن بازخورد انسانی ──
-- جدول post_feedback فقط پست بلاگ را می‌شناخت. حالا که سه نوع محتوای
-- اجتماعی داریم، به‌جای ساختن یک جدول بازخورد برای هر نوع، هدف را
-- «نوع + شناسه» می‌کنیم. یک بار مهاجرت، نه یک بار به‌ازای هر قالب جدید.
alter table post_feedback add column if not exists target_type text not null default 'post';
alter table post_feedback add column if not exists target_id uuid;

-- پرکردن رکوردهای قدیمی از روی post_id
update post_feedback set target_id = post_id where target_id is null;

-- post_id دیگر منبع حقیقت نیست؛ نگهش می‌داریم تا داده‌ی قدیمی از دست نرود،
-- ولی اجباری‌بودنش را برمی‌داریم چون بازخورد اجتماعی post_id ندارد.
alter table post_feedback alter column post_id drop not null;

create index if not exists idx_feedback_target on post_feedback(target_type, target_id);

-- ───────────────────────────────────────────────
-- فاز ۵ — کمپین چندکاناله
-- ───────────────────────────────────────────────

-- یک تم، چند کانال، یک روایت مشترک.
--
-- نکته‌ی طراحی: کمپین اجراهای کانال‌ها را «نگه نمی‌دارد»، فقط به آن‌ها
-- گره می‌زند. هر کانال رکورد pipeline_runs خودش را دارد، چون هرکدام
-- ممکن است جدا شکست بخورد و باید جدا هم دیده شود. اگر همه را در یک run
-- می‌ریختیم، شکست یک کانال کل کمپین را «خطا» نشان می‌داد.
-- ⚠️ نام جدول عمداً content_campaigns است، نه campaigns.
-- در همین پروژه‌ی Supabase از قبل یک جدول campaigns وجود دارد که متعلق به
-- CRM است (ستون‌های name/segment_key/goal/sent_at) و داده‌ی واقعی دارد.
-- «create table if not exists» روی تصادفِ نام، بی‌صدا کاری نمی‌کند — نه خطا
-- می‌دهد و نه جدول را می‌سازد؛ بعد اولین insert با خطای مبهمِ «ستون پیدا
-- نشد» می‌شکند. درس: در دیتابیس مشترک، نام جدول را با پیشوند دامنه بگیرید.
create table if not exists content_campaigns (
  id           uuid primary key,
  theme        text not null,
  -- روایت مادر که همه‌ی کانال‌ها از آن مشتق می‌شوند
  narrative    jsonb not null default '{}',
  -- شناسه‌ی اجرای هر کانال: [{ "channel": "blog", "runId": "…" }]
  run_ids      jsonb not null default '[]',
  status       text not null default 'running' check (status in ('running','done','error')),
  error        text,
  created_at   timestamptz not null default now(),
  finished_at  timestamptz
);

create index if not exists idx_content_campaigns_status on content_campaigns(status);

-- ───────────────────────────────────────────────
-- فاز ۶ — انتقال به وردپرس
-- ───────────────────────────────────────────────
-- بلاگ عمومی روی وردپرس (fuwment.com) است و این پروژه فقط تولیدکننده‌ی
-- محتواست. این دو ستون نتیجه‌ی انتقال را نگه می‌دارند.
--
-- هر دو nullable‌اند و پیش‌فرض ندارند — مثل score و published_at که تا
-- مرحله‌ی بعدی خالی می‌مانند. وجود wp_post_id یعنی «این پست در وردپرس
-- هست»، و همین کافی است تا دوباره فرستاده نشود؛ برای همین ستون جداگانه‌ای
-- برای خطا نداریم: حالتِ «تأیید شده ولی wp_post_id خالی» یعنی ارسال نشده.
alter table posts add column if not exists wp_post_id   int;
alter table posts add column if not exists wp_edit_link text;
-- ── افزودن قالب استوری ──────────────────────────────────────
-- همان الگوی drop/add که برای ریلز استفاده شد.
--
-- شکل استوری: هر «ست استوری» یک ردیف است، نه سه ردیف. یک اجرای
-- استوری‌ساز سه استوری یک روز را با هم تولید می‌کند و با هم تأیید
-- می‌شوند؛ پس مثل کاروسل، یک مجموعه‌ی مرتب است.
-- بازه‌ی ۱ تا ۳: معمولاً سه‌تا، ولی یک استوری فوریِ تکی هم باید بشود.
alter table social_posts drop constraint if exists social_posts_format_check;
alter table social_posts add constraint social_posts_format_check
  check (format in ('carousel','post','reels','story'));

alter table social_posts drop constraint if exists social_posts_shape;
alter table social_posts add constraint social_posts_shape check (
  (format = 'carousel' and jsonb_array_length(slides) between 5 and 8)
  or (format = 'story' and jsonb_array_length(slides) between 1 and 3)
  or (format in ('post','reels') and jsonb_array_length(slides) = 0)
);

-- ── ستون‌های فازهای بعد ─────────────────────────────────────
-- الان اضافه می‌شوند تا یک بار SQL دستی اجرا شود، نه سه بار.
--
-- ⚠️ نام‌گذاری: partialToRow فقط camelCaseِ ساده را به snake_case
--    تبدیل می‌کند. نامی با رقم یا حروف بزرگ پیاپی (imageURL, slide1Path)
--    بی‌صدا حذف می‌شود. پس: language, dmKeyword, imagePaths.

alter table social_posts add column if not exists language text not null default 'fa';
alter table social_posts drop constraint if exists social_posts_language_check;
alter table social_posts add constraint social_posts_language_check
  check (language in ('fa','en'));

-- کلیدواژه‌ی دعوت به دایرکت — باید در کل جدول یکتا باشد، وگرنه دو پست
-- مختلف با یک کلیدواژه یعنی پاسخ خودکار نمی‌داند کدام را بفرستد.
alter table social_posts add column if not exists dm_keyword text;
create unique index if not exists idx_social_posts_dm_keyword
  on social_posts(dm_keyword) where dm_keyword is not null;

-- مسیر فایل‌های رندرشده در Supabase Storage، به ترتیب اسلاید
alter table social_posts add column if not exists image_paths jsonb not null default '[]';

create index if not exists idx_social_posts_language on social_posts(language);
-- ── هفته‌ی محتوایی ──────────────────────────────────────────
--
-- والدِ هفت اجرای اینستاگرام. دقیقاً الگوی content_campaigns:
-- والد جدول خودش را دارد و فرزندها رکورد pipeline_runs معمولی با
-- kind واقعی خودشان می‌گیرند. RunKind دست نمی‌خورد.
--
-- ⚠️ week_start را همیشه با src/lib/week.ts حساب کن، نه با now().
--    ستون date بی‌منطقه است و همین درست است — ولی مقدارش باید در کد
--    با Asia/Tehran صریح ساخته شود. تهران UTC+3:30 است، پس هر شب یک
--    بازه‌ی ۳٫۵ ساعته هست که «امروز» در UTC و تهران فرق می‌کند. اگر
--    از تاریخ سرور بگیری، اجرای شب‌هنگام در هفته‌ی اشتباه می‌افتد و
--    چون unique است یا رکورد تکراری می‌سازد یا هفته را جا می‌اندازد.
create table if not exists content_weeks (
  id           uuid primary key,
  -- شنبه‌ی همان هفته به وقت تهران. هفته‌ی محتوایی، هفته‌ی مخاطب است.
  week_start   date not null unique,
  -- هفت اسلات: [{ day, language, route, audienceGroup, contentType,
  --               journeyStage, topic, hook, painPoint }]
  plan         jsonb not null default '[]',
  -- [{ runId, day, status }]
  run_ids      jsonb not null default '[]',
  status       text not null default 'running' check (status in ('running','done','error')),
  error        text,
  created_at   timestamptz not null default now(),
  finished_at  timestamptz
);

create index if not exists idx_content_weeks_status on content_weeks(status);

-- پیوند فرزند به والد. nullable چون هر محتوای اجتماعی به هفته تعلق ندارد
-- (اجرای دستی، کمپین، بازآفرینی).
alter table social_posts add column if not exists week_id uuid;
create index if not exists idx_social_posts_week on social_posts(week_id);