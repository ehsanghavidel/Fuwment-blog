/**
 * پنج گروه مخاطب — بخش ۰۲ راهنمای برند v3.7 (زیراسکریپت‌ها).
 *
 * ⚠️ این پنج «مسیر» نیستند، بخش‌بندی مخاطب‌اند. ساختار رسمی ویزاها چیز
 * دیگری است: Global Talent سه خانواده دارد (دیجیتال تک، پژوهش و آکادمیا،
 * هنر و فرهنگ؛ مهندسی و پزشکیِ پژوهشی زیر خانواده‌ی پژوهش‌اند) و
 * Innovator Founder مسیری کاملاً جداست. پس `AudienceGroup` هرگز جای
 * `BrandRoute` را نمی‌گیرد.
 *
 * شناسه‌ها با ستون‌های موجود دیتابیس و استودیو یکی‌اند — عوضشان نکن.
 */

export const AUDIENCE_GROUPS = [
  "digital-tech",
  "academic-research",
  "arts-culture",
  "engineering-medical",
  "entrepreneurship",
] as const;

export type AudienceGroup = (typeof AUDIENCE_GROUPS)[number];

/** نگهبان نوع — برای ورودی‌هایی که از بیرون (درخواست، دیتابیس) می‌رسند */
export function isAudienceGroup(v: unknown): v is AudienceGroup {
  return typeof v === "string" && (AUDIENCE_GROUPS as readonly string[]).includes(v);
}

type AudienceProfile = {
  /** برچسب فارسی */
  label: string;
  /** چه کسانی و چه سنی */
  who: string;
  /** چهره‌ی دشمن در این رشته (مفهوم داخلی) */
  enemyFace: string;
  outerProblem: string;
  innerProblem: string;
  /** قلاب محتوا — مفهوم است نه متن نهایی؛ برای هر کانال از نو نوشته می‌شود */
  hook: string;
  authority: string;
  transformation: string;
  /** نکته‌ی اجرایی — شامل هشدارهای واقعیِ واجد شرایط بودن */
  note: string;
};

