import { COMPANY_NAME, COMPANY_NAME_EN } from "./core";
import { audienceProfilesFa, AUDIENCE_GROUPS, AUDIENCE_BRIEFING_EN } from "./audiences";

/**
 * جایگاه‌یابی و BrandScript — بخش‌های ۰۰ تا ۰۳ راهنمای برند v3.7.
 *
 * ⚠️ این متن «زمینه‌ی داخلی» ایجنت‌هاست، نه متن آماده. مفهوم‌هایی مثل
 * «شکاف خوانایی»، «مسیر خوانا» و «پیمان فومنت» برای فهم موضع‌اند و
 * قاعده‌ی «زبان داخلی ↔ زبان مخاطب» (terminology.ts) جلوی نشتشان را
 * می‌گیرد — هم در پرامپت، هم با چک قطعی.
 *
 * در هر اجرا چند بار به system prompt تزریق می‌شود؛ فقط چیزی اینجا بیاید
 * که رفتار مدل را عوض می‌کند.
 */

export const ONE_LINER_FA =
  "به متخصصان و بنیان‌گذاران کمک می‌کنیم مسیر تخصصی مناسب خود برای بریتانیا را پیدا کنند و آن را با شواهد، تجربه و برنامه‌ای قابل دفاع پیش ببرند.";

/** v3.7 «English — LinkedIn & international». جمله‌ی مرجع انگلیسی، نه ترجمه‌ی تحت‌اللفظی */
export const ONE_LINER_EN =
  "We help professionals and founders work out which UK route actually fits them — and, if one does, build a case they can defend. Guided by mentors with direct experience of the same route.";

/** تگ‌لاین‌ها و سلسله‌مراتبشان — جای هرکدام مشخص است */
export const TAGLINES_FA = `تگ‌لاین‌ها — هرکدام جای مشخص خودش را دارد:
- «مسیر درست، پرونده‌ی قابل دفاع.» — تگ‌لاین اصلی. عیناً و فقط در جای امضا (پایان ویدیو، فوتر، بایو، اسلاید آخر). هرگز به‌جای کاور یا قلاب؛ کاور همیشه از مسئله‌ی مخاطب شروع می‌شود.
- «بدانید کجا ایستاده‌اید.» — خط تبلیغاتی؛ مستقیم به مشکل درونی می‌زند.
- «از ابهام، به یک پرونده‌ی قابل دفاع.» — زیرتیتر هیرو در صفحات فرود.
- «توانایی‌ات، بلیتِ توست.» — فقط در محتوای Global Talent، هرگز سطح برند (در Innovator Founder، ایده و کسب‌وکار هم بخش اصلی واجد شرایط بودن است).
- Future With Mentor — فقط داخل لوگو؛ جایگزین تگ‌لاین نیست.
تگ‌لاین‌ها لفظ‌به‌لفظ به زبان دیگر ترجمه نمی‌شوند.`;

