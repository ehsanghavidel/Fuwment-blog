import "server-only";
import type { ZodType } from "zod";
import { runAgentJSON } from "@/lib/ai";
import { COMPANY_NAME } from "@/lib/company";
import {
  ABSTRACT_BRAND_SUBJECT,
  AUDIENCE_BRIEFING_EN,
  BRIEF_REVOICE_NOTE_FA,
  ILLUSTRATION_SUBJECT_RULES_FA,
  VISUAL_FIELDS_RULES_FA,
  INSTAGRAM_BENCHMARK_WORDING_FA,
  INSTAGRAM_EVIDENCE_WORDING_FA,
  INSTAGRAM_SENTENCE_STRUCTURE_FA,
  audienceProfileFa,
  brandChannelFor,
  brandContext,
  instagramCtaBlockEn,
  instagramCtaBlockFa,
  type ContentGoal,
} from "@/lib/brand";
import { lessonsBlockFor } from "./lessons";
import {
  LIMITS_BY_LAYOUT,
  InstagramCarouselSchema,
  type InstagramCarousel,
  type SocialBrief,
  type SocialReview,
} from "./types";
import type { SocialCheck } from "./social-checks";

/**
 * ایجنت ۲ (پایپ‌لاین بازآفرینی) — کپی‌رایتر اینستاگرام
 *
 * وظیفه: بریف اجتماعی را به یک کاروسل ۵ تا ۸ اسلایدی + کپشن تبدیل کند.
 *
 * نکته‌ی آموزشی: برخلاف نویسنده‌ی بلاگ که متن آزاد مارک‌داون می‌دهد، این
 * ایجنت خروجی **ساختاریافته** می‌دهد (آرایه‌ای از اسلایدها). چون هر اسلاید
 * بعداً جداگانه در یک قاب ۴:۵ رندر می‌شود، شکل داده باید تضمین‌شده باشد —
 * نه یک رشته که بعداً بخواهیم پارسش کنیم.
 */


/**
 * قواعد ساختار جمله — «زنده در برابر اداری».
 *
 * ⚠️ هر سه مثالِ ❌ **متن واقعیِ تولیدشده‌ی همین سیستم‌اند**، نه نمونه‌ی
 * ساختگی. از ۱۳۰ اسلاید ذخیره‌شده در `social_posts` درآمده‌اند. مثال
 * ساختگی به مدل یاد می‌دهد از چیزی پرهیز کند که خودش هرگز نمی‌نویسد.
 *
 * سه الگو، شمرده‌شده روی همان ۱۳۰ اسلاید:
 * ۱. اسم‌سازی به‌جای فعل — «از دست رفتن دستاورد» به‌جای «از دست بدهید»
 * ۲. مجهول و بی‌فاعل — «باید مشخص شود» به‌تنهایی ۴ بار تکرار شده
 * ۳. جمله‌ی بلند با بند وابسته — ۲۲ اسلاید بالای ۲۰ کلمه
 *
 * ⚠️ اینجا **عمداً چک قطعی ساخته نشد.** تطبیق الگو روی فارسی دقیقاً
 * همان تله‌ی قاعده‌ی ۲ است: «اسم مصدر» گاهی طبیعی‌ترین شکل جمله است
 * («ارزیابی مسیر» نام یک خدمت است، نه ایراد نگارشی)، و «می‌شود» در
 * فارسی همیشه مجهول نیست. چکِ کاذب، بازنویسی بی‌دلیل می‌سازد.
 *
 * BRAND_VOICE از قبل می‌گفت «جمله‌ها کوتاه، بدون زبان اداری» — یک جمله
 * در یک بلوک بلند. آنچه کم بود، الگوی مشخص و مثال قبل/بعد بود.
 *
 * ⚠️ از ۲۰۲۶-۱۰-۰۹ متن این قاعده در `INSTAGRAM_SENTENCE_STRUCTURE_FA`
 * (`@/lib/brand/instagram.ts`) است — مشترک با استوری و با ✅های محاوره‌ی
 * نرم. ✅های قبلی نوشتاری بودند و مدل همان را تقلید می‌کرد.
 */