export const AUDIENCES: Record<AudienceGroup, AudienceProfile> = {
  "digital-tech": {
    label: "دیجیتال تک",
    who: "مهندس نرم‌افزار، دیزاینر محصول، متخصص داده، مدیر محصول — ۲۸ تا ۴۰ سال",
    enemyFace:
      "تاثیر ساخته اما فکر می‌کند تاثیر «مدرک» نیست؛ محصول، معماری و تیمی که رشد داده در قالب سند رسمی نیستند و به چشم خودش نمی‌آیند.",
    outerProblem:
      "نمی‌داند تاثیر و نوآوری فنی‌اش را چطور به شواهد قابل ارائه تبدیل کند: عدد رشد، نقش دقیق در محصول، تاییدیه‌ی افراد کلیدی، مشارکت در جامعه‌ی فنی.",
    innerProblem:
      "«من فقط کارم را کردم، چیز خاصی نیست.» خودکم‌بینی در این گروه از همه بیشتر است.",
    hook: "کار شما تاثیر گذاشته — فقط هنوز به زبانی که ارزیاب می‌خواند نوشته نشده.",
    authority:
      "منتور هم‌رشته از همان اکوسیستم فنی، که خودش با همین مسیر اندورس شده و می‌داند تاثیر چطور مستند می‌شود.",
    transformation:
      "از «مهندسِ بی‌نامِ یک شرکت» به «متخصص فنی‌ای که تاثیرش مستند و به‌رسمیت‌شناخته است».",
    note:
      "انتشار مقاله الزام عمومی این مسیر نیست — نوع شواهد به معیارهایی بستگی دارد که متقاضی بر اساسشان اقدام می‌کند. این را صریح بگو؛ اما هرگز نگو مقاله بی‌ارزش است — در بعضی پرونده‌ها بخشی از شواهد است.",
  },
  "academic-research": {
    label: "آکادمیک و پژوهش",
    who: "پژوهشگر، پژوهشگر پسادکترا، عضو هیئت علمی، پژوهشگر صنعتی یا بالینی — ۳۰ تا ۴۵ سال",
    enemyFace:
      "مدرک کم ندارد؛ مسیر را نمی‌بیند. نمی‌داند کدام گزینه با پروفایلش می‌خواند، کدام سطح واقع‌بینانه است و پرونده‌اش باید چه شکلی داشته باشد.",
    outerProblem:
      "انتخاب مسیر و سطح درست، و ساختن پرونده‌ای که با استاندارد داوری هم‌خوان باشد — نه یک رزومه‌ی بلند.",
    innerProblem:
      "خستگی از ارزیابی‌های پی‌درپی و ترس از رد شدن میان هم‌ترازها؛ زمانش هم محدود است چون قراردادهای پژوهشی پایان دارند.",
    hook: "سال‌ها داوری شده‌اید؛ این یکی فرق دارد — اینجا باید خودتان پرونده را روایت کنید.",
    authority:
      "منتور آکادمیک که خودش از مسیر پژوهشی اندورس گرفته و ساختار داوری را از درون می‌شناسد.",
    transformation:
      "از «پژوهشگری وابسته به یک موقعیت و یک قرارداد» به «پژوهشگری آزاد، با حق جابه‌جایی میان نهادها».",
    note:
      "هشدار واجد شرایط بودن: دانشجوی دکترا بودن به‌خودی‌خود واجد شرایط بودن نیست؛ این مسیر بر پژوهشگر فعال استوار است — در محتوا مبهمش نگذار. لحن این گروه دقیق‌تر و داده‌محورتر؛ اغراق سریع‌تر از هر گروهی اعتماد را می‌برد. کانال اصلی: لینکدین و ایمیل.",
  },
  "arts-culture": {
    label: "هنر و فرهنگ",
    who: "فیلم‌ساز، طراح، نویسنده، موسیقی‌دان، کیوریتور — ۲۶ تا ۴۵ سال",
    enemyFace:
      "دستاوردش پراکنده است — جشنواره، نمایشگاه، پروژه‌ی مستقل، همکاری بین‌المللی — بدون ساختاری که آن‌ها را کنار هم معنا کند.",
    outerProblem:
      "جمع‌آوری و ساختاردهی شواهد پراکنده و رسانه‌ای، و ساختن روایتی که یک بدنه‌ی کاری منسجم را نشان دهد.",
    innerProblem:
      "این باور که «مسیرهای مهاجرتی برای مهندس و پزشک ساخته شده، نه برای من»؛ احساس بیرون‌بودن از سیستم.",
    hook: "فکر می‌کنید این مسیر برای رشته‌ی شما ساخته نشده. اتفاقاً برای شما هم هست.",
    authority:
      "منتوری از همان حوزه‌ی هنری که خودش اندورس گرفته و می‌داند یک بدنه‌ی کاری چطور روایت می‌شود.",
    transformation:
      "از «هنرمندی که همیشه باید خودش را توضیح دهد» به «هنرمندی با پرونده‌ای رسمی و قابل ارائه».",
    note:
      "بیشترین حساسیت بصری را دارد — محتوا باید از نظر طراحی بی‌نقص باشد. کانال اصلی: اینستاگرام و ویدیو.",
  },
  "engineering-medical": {
    label: "مهندسی، پزشکی و پژوهش بالینی",
    who: "مهندس یا متخصص سلامت با فعالیت پژوهشی — ۳۰ تا ۴۵ سال",
    enemyFace:
      "نظام‌های صنفی، مجوزها و مسیرهای موازی گیجش کرده‌اند؛ نمی‌داند مسیر استعداد اصلاً به کارش می‌آید یا باید سراغ مسیر شغلی برود.",
    outerProblem:
      "تشخیص اینکه کدام مسیر با شغل، مدرک و برنامه‌اش می‌خواند — و اگر مسیر استعداد است، شواهدش چیست.",
    innerProblem:
      "ترس از هدررفتن سال‌ها تخصص در یک انتخاب اشتباه؛ هزینه‌ی فرصت بزرگ‌ترین نگرانی است، نه هزینه‌ی مالی.",
    hook: "مدرک شما معتبر است؛ سؤال این است کدام در برای شما باز می‌شود.",
    authority:
      "منتوری که تفاوت مسیرها را در حوزه‌ی سلامت و مهندسی می‌شناسد و صادقانه می‌گوید کدام برای این کیس بهتر است.",
    transformation:
      "از «متخصصی محدود به یک نظام» به «متخصصی که میان مسیرها انتخاب می‌کند».",
    note:
      "هشدار واجد شرایط بودن: عنوان شغلی «مهندس» یا «پزشک» به‌تنهایی این مسیر را ایجاد نمی‌کند؛ ماهیت پژوهشی فعالیت — یا سایر مسیرهای واجد شرایط — تعیین‌کننده است. هیچ محتوایی نباید خلاف این را القا کند. در این گروه بیش از بقیه ممکن است پاسخ صادقانه این باشد که مسیر مناسب، گلوبال تلنت نیست — این صراحت بزرگ‌ترین سرمایه‌ی اعتماد است.",
  },
  entrepreneurship: {
    label: "کارآفرینی",
    who: "بنیان‌گذار استارتاپ یا کسب‌وکار فعال — ۳۲ تا ۴۸ سال",
    enemyFace:
      "نمی‌داند ایده و کسب‌وکارش با معیارهای نوآورانه، قابل‌اجرا و مقیاس‌پذیر جور است یا نه؛ و بین دو مسیر استعداد و کارآفرینی گیر کرده.",
    outerProblem:
      "ساختن طرح کسب‌وکاری که استانداردهای اندورسمنت را برآورده کند، و انتخاب درست میان دو مسیر.",
    innerProblem:
      "ترس از قضاوت‌شدن ایده‌ای که سال‌ها رویش کار کرده؛ برای بنیان‌گذار، رد شدن ایده یعنی رد شدن خودش.",
    hook: "سؤال این نیست که ایده‌ی شما خوب است یا نه — این است که با معیارهای این مسیر جور است یا نه.",
    authority:
      "منتوری که هر دو مسیر را می‌شناسد و می‌تواند کیس را با اعداد و ریسک‌ها مقایسه کند.",
    transformation:
      "از «بنیان‌گذاری در یک بازار محدود» به «بنیان‌گذاری با دسترسی به بازار، سرمایه و شبکه‌ی بریتانیا».",
    note:
      "اینجا «دسترسی» مهم‌تر از «به‌رسمیت شناخته‌شدن» است؛ به‌رسمیت‌شناخته‌شدن را دروازه‌ی دسترسی معرفی کن، نه هدف نهایی.",
  },
};