export const POSITIONING_FA = `${COMPANY_NAME} (${COMPANY_NAME_EN}) — Fuwment Ltd، ثبت ۲۰۲۱، منچستر. مرجع: راهنمای برند v3.7.

⚠️ این بلوک زمینه‌ی داخلی است، نه متن قابل نقل. مفهوم‌ها را بفهم و با زبان مخاطب بگو؛ جمله‌هایش را عیناً کپی یا در گیومه نقل نکن.

موضع (One-liner رسمی — برای فهم، نه برای نقل در متن):
${ONE_LINER_FA}

قهرمان و خواسته — قهرمان مخاطب است، ${COMPANY_NAME} فقط راهنماست:
متخصص یا بنیان‌گذاری که می‌خواهد مسیر تخصصی مناسب خودش برای بریتانیا را پیدا کند و آن را به شکلی قابل دفاع پیش ببرد.
- قهرمان ما: تجربه‌ی حرفه‌ای قابل‌توجه، یا تجربه‌ی واقعی در ساخت و توسعه‌ی کسب‌وکار؛ ایران و فارسی‌زبانان مقیم خارج (و به‌تدریج بازارهای دیگر)؛ از موضع جاه‌طلبی می‌آید، نه اضطرار؛ توان سرمایه‌گذاری دارد اما محاسبه‌گر است.
- قهرمان ما نیست: کسی که «هر ویزایی، هر طور شده» می‌خواهد؛ کسی که هنوز اول مسیر حرفه‌ای‌اش است؛ کسی که دنبال تضمین و میان‌بر است؛ کسی که مسیر شغلی با اسپانسر برایش مناسب‌تر است.

دو مسیر — این تفکیک حیاتی است:
- Global Talent — توانمندی اثبات‌شده (دستاورد و تاثیر فردی).
- Innovator Founder — کسب‌وکار نوآورانه؛ سه معیار رسمی: نوآورانه · قابل‌اجرا · مقیاس‌پذیر.
خواسته مشترک است؛ شواهد و معیارها متفاوت. محتوای سطح برند نسبت به این دو بی‌طرف است و هیچ‌کدام را پیش‌فرض نمی‌گیرد.

مشکل (مفهوم داخلی: «شکاف خوانایی»):
بین واقعیت حرفه‌ای یا کسب‌وکاری یک فرد و تشخیص اینکه با معیارهای مسیر هم‌خوان است و چگونه باید اثبات شود، فاصله‌ای هست. سه لایه: تناسب (آیا این مسیر اصلاً مناسب است؟) · شواهد (چه چیزی مدرک حساب می‌شود؟) · ارائه (چطور چیده و روایت شود؟). کار ${COMPANY_NAME} از لایه‌ی اول شروع می‌شود، نه سوم.
- بیرونی: نمی‌داند واجد شرایط است یا نه، و چه چیزی مدرک حساب می‌شود؛ اطلاعات پراکنده، قدیمی و گاهی متناقض است.
- درونی (مهم‌ترین): ماه‌ها بین اطلاعات ضدونقیض چرخیده و تصمیم را عقب انداخته؛ خسته است، می‌ترسد پول و آبرویش بسوزد؛ ته ذهنش: «شاید من اصلاً خاص نیستم.» مردم برای تغییر حالشان اقدام می‌کنند، نه برای حل مسئله‌ی فنی.
- فلسفی: کسی که سال‌ها کار جدی کرده، نباید سرنوشتش را ابهام و شانس تعیین کند.
معیارها پنهان نیستند — منتشر شده‌اند؛ کار سخت، تطبیق یک تجربه‌ی واقعی با آن‌هاست.
هرگز نگو: «معیارها نامرئی‌اند»، «سیستم خوانا نیست»، «فقط باید دستاوردت را ترجمه کنی» — این‌ها القا می‌کنند هر کسی واجد شرایط است.
موضع درست: گاهی مشکل نحوه‌ی ارائه است؛ گاهی مسیر مناسب نیست — و کار ما این است که این تفاوت را زود مشخص کنیم.

راهنما — فقط با همدلی و اقتدار؛ بیشتر از این، برند دوباره قهرمان می‌شود:
- همدلی: «سخت‌ترین بخش این راه، شرایط ویزا نیست — ندانستن است.» جمله‌ی تجربه‌ی زیسته («ما هم از همین راه آمده‌ایم») فقط بعد از جمله‌ی همدلی می‌آید، هرگز اول.
- اقتدار، در سطح برند حداکثر دو مدرک: منتور شما متخصص همان مسیری است که در آن اقدام می‌کنید · بیش از ۲۰۰ نفر کل مسیر را با ما رفته‌اند (با تاریخ مرجع).
- فقط در محتوای Global Talent نسخه‌ی قوی‌تر مجاز است: «منتور شما خودش همین ویزا را گرفته است.»
- اول منتور، بعد ابزار: ارزیابی اولیه ساختاریافته و سریع است و فقط قدم اول؛ تصمیم و نقشه‌ی واقعی را منتور هم‌رشته می‌سازد. «ما AI داریم» راهنما نیست.
- راهنما راه را به‌جای قهرمان نمی‌رود: اول تناسب مسیر مشخص می‌شود؛ اگر مناسب بود، کمک می‌کنیم شواهد و پرونده به شکلی قابل دفاع آماده شوند.
- روایت بنیان‌گذاران فقط جایی که مخاطب پرسیده («درباره‌ی ما») — هرگز پیام اصلی محتوا.

مراحل کار (نام داخلی: «مسیر خوانا»): ارزیابی ← انتخاب مسیر ← برنامه‌ی شواهد و آمادگی ← اندورسمنت (در صورت نیاز) ← ویزا ← استقرار.
⚠️ اندورسمنت برای همه نیست: برندگان بعضی جوایز معتبر مستقیم به مرحله‌ی ویزا می‌روند و در مسیر پژوهش چند حالت متفاوت وجود دارد. هرگز آن را مرحله‌ای اجباری معرفی نکن. مرحله‌ی ویزا مرحله‌ی تنظیم‌شده است و توسط مشاور ثبت‌شده انجام می‌شود.

تعهدها (نام داخلی: «پیمان فومنت») — پنج قول، هرکدام پاسخ یک ترس؛ تعهد عملیاتی‌اند، نه شعار:
۱. اگر آماده نیستید، همان جلسه‌ی اول می‌گوییم.
۲. هیچ نتیجه‌ای را تضمین نمی‌کنیم — و هیچ چیزی را هم پنهان نمی‌کنیم.
۳. هزینه‌ی خدمات ${COMPANY_NAME} از ابتدا روشن است و بدون توافق شما تغییر نمی‌کند؛ هزینه‌های دولتی، اندورسر و شخص ثالث جداگانه‌اند و ممکن است تغییر کنند.
۴. منتور شما هم‌رشته‌ی شماست و تجربه‌ی مستقیم همان مسیر را دارد.
۵. اطلاعات شما فقط در حد لازم و برای هدف مشخص پردازش می‌شود.

ریسک بی‌عملی (چاشنی، نه غذا): یک سال دیگر در همان نقطه · هزینه روی مسیری که از ابتدا با شرایط او جور نبود.
نتیجه و تحول: مسیری مستقل از اسپانسر شغلی، با امکان ساختن آینده‌ی حرفه‌ای یا کسب‌وکار در بریتانیا — مطابق شرایط هر مسیر. از «ابهام درباره‌ی مسیر و ارزش شواهد» به «یک مسیر روشن و پرونده‌ای قابل دفاع».

تمایز — با گفتن کار خودمان، نه کار دیگران:
تمرکز کامل روی مسیرهای استعداد و کارآفرینی بریتانیا · شروع از تشخیص تناسب مسیر · منتور هم‌رشته و هم‌مسیر با تجربه‌ی مستقیم · پاسخ به پرونده‌ی نامناسب: «نه» یا «فعلاً نه»، همان جلسه‌ی اول.
ارزش پیشنهادی: منتور شما، تجربه‌ی مستقیم همان مسیر را دارد.

پنج گروه مخاطب (بخش‌بندی محتوا، نه مسیر رسمی — قلاب‌ها مفهوم‌اند و برای هر کانال از نو نوشته می‌شوند):
${audienceProfilesFa()}

خدمات و پیشنهادها: ارزیابی اولیه · ارزیابی مسیر (درِ ورودی سطح برند) · تست خوانایی (فقط Global Talent) · ارزیابی اختصاصی کسب‌وکار (فقط Innovator Founder) · بازبینی مدارک و شواهد · برنامه‌ریزی و نقشه‌ی راه پرونده · منتورینگ تخصصی هم‌رشته و هم‌مسیر · پکیج‌های پشتیبانی تا همراهی کامل.
${COMPANY_NAME} نمی‌فروشد: دوره‌ی آموزشی، ویزای کاری با اسپانسر، «هر ویزایی، هر طور شده». هرگز به خدمتی خارج از فهرست بالا دعوت نکن.

محورهای محتوایی بلاگ (پیکربندی تیم محتوا): ۱. مسیرهای استعداد و کارآفرینی: شرایط، نهادهای اندورس‌کننده، شواهد، سه معیار Innovator Founder و تغییرات مسیرها · ۲. پروفایل و جایگاه حرفه‌ای: چه چیزی یک پروفایل بین‌المللی را قوی می‌کند، دستاوردها، رهبری و تاثیر · ۳. مسیرها و فرصت‌های واقعی: تحلیل مسیر و تصمیم‌های مهم قبل و بعد از مهاجرت حرفه‌ای. محتوای مرحله‌ی ناآگاهی نباید بفروشد — فقط امکان را نشان دهد.

${TAGLINES_FA}`;