/**
 * ⚠️ درس مثال‌ها: مثالِ ✅ به همان اندازه‌ی مثالِ ❌ تقلید می‌شود.
 *
 * نسخه‌ی اول قاعده‌ی `imageSubject` دو مثال ✅ داشت که هر دو صحنه‌ی
 * میز کار بودند («دفترچه‌ی باز روی میز»، «فنجان قهوه کنار لپ‌تاپ»).
 * در دو اجرای واقعیِ پشت‌سرهم، مدل برای دو موضوع کاملاً متفاوت هر دو بار
 * «لپ‌تاپ روی میز» داد. مثال‌ها سقفِ تنوع را تعیین کردند، نه کفش را.
 *
 * پس مثال‌های ✅ حالا عمداً از چهار دنیای متفاوت‌اند و هرکدام به یک
 * گروه مخاطب چسبیده‌اند. اگر روزی مثال جدیدی اضافه کردی، همین را نگه دار:
 * مثال هم‌جنس، خروجی هم‌جنس می‌سازد.
 *
 * ⚠️ و این تضمینِ تنوع **در سطح هفته** نیست. هفت اجرای موازی همدیگر را
 * نمی‌بینند — همان کوریِ ضدتکرار که در weekly-planner.ts توضیح داده شده.
 * راه‌حل ساختاری همان «خانواده‌ی صحنه» است که بعداً در `sceneFamily`/
 * `weekly-grid.ts` ساخته شد (نه دیگر «هنوز ساخته نشده»).
 *
 * ⚠️ **اصلاح دوم (۱۴۰۵-۰۶-۰۴):** مثال‌های ✅ نسخه‌ی قبلی («بوم روی
 * سه‌پایه»، «دفترچه‌ی آزمایشگاه»، «کلاه ایمنی روی نرده»، «وایت‌برد پاک‌شده»)
 * خودشان همه **مکان/محیط کاری** بودند، نه شیء/سند مرتبط با محتوای همان
 * پست. وقتی `sceneBlock()` هم می‌گفت «imageSubject باید داخل همین خانواده
 * بماند»، مدل خانواده‌ی صحنه (مثلاً «نمای بیرونی ساختمان دانشگاهی») را
 * به‌جای زمینه، **موضوعِ اصلیِ عکس** گرفت — با دو پست واقعی تأیید شد
 * («پله‌های سنگی ورودی دانشکده»، «پله‌های سنگی ورودی ساختمان قدیمی»).
 * مثال‌ها حالا به شیء/سند/اقدامِ مرتبط با استدلال پست تغییر کردند (برگه‌ی
 * ارزیابی، رزومه‌ی حاشیه‌نویسی‌شده، نمونه‌کار) و `sceneBlock()` صریح
 * می‌گوید خانواده فقط پس‌زمینه است. اگر مثال تازه اضافه کردی، همین را
 * نگه دار: مثال باید **شیء باشد، نه مکان**.
 *
 * ⚠️ **اصلاح سوم (۱۴۰۵-۰۶-۰۵):** اصلاح دوم خودِ مشکل «خانواده = موضوع»
 * را حل کرد، ولی یک اجرای واقعی هفت‌پستی دو مشکلِ باقی‌مانده را نشان داد:
 *
 * الف) **نشتِ اسمِ معماری از خودِ متنِ hint.** حتی وقتی مدل می‌داند خانواده
 * فقط پس‌زمینه است، اگر خودِ جمله‌ی hint یک اسمِ معماریِ مشخص داشته باشد
 * («پله‌های سنگی یک ساختمان قدیمی»)، مدل همان اسم را عیناً به imageSubject
 * می‌آورد («پوشه‌ی مدارک روی پله‌های سنگی»). راه‌حل: فهرستِ صریح اسم‌های
 * معماری/محیطی (پله، در، راهرو، نما، طاق، مسیر، پنجره) که نباید از جمله‌ی
 * hint عیناً وارد imageSubject شوند؛ فقط نور/حسِ hint می‌ماند، نه اسمِ
 * خودِ عنصر.
 *
 * ب) **همگراییِ نوعِ موضوع.** در همان اجرا، هر هفت imageSubject به یک
 * آرکی‌تایپ همگرا شدند: سند/برگه/پوشه روی یک سطح. ریشه‌اش خودِ مثال‌های
 * ✅ زیر بود — هر چهارتا از جنس «سند» بودند (طبق همان درسِ بالا: «مثال
 * هم‌جنس، خروجی هم‌جنس می‌سازد»). راه‌حل: مثال‌ها حالا از انواعِ مختلفِ
 * موضوع می‌آیند (سند، اقدام/ژست، شیء فنی، تضادِ دو شیء) + یک خودآزمونِ
 * صریح («آیا سند/برگه انتخابِ راحت است یا واقعاً قوی‌ترین بازنماییِ همین
 * پست؟») تا مدل قبل از افتادن در پیش‌فرضِ سند، جایگزین را بسنجد.
 */

