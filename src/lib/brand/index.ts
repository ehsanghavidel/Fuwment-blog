/**
 * لایه‌ی برند — تنها منبع اجرایی راهنمای برند v3.7.
 *
 * سند مرجع: docs/brand/Fuwment_Brand_Guide_v3.7.pdf
 * نسخه‌ی ماشین‌خوان رسمی: docs/brand/Fuwment_Brand_Guide_v3.7.md
 *
 * ساختار:
 * - core          نام، نسخه، مسیرها
 * - positioning   BrandScript، جایگاه‌یابی، تگ‌لاین‌ها (فارسی و انگلیسی جدا)
 * - audiences     پنج گروه مخاطب
 * - journey       هفت مرحله‌ی سفر
 * - voice         صدای مشترک (بدون قاعده‌ی کانال)
 * - claims        قواعد ادعا + فهرست‌های چک قطعی + معیارها + اعتبارها
 * - terminology   واژگان، زبان داخلی ↔ زبان مخاطب، لاتین در اینستاگرام
 * - ctas          CTAهای برند + CTAی اینستاگرام بر اساس هدف پست
 * - channels      قواعد صریح هر کانال و ترکیب‌شان (brandContext)
 * - blog          فقط بلاگ: فارسی ساده، وضعیت شواهد، اعتبار منبع
 * - instagram     فقط کاروسل و استوری فارسی: سطح زبان (محاوره‌ی نرم) و دقت ادعا درباره‌ی مدرک
 * - visual        پالت، گرادیان، فونت، کنتراست
 *
 * `@/lib/company` همچنان صادر می‌کند (COMPANY_PROFILE، BRAND_VOICE،
 * BRAND_CTAS، …) ولی حالا فقط از همین لایه بازصادر می‌کند.
 */
export * from "./core";
export * from "./audiences";
export * from "./journey";
export * from "./positioning";
export * from "./voice";
export * from "./claims";
export * from "./terminology";
export * from "./ctas";
export * from "./channels";
export * from "./blog";
export * from "./instagram";
export * from "./visual";