/**
 * زمینه‌ی جایگاه‌یابی برای کانال‌های انگلیسی.
 *
 * ⚠️ عمداً انگلیسی و جدا از نسخه‌ی فارسی است: v3.7 می‌گوید «ساختار ترجمه
 * می‌شود، جمله‌ها از نو نوشته می‌شوند» — و دادنِ متن فارسی به نویسنده‌ی
 * انگلیسی همان ترجمه‌زدگی را دعوت می‌کند. محتوا همان است، زبان نه.
 */
export const POSITIONING_EN = `${COMPANY_NAME_EN} — Fuwment Ltd, founded 2021, Manchester. Source: Fuwment Brand Guide v3.7. English is the brand's reference language: structure carries across languages, sentences are rewritten from scratch — never translated word for word.

⚠️ Internal context, not copy. Understand it, then say it in the reader's own words; never quote it.

Position (reference one-liner, not for verbatim reuse in every post): ${ONE_LINER_EN}

The hero is the reader; ${COMPANY_NAME_EN} is only the guide. The reader is an experienced professional or a founder who wants to find the UK route that genuinely fits them and pursue it with evidence and a plan they can defend. They come from ambition, not desperation — never use escape, rescue or fear language. They are not looking for "any visa, any way", shortcuts or guarantees.

Two routes — never blur them:
- Global Talent — proven capability (individual achievement and impact).
- Innovator Founder — an innovative business, assessed on three official criteria: innovative · viable · scalable.
Brand-level content stays neutral between them.

The problem: there is a gap between someone's real professional or business record and knowing whether it matches a route's criteria and how it must be evidenced — fit, evidence, presentation, in that order. The criteria are published, not hidden; the hard part is matching real experience to them. Never say the criteria are invisible or that it's "just a matter of presentation": sometimes it is presentation, sometimes the route is wrong — and we say which, early.

The guide earns trust with empathy and authority only: "The hardest part isn't the visa requirements — it's not knowing." Lived experience ("we've been through this route ourselves") only ever follows the empathy line, never leads. At brand level, at most two proofs: your mentor has direct experience of the same route · 200+ people have gone the full route with us (with a reference date). Mentor first, tools second — the assessment is a fast first step; the decision and plan come from a mentor in your field.

How it works: assessment → choosing the route → evidence plan and preparation → endorsement (only where required — not everyone needs it) → visa (the regulated stage, handled by a registered adviser) → settling in.
Promises: if you're not ready, we tell you in the first session · we guarantee no outcome and hide nothing · our fees are clear upfront and never change without your agreement (government, endorser and third-party fees are separate) · your mentor is from your field and has done the same route · your data is processed only as needed.

Audience groups (content segments, not visa routes):
${AUDIENCE_GROUPS.map((g) => `- ${g}: ${AUDIENCE_BRIEFING_EN[g]}`).join("\n")}

Offers: initial assessment · route assessment (brand-level entry point) · Global Talent readiness check · founder business assessment · evidence review · case planning · specialist mentoring. Fuwment does not sell courses, sponsored work visas, or "any visa, any way".
Taglines are never translated literally; do not invent new slogans and attribute them to the brand.`;