/**
 * قواعد مخصوص زبان خروجی.
 *
 * ⚠️ انگلیسی «ترجمه‌ی» فارسی نیست. قاعده‌ی صریح برندگاید: ساختار ترجمه
 * می‌شود، جمله‌ها از نو نوشته می‌شوند. اگر فقط بگوییم «به انگلیسی بنویس»،
 * خروجی انگلیسیِ ترجمه‌شده از فارسی می‌شود که مصنوعی می‌خواند.
 * (از v3.7 مخاطب انگلیسی همان متخصص و بنیان‌گذارِ یکی از پنج گروه است —
 * فرضِ قدیمیِ «نهاد و شریک، نه متقاضی» کنار رفت.)
 */
const FA_BLOCK = `
زبان خروجی: **فارسی**، با خطاب «تو» (قواعد کامل کانال بالاتر آمده).
- هشتگ‌ها فقط با حروف فارسی — مثل #گلوبال_تلنت، #مهاجرت_حرفه‌ای. هیچ هشتگ لاتینی.

${INSTAGRAM_EVIDENCE_WORDING_FA}

${INSTAGRAM_BENCHMARK_WORDING_FA}

${INSTAGRAM_SENTENCE_STRUCTURE_FA}`;

const EN_BLOCK = `
زبان خروجی: **انگلیسی**. کل خروجی — عنوان، کپشن، تیتر و متن اسلایدها، هشتگ‌ها و CTA — باید انگلیسی باشد. هیچ جمله‌ی فارسی در خروجی نباشد.

این ترجمه نیست. از نو به انگلیسی بنویس:
- جمله‌های انگلیسی کوتاه‌ترند. جمله‌ی فارسیِ ترجمه‌شده در انگلیسی بلند و پیچیده می‌شود — نکن.
- مخاطب همان متخصص یا بنیان‌گذارِ گروه مخاطبِ بریف است — انگلیسی زبان مرجع برند است، نه مخاطبی دیگر. لحن گرم، ساده و آموزشی، با «you».
- قواعد انگلیسیِ کانال (نام مسیرها، ارقام لاتین، هشتگ انگلیسی، عناوین حفاظت‌شده) بالاتر آمده‌اند.

**ساختار جمله:** متنِ درست ولی بی‌جان بدترین حالت است. سه قاعده:
- فعل بنویس، نه اسمِ فعل: «you lose your achievement» ✅ در برابر «the loss of your achievement» ❌.
- فاعل را نگه دار: «assessors look for…» ✅ در برابر «is assessed by…» / «must be determined» ❌.
- جمله‌ی بلند با بند وابسته را با نقطه بشکن.`;

