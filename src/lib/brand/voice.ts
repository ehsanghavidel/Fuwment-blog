import { COMPANY_NAME } from "./core";

/**
 * صدای برند — بخش ۰۴ راهنمای v3.7.
 *
 * «صدا هرگز عوض نمی‌شود. لحن بسته به کانال و موقعیت تغییر می‌کند.» پس
 * این فایل فقط **صدا**ی مشترک را دارد. ضمیر خطاب، سطح زبان، لاتین و
 * قالب، قاعده‌ی **کانال**‌اند و در `channels.ts` می‌آیند — اگر این‌جا
 * بنشینند، اینستاگرام «شما» می‌گیرد یا بلاگ «تو» (همان نشتی که v3.5 داشت:
 * یک «شما»ی سراسری که اینستاگرام را هم می‌گرفت).
 */

/** صدای مشترک — فارسی. بدون ضمیر خطاب و بدون قاعده‌ی خط. */
export const VOICE_FA = `صدای برند — ثابت در همه‌ی کانال‌ها:
شخصیت: منتورِ باتجربه — گرم، اما دقیق. «مثل دوستی که این راه را رفته و حالا دقیق راهنمایی‌ات می‌کند.»
صمیمیتِ بدون اقتدار، برندی را که پای تصمیمی چند هزار پوندی ایستاده تضعیف می‌کند؛ اقتدارِ بدون گرما، مخاطبی را که ترسیده فراری می‌دهد.

سه ویژگی صدا:
۱. صمیمی و انسانی — با آدم حرف می‌زنیم، نه با «متقاضی محترم». جمله‌ها کوتاه، بدون زبان اداری.
۲. شفاف و بی‌اغراق — عدد و واقعیت جای صفت تبلیغاتی. هیچ‌وقت بیشتر از آنچه هست وعده نمی‌دهیم.
۳. توانمندساز — مخاطب را بالا می‌بریم، نه اینکه ترسش را بفروشیم؛ تمرکز روی توانایی اوست.

قانون طلایی: قهرمان از موضع جاه‌طلبی می‌آید، نه ضعف. ادبیات «فرار»، «نجات» و «بدبختی» ممنوع؛ ادبیات ما ادبیات رشد است: دیده‌شدن، سقف بالاتر، میدان بزرگ‌تر.

وضوح از زرنگی مهم‌تر است. مخاطب باید پیش از هر اسکرول بفهمد: چه ارائه می‌دهیم، زندگی‌اش چطور بهتر می‌شود، قدم بعدی چیست.

ساده‌نویسی — برای همه‌ی کانال‌ها. حرفه‌ای بودن یعنی واضح، دقیق و مطمئن؛ نه رسمی، آکادمیک یا پیچیده:
- فعل به‌جای اسم مصدر: «بررسی می‌کنیم»، نه «انجام بررسی».
- بدون زنجیره‌ی اضافه («ارزیابی شواهد حرفه‌ای متقاضی» ✗).
- اصطلاح لازم را همان‌جا ساده توضیح بده.
- لحن‌های ممنوع — اداری و شرکتی: «ارائه خدمات»، «راهکارهای جامع»، «بهره‌گیری از»، «بدین‌وسیله»، «مستحضر باشید» · آکادمیک: «در راستای»، «مبتنی بر»، «به منظور» · مشاوره‌ای: «فرآیند بهینه»، «تحلیل جامع پروفایل».
- آزمون نهایی: اگر یک دوست باتجربه همین جمله را حضوری بگوید، طبیعی است؟ اگر نه، دوباره بنویس.

بایدها: با مشکل مخاطب شروع کن، نه با معرفی ${COMPANY_NAME} · سطح درونی مشکل را هم بنویس، نه فقط بیرونی · هر ادعا با عدد، نمونه یا شاهد · هر پاراگراف حداکثر سه خط · واژه‌ی تخصصی را بار اول توضیح بده · حداکثر یک قدم بعدی روشن، هماهنگ با هدف محتوا · محدودیت‌ها را هم بگو، نه فقط مزیت‌ها.
نبایدها: شروع با «ما در ${COMPANY_NAME}…» (برند قهرمان می‌شود) · تضمین نتیجه یا وعده‌ی زمانی قطعی · ادبیات ترس و ادبیات فرار و نجات · مقایسه‌ی مستقیم یا نام‌بردن از رقبا · واژه‌های اداری · چند دعوت رقیب در یک محتوا.
وقتی می‌پرسند «چقدر طول می‌کشد؟»: بازه‌ی واقع‌بینانه، نه عدد تبلیغاتی.`;

/** صدای مشترک — انگلیسی. همان صدا، از نو نوشته؛ هیچ قاعده‌ی نگارش فارسی اینجا نیست. */
export const VOICE_EN = `Brand voice — the same in every channel:
Personality: an experienced mentor — warm, but precise. "Like a friend who has walked this route and now guides you precisely." Warmth without authority undermines a brand standing behind a multi-thousand-pound decision; authority without warmth drives a worried reader away.
Three traits: (1) human — talk to a person, never "Dear applicant"; short sentences, no bureaucratic language. (2) transparent, never exaggerated — facts and numbers instead of promotional adjectives; never promise more than is true. (3) empowering — lift the reader up, never sell their fear.
Golden rule: the hero comes from ambition, not weakness. No escape, rescue or misery language — this is the language of growth.
Plain English: professional means clear, precise and confident — not formal, academic or complex. Verbs, not nominalisations ("we review", not "the conduct of a review"). Explain any necessary term on first use. No consultancy-speak ("holistic", "end-to-end solutions", "leverage", "synergy", "optimised process").
Do: start with the reader's problem, not with us · include the inner problem, not just the outer one · back every claim with a number, example or evidence · state limitations, not only benefits · at most one clear next step.
Don't: start with "At Fuwment, we…" · guarantee outcomes or timelines · fear, escape or rescue language · compare with or name competitors.`;