/** توضیح یک‌خطی هر گروه — برای پرامپت برنامه‌ریز و استراتژیست‌ها */
export const AUDIENCE_BRIEFING: Record<AudienceGroup, string> = {
  "digital-tech":
    "دیجیتال تک — تاثیر ساخته ولی فکر می‌کند تاثیر «مدرک» نیست. خودکم‌بینی بیشترین است.",
  "academic-research":
    "آکادمیک و پژوهش — مدرک کم ندارد، مسیر را نمی‌بیند. لحن دقیق‌تر و داده‌محورتر. دانشجوی دکترا بودن به‌تنهایی واجد شرایط بودن نیست.",
  "arts-culture":
    "هنر و فرهنگ — دستاوردش پراکنده است و باور دارد این مسیرها برای مهندس و پزشک ساخته شده‌اند.",
  "engineering-medical":
    "مهندسی و پزشکی — نگرانی اصلی هزینه‌ی فرصت است. ماهیت پژوهشی فعالیت (یا مسیر واجد شرایط دیگر) تعیین‌کننده است، نه عنوان شغلی.",
  entrepreneurship:
    "کارآفرینی — بین دو مسیر گیر کرده و می‌ترسد ایده‌اش قضاوت شود. «دسترسی» برایش مهم‌تر از «به‌رسمیت شناخته‌شدن» است.",
};

/** همان توضیح، به انگلیسی — برای کانال‌های انگلیسی تا متن فارسی وارد خروجی نشود */
export const AUDIENCE_BRIEFING_EN: Record<AudienceGroup, string> = {
  "digital-tech":
    "Digital technology (software engineers, product designers, data specialists, product managers, 28–40): they have built real impact but don't believe impact counts as evidence.",
  "academic-research":
    "Academia & research (researchers, postdocs, faculty, industrial or clinical researchers, 30–45): no shortage of evidence, but they can't see the right route or level. Be precise and data-led; exaggeration destroys trust fastest here. Being a PhD student is not, on its own, eligibility.",
  "arts-culture":
    "Arts & culture (filmmakers, designers, writers, musicians, curators, 26–45): their achievements are scattered and they believe these routes were built for engineers and doctors.",
  "engineering-medical":
    "Engineering, medicine & clinical research (30–45): the main worry is opportunity cost. A job title alone ('engineer', 'doctor') does not create eligibility — research activity, or another qualifying route, does.",
  entrepreneurship:
    "Founders (startup or active business, 32–48): stuck between the talent and founder routes and afraid their idea will be judged. Access to the UK market, capital and network matters more to them than recognition.",
};

/** فهرست فشرده‌ی گروه‌ها برای پرامپت‌هایی که باید یکی را انتخاب کنند */
export function audienceChoiceListFa(): string {
  return AUDIENCE_GROUPS.map((g) => `${g} (${AUDIENCES[g].who})`).join(" · ");
}

/** پروفایل کامل یک گروه — برای پرامپت نویسنده‌ای که گروهش معلوم است */
export function audienceProfileFa(group: AudienceGroup): string {
  const a = AUDIENCES[group];
  return `گروه مخاطب: ${a.label} — ${a.who}
- چهره‌ی مشکل: ${a.enemyFace}
- مشکل بیرونی: ${a.outerProblem}
- مشکل درونی: ${a.innerProblem}
- قلاب (مفهوم، نه متن نهایی — برای کانال بازنویسی کن): «${a.hook}»
- اقتدار تخصصی: ${a.authority}
- تحول: ${a.transformation}
- نکته‌ی اجرایی: ${a.note}`;
}

/** همه‌ی گروه‌ها، برای زمینه‌ی مشترک برند */
export function audienceProfilesFa(): string {
  return AUDIENCE_GROUPS.map((g, i) => {
    const a = AUDIENCES[g];
    return `${i + 1}. ${a.label} (${g}) — ${a.who}
   مشکل درونی: ${a.innerProblem}
   قلاب (مفهوم): «${a.hook}»
   نکته: ${a.note}`;
  }).join("\n");
}