// ⚠️ «بند خانواده‌ی صحنه» (sceneBlock) از قالب روشن (۲۰۲۶-۱۰-۱۲) حذف شد:
// تصویرسازیِ تک‌شیء زمینه/فضا ندارد و آن بند فقط اسم مکان را به موضوعِ تصویر
// می‌کشاند (همان مشکلِ اصلاح سوم بالا). پارامترِ `sceneFamily` هنوز پذیرفته
// می‌شود چون weekly-grid می‌سازدش؛ پاک‌کردنِ کاملِ آن زنجیره کار جداگانه است.

/**
 * بندِ حالتِ دایرکت — فقط وقتی اپراتور `dmOffer` پر کرده باشد پر می‌شود (فاز ۵).
 *
 * ⚠️ کلیدواژه به مدل داده نمی‌شود — رجیستری بعد از رندر و به‌صورت قطعی
 * رزروش می‌کند (`dm-registry.ts`). این بند فقط CTAی اسلاید آخر را
 * نسبت به کانال خنثی نگه می‌دارد تا خطِ سیستمِ دایرکت بعداً بدون تناقض
 * به کپشن اضافه شود.
 */
const DM_MODE_BLOCK = `

**این کاروسل حالتِ دایرکت دارد.** بعد از تأیید داخلی، یک خطِ سیستمی که کاربر را به فرستادنِ یک کلیدواژه در دایرکت دعوت می‌کند، **خودکار و جداگانه** به انتهای کپشن اضافه می‌شود — تو خودت آن خط را نمی‌نویسی.
- کلیدواژه را حدس نزن، اختراع نکن، و در هیچ‌جای کپشن یا اسلایدها ننویس.
- ننویس «دایرکت بده»، «به ما دایرکت بزن»، «DM us»، «Send us a DM» یا هر معادلِ دیگرِ همین دستور.
- ننویس «لینک در بایو» یا هر دستورِ کانالیِ دیگر.
- دعوتِ اسلاید آخر باید فقط **ارزش/اقدام** را بگوید، نه مسیرِ رسیدن به آن — نسبت به کانال خنثی بماند.
  · ✅ «چک‌لیست شواهد را بگیر.»
  · ❌ «برای چک‌لیست دایرکت بده.»
  · ❌ «لینک چک‌لیست در بایو.»`;

