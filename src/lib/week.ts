/**
 * محاسبه‌ی مرز هفته‌ی محتوایی.
 *
 * چرا فایل جداست: article-format.ts قالب‌بندی مقاله است. لنگر تاریخِ
 * برنامه‌ریزی باید یک جا باشد و مستقل قابل تغییر.
 *
 * ⚠️ دو تصمیم که با هزینه گرفته شدند:
 *
 * ۱. هفته شنبه شروع می‌شود، نه دوشنبه. هفته‌ی محتوایی باید هفته‌ی
 *    مخاطب باشد، و مخاطب اصلی فارسی‌زبان است.
 *
 * ۲. منطقه‌ی زمانی صریح است، نه پیش‌فرض سیستم. تهران UTC+3:30 است،
 *    پس هر شب یک بازه‌ی ۳٫۵ ساعته هست که «امروز» در UTC و تهران فرق
 *    می‌کند. اگر week_start را از new Date() سرور بگیری، اجرای
 *    شب‌هنگام در هفته‌ی اشتباه می‌افتد — و چون ستون unique است، یا
 *    رکورد تکراری می‌سازد یا هفته را جا می‌اندازد. بی‌صدا.
 *
 * همان قراردادی که article-format.ts:43 دارد: timeZone صریح و
 * formatToParts به‌جای رشته‌ی محلی‌شده، تا نتیجه به تفاوت‌های ICU بین
 * محیط‌ها (لپ‌تاپ در برابر Vercel) وابسته نباشد.
 */

export const WEEK_START_TZ = "Asia/Tehran";

const WEEKDAY_OFFSET: Record<string, number> = {
    Sat: 0,
    Sun: 1,
    Mon: 2,
    Tue: 3,
    Wed: 4,
    Thu: 5,
    Fri: 6,
};

/**
 * شنبه‌ی هفته‌ای که این لحظه در آن است، به وقت تهران.
 * خروجی: رشته‌ی YYYY-MM-DD، آماده برای ستون date.
 */
export function weekStart(at: Date = new Date(), tz: string = WEEK_START_TZ): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short",
    }).formatToParts(at);

    const get = (type: Intl.DateTimeFormatPartTypes): string => {
        const part = parts.find((p) => p.type === type);
        if (!part) throw new Error(`جزء تاریخ یافت نشد: ${type}`);
        return part.value;
    };

    const offset = WEEKDAY_OFFSET[get("weekday")];
    if (offset === undefined) throw new Error(`روز هفته‌ی ناشناخته: ${get("weekday")}`);

    // ظهر UTC می‌سازیم، نه نیمه‌شب: کم‌کردن روز هیچ‌وقت از مرز نمی‌لغزد.
    const local = new Date(
        Date.UTC(Number(get("year")), Number(get("month")) - 1, Number(get("day")), 12)
    );
    local.setUTCDate(local.getUTCDate() - offset);

    return local.toISOString().slice(0, 10);
}