/** قواعد مشترک بین پیش‌نویس اول و بازنویسی */
function systemPrompt(
  lessons: string,
  language: "fa" | "en",
  goal: ContentGoal,
  sceneFamily?: string | null,
  dmMode?: boolean
): string {
  // v3.7: زمینه‌ی برند + قواعد صریح کانال (اینستاگرام فارسی «تو»، یا اینستاگرام انگلیسی).
  return `تو «کپی‌رایتر اینستاگرام» ${COMPANY_NAME} هستی. کاروسل‌های آموزشی می‌نویسی که مخاطبِ توصیف‌شده در پروفایل شرکت اسکرول را برایشان متوقف کند.

${brandContext(brandChannelFor("instagram", language))}

قواعد اینستاگرام (رعایتشان اجباری است):
- **جمله‌ی اول کپشن** قلاب است و باید کوتاه‌تر از ۱۲۵ کاراکتر باشد؛ اینستاگرام حدوداً همان‌جا «... بیشتر» می‌زند. این جمله باید به‌تنهایی معنی بدهد و کنجکاوی بسازد، و با نقطه یا علامت سؤال تمام شود. با سلام، با نام برند، یا با «در این پست...» شروع نکن.
- کاروسل ۵ تا ۸ اسلاید دارد و **نقش هر اسلاید از جایگاهش تعیین می‌شود، نه انتخاب تو**:
  · اسلاید **اول** = قلاب. تصویریِ همان ایده، نه کپیِ لفظ‌به‌لفظِ کپشن.
  · اسلایدهای **میانی** = هر کدام دقیقاً یک ایده.
  · اسلاید **آخر** = دعوت به اقدام. این نقش قطعی است؛ رندرکننده این اسلاید را با رنگ «اقدام» می‌کشد چه محتوایش دعوت باشد چه نباشد.
- **هر اسلاید یک «layout» دارد** — سه گزینه، انتخابش با تو است، بسته به **شکلِ محتوای همان اسلاید**، نه بسته به جایگاهش در آرایه:
  · standard — کیکر + تیتر + یکی دو جمله‌ی بدنه (فیلد text). پیش‌فرضِ منطقی؛ وقتی شک داری همین را انتخاب کن. کاروسلی که همه‌ی اسلایدهای میانی‌اش standard باشند کاملاً معتبر است — اگر محتوا واقعاً همین را می‌طلبد، به‌زور چیزی را statement یا list نکن.
  · statement — کیکر + تیترِ بزرگ، **بدون فیلد text**. فقط وقتی یک جمله‌ی واحد و قاطع تمامِ حرفِ همان اسلاید را می‌زند و به توضیح، مدرک یا زمینه‌ی بیشتر نیاز ندارد. اگر ایده برای فهمیده‌شدن به یک جمله‌ی دوم نیاز دارد، standard درست‌تر است.
  · list — کیکر + تیتر + ۲ تا ۳ بندِ کوتاه (فیلد items، آرایه‌ی رشته). فقط وقتی محتوا واقعاً **شمردنی** است: معیار، قدم، شرط، مدرک. یک ایده‌ی پیوسته را به‌زور به بند تبدیل نکن.
  · list را روی اسلاید **اول** یا **آخر** انتخاب نکن — نقش‌شان (قلاب/دعوت) با فهرست نمی‌خواند و در عمل تبدیل به standard می‌شود.
  · ⚠️ **هیچ جایگاهِ ثابتی برای statement یا list وجود ندارد.** اسلاید دوم بودن هیچ امتیازی برای statement نیست؛ هرجای کاروسل که قوی‌ترین ایده‌ی تک‌جمله‌ای واقعاً همان‌جا رخ بدهد، همان‌جا statement بگذار — سوم، پنجم، یا هیچ‌جا.
  · ⚠️ **statement و list را برای تنوعِ ظاهری اضافه نکن.** صفر statement در یک کاروسل کاملاً طبیعی است، همین‌طور صفر list — تعدادشان را به‌زور به «دقیقاً یکی از هرکدام» نرسان. الگوی ثابتی مثل «standard → statement → … → list → standard» را در ذهن نساز و تکرار نکن؛ ترتیب لایاوت‌ها باید از ساختار روایی همین کاروسلِ مشخص بیرون بیاید، نه از یک قالبِ آماده.
- **kicker باید نقشِ همان اسلاید را منعکس کند.** kicker یک برچسب است، نه شماره.
  · روی اسلاید آخر kicker باید قدم بعدی را اعلام کند، به زبان و خطاب همین کانال (مثلاً «قدم بعدی»، «حالا چی؟»).
  · ⚠️ روی اسلاید آخر **هرگز** برچسب دنباله‌ای نگذار — «قدم اول»، «قدم دوم»، «۱ از ۵». در یک اجرای واقعی اسلاید ۶ از ۶ کیکر «قدم اول» گرفت در حالی که با رنگ اقدام رندر شده بود؛ خواننده هم‌زمان «شروع» و «پایان» را می‌دید.
  · اگر برچسب دنباله‌ای به کار می‌بری، ترتیبش باید با ترتیب واقعی اسلایدها بخواند و روی اسلاید آخر تمام شده باشد.
- heading هر اسلاید باید در اندازه‌ی بندانگشتی خوانا باشد: کوتاه، بدون جمله‌ی وابسته. متنِ standard حداکثر دو جمله‌ی کوتاه؛ هر بندِ list یک عبارتِ کوتاه، نه جمله.
- **سقف‌های سخت — این‌ها شمرده می‌شوند، حدس نیستند:**
  · kicker حداکثر ${LIMITS_BY_LAYOUT.standard.kicker} کاراکتر و heading حداکثر ${LIMITS_BY_LAYOUT.standard.heading} کاراکتر — روی هر سه چیدمان.
  · متنِ standard حداکثر ${LIMITS_BY_LAYOUT.standard.text} کاراکتر.
  · بندهای list حداکثر ${LIMITS_BY_LAYOUT.list.maxItems} تا، هر بند حداکثر ${LIMITS_BY_LAYOUT.list.item} کاراکتر.
  رد شدن از این‌ها محتوا را برای بازنویسی برمی‌گرداند. **کوتاه بنویس، نه اینکه بلند بنویسی.** این متن‌ها روی تصویر می‌نشینند و جای اضافه‌ای وجود ندارد.
- **هیچ لینکی در کپشن نگذار.** اینستاگرام لینک کپشن را کلیک‌پذیر نمی‌کند. ارجاع به بایو فقط در پست فروش و فقط به شکل CTA اصلی (بند «قدم بعدی» پایین‌تر).
- ۳ تا ۵ هشتگ، هرکدام با # و بدون فاصله، بدون تکرار. هشتگ اسپم ممنوع (#فالو، #لایک، #فالوبک).
- حداکثر ۳ ایموجی، کاربردی. لحن برند اجازه‌ی لحن تبلیغاتی داغ نمی‌دهد.
- ${ILLUSTRATION_SUBJECT_RULES_FA}
  · اگر شیء مناسبی به ذهنت نمی‌رسد، فیلد را خالی بگذار — کاور با آیکون ساخته می‌شود.
  · استثنای نادر — فرم انتزاعی برند: فقط وقتی پست درباره‌ی خودِ مفهوم کلیِ برند یا مراحل کار است و هیچ شیء صادقانه‌ای ندارد، مقدار دقیقِ «${ABSTRACT_BRAND_SUBJECT}» را بگذار.

${VISUAL_FIELDS_RULES_FA}
${language === "fa" ? FA_BLOCK : EN_BLOCK}${
    // حالت دایرکت استثنای تأییدشده‌ی مالک است: خطِ کلیدواژه خودش CTA است،
    // پس CTAی هدف‌محور کنارش نمی‌آید (هیچ پستی دو CTA ندارد).
    dmMode ? DM_MODE_BLOCK : `\n\n${language === "en" ? instagramCtaBlockEn(goal) : instagramCtaBlockFa(goal)}`
  }${lessons}`;
}

function briefBlock(brief: SocialBrief): string {
  const audience = brief.audienceGroup
    ? brief.language === "en"
      ? `\nAudience group: ${AUDIENCE_BRIEFING_EN[brief.audienceGroup]}`
      : `\n${audienceProfileFa(brief.audienceGroup)}`
    : "";
  const goal = brief.contentGoal === "sales" ? "فروش/تبدیل" : "آموزشی";
  return `هدف پست: ${goal}${brief.journeyStage ? ` · مرحله‌ی سفر: ${brief.journeyStage}` : ""}${audience}

بریف اجتماعی:
پیام مرکزی: ${brief.coreMessage}
مخاطب: ${brief.audience}
زاویه‌ی قلاب: ${brief.hookAngle}
نکته‌های کلیدی:
${brief.keyPoints.map((p) => `- ${p}`).join("\n")}
شاهد/مثال: ${brief.proofPoint}
دعوت به اقدام: ${brief.cta}${brief.language === "en" ? "" : `\n\n${BRIEF_REVOICE_NOTE_FA}`}`;
}

const SHAPE_HINT = `ساختارِ کلیِ خروجی — «slides» آرایه‌ای از ۵ تا ۸ اسلاید است، هر عنصرش شکلِ یکی از سه layout پایین را می‌گیرد:
{
  "title": "عنوان داخلی برای فهرست استودیو",
  "visualFamily": "editorial یا playful",
  "caption": "کپشن — ۱۲۵ کاراکتر اولش قلاب است",
  "slides": [
    { "layout": "standard", "kicker": "قلاب", "heading": "تیتر کوتاه اسلاید", "text": "یکی دو جمله", "imageSubject": "یک شیء برای تصویرسازی — فقط اسلاید اول", "icon": "wallet", "highlight": "تکه‌ای عیناً از تیتر" }
  ],
  "hashtags": ["#گلوبال_تلنت", "#مهاجرت_حرفه‌ای", "#اندورسمنت"],
  "cta": "قدم بعدیِ اسلاید آخر — طبق هدف پست"
}
⚠️ «slides» بالا فقط یک عنصر دارد تا ساختارِ کلی خوانا بماند — در خروجیِ واقعی ۵ تا ۸ عنصر دارد.

دو شکلِ دیگرِ اسلاید، **مستقل از هم و مستقل از نمونه‌ی بالا** — نه بخشی از یک کاروسلِ نمونه، نه توالیِ پیشنهادی:

statement: { "layout": "statement", "kicker": "برچسبِ اسلاید", "heading": "یک جمله‌ی واحد و قاطع" }

list: { "layout": "list", "kicker": "برچسبِ اسلاید", "heading": "تیترِ فهرست", "items": ["بندِ اول", "بندِ دوم", "بندِ سوم"], "itemIcons": ["receipt", "wallet", "seal-check"] }

⚠️ این سه شکل فقط فیلدهای هر layout را نشان می‌دهند — نه ترتیب، نه تعداد. هیچ‌کدام فراوانیِ ثابتی ندارد: یک کاروسلِ واقعی می‌تواند صفر statement داشته باشد، صفر list داشته باشد، چند standard پشتِ‌سرهم داشته باشد، یا — اگر محتوا واقعاً ایجاب کند — بیش از یک statement یا بیش از یک list. هیچ layout فقط برای اینکه «هرسه نوع دیده شود» لازم نیست.`;

const SHAPE_HINT_EN = `Overall output shape — "slides" is an array of 5 to 8 slides, each element taking the shape of one of the three layouts below:
{
  "title": "short internal title",
  "visualFamily": "editorial or playful",
  "caption": "first sentence is the hook, under 125 characters",
  "slides": [
    { "layout": "standard", "kicker": "hook", "heading": "short slide heading", "text": "one or two short sentences", "imageSubject": "one object for the illustration — first slide only", "icon": "wallet", "highlight": "words copied exactly from the heading" }
  ],
  "hashtags": ["#GlobalTalent", "#UKVisa", "#TechTalent"],
  "cta": "call to action on the last slide"
}
⚠️ "slides" above has one element only to keep the overall shape readable — the real output has 5 to 8.

Two other slide shapes, **independent of each other and of the example above** — not part of one sample carousel, not a suggested sequence:

statement: { "layout": "statement", "kicker": "slide label", "heading": "one single decisive sentence" }

list: { "layout": "list", "kicker": "slide label", "heading": "list heading", "items": ["first point", "second point", "third point"], "itemIcons": ["receipt", "wallet", "seal-check"] }

⚠️ These three shapes only show each layout's fields — not order, not frequency. None of them has a fixed frequency: a real carousel may have zero statement slides, zero list slides, several standard slides in a row, or — when content genuinely calls for it — more than one statement or more than one list. No layout is required just so all three "get used."`;

export async function runInstagramWriter(input: {
  brief: SocialBrief;
  /** خانواده‌ی صحنه‌ی کاور — فقط مسیر هفتگی پرش می‌کند */
  sceneFamily?: string | null;
  /** حالتِ دایرکتِ فاز ۵ — فقط وقتی اپراتور dmOffer داده باشد true است */
  dmMode?: boolean;
}): Promise<InstagramCarousel> {
  const lessons = await lessonsBlockFor("instagram-writer");

  // ⚠️ ژنریکِ صریح + cast لازم است: از وقتی SlideSchema یک preprocess
  // جلوی discriminatedUnion گرفت، نوعِ ورودیِ داخلیِ Zod (`_input`، نه
  // خروجی) برای slides عمداً `unknown[]` است — همان چیزی که preprocess
  // برایش طراحی شده. AgentJSONOptions<T>.schema فقط خروجی را پارامتری
  // می‌کند و Input را برابرِ Output فرض می‌گیرد، پس واگراییِ نوعِ درونی
  // را رد می‌کند — رفتارِ runtime دست‌نخورده می‌ماند، فقط cast لازم است.
  return runAgentJSON<InstagramCarousel>({
    agent: "instagram-writer",
    system: systemPrompt(lessons, input.brief.language, input.brief.contentGoal ?? "educational", input.sceneFamily, input.dmMode),
    prompt: `${briefBlock(input.brief)}

${input.brief.language === "en" ? "Write a complete Instagram carousel in English." : "یک کاروسل اینستاگرام کامل بنویس."}`,
    temperature: 0.8,
    schema: InstagramCarouselSchema as ZodType<InstagramCarousel>,
    shapeHint: input.brief.language === "en" ? SHAPE_HINT_EN : SHAPE_HINT,
  });
}

/**
 * بازنویسی بر اساس ایرادهای ویراستار + چک‌های قطعیِ ردشده.
 *
 * نکته: پیش‌نویس قبلی را کامل به مدل می‌دهیم تا «اصلاح» کند، نه اینکه از
 * صفر بنویسد؛ وگرنه چیزهایی که درست بودند هم عوض می‌شوند.
 */
export async function runInstagramRevision(input: {
  brief: SocialBrief;
  draft: InstagramCarousel;
  review: SocialReview;
  failedChecks: SocialCheck[];
  /**
   * ⚠️ بازنویسی هم باید خانواده را بگیرد. بدون این، دور بازنویسی قید
   * تنوع را بی‌صدا می‌انداخت و کاور دوباره به صحنه‌ی عمومی برمی‌گشت.
   */
  sceneFamily?: string | null;
  /**
   * ⚠️ بازنویسی هم باید حالتِ دایرکت را بگیرد — دقیقاً همان درسِ sceneFamily.
   * بدون این، دورِ بازنویسی قیدِ CTAی خنثی را بی‌صدا می‌انداخت و مدل دوباره
   * «دایرکت بده»/«لینک در بایو» می‌نوشت.
   */
  dmMode?: boolean;
}): Promise<InstagramCarousel> {
  const lessons = await lessonsBlockFor("instagram-writer");

  const prompt = `${briefBlock(input.brief)}

— پیش‌نویس فعلی —
${JSON.stringify(input.draft, null, 2)}

— ایرادهای ویراستار (امتیاز ${input.review.score}/100) —
${input.review.issues.map((i) => `- ${i}`).join("\n") || "- (بدون ایراد)"}

— چک‌های قطعیِ ردشده —
${input.failedChecks.map((c) => `- ${c.name}: ${c.note}`).join("\n") || "- (همه پاس شدند)"}

کاروسل را اصلاح کن. فقط چیزهایی را عوض کن که ایراد دارند؛ بقیه را دست نزن.`;

  return runAgentJSON<InstagramCarousel>({
    agent: "instagram-writer",
    system: systemPrompt(lessons, input.brief.language, input.brief.contentGoal ?? "educational", input.sceneFamily, input.dmMode),
    prompt,
    temperature: 0.6,
    schema: InstagramCarouselSchema as ZodType<InstagramCarousel>,
    shapeHint: input.brief.language === "en" ? SHAPE_HINT_EN : SHAPE_HINT,
  });
}